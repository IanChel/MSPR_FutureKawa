package com.futurekawa.pays.mesure.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.futurekawa.pays.mesure.dto.MesurePayload;
import com.futurekawa.pays.mesure.entity.Mesure;
import com.futurekawa.pays.mesure.repository.MesureRepository;
import com.futurekawa.pays.referentiel.entity.Capteur;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import com.futurekawa.pays.referentiel.repository.CapteurRepository;
import com.futurekawa.pays.referentiel.repository.EntrepotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.mqtt.support.MqttHeaders;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;
import com.futurekawa.pays.alerte.service.AlerteService;
import java.time.Instant;

@Service
public class MesureIngestionService {

    private static final Logger log = LoggerFactory.getLogger(MesureIngestionService.class);

    private final MesureRepository mesureRepository;
    private final CapteurRepository capteurRepository;
    private final EntrepotRepository entrepotRepository;
    private final ObjectMapper objectMapper;

    private final AlerteService alerteService;

    public MesureIngestionService(MesureRepository mesureRepository,
                                  CapteurRepository capteurRepository,
                                  EntrepotRepository entrepotRepository,
                                  ObjectMapper objectMapper,
                                  AlerteService alerteService) {
        this.mesureRepository = mesureRepository;
        this.capteurRepository = capteurRepository;
        this.entrepotRepository = entrepotRepository;
        this.objectMapper = objectMapper;
        this.alerteService = alerteService;
    }

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void traiterMessage(Message<?> message) {
        String json = message.getPayload().toString();
        // Le topic d'arrivée (ex. "futurekawa/bresil/1/mesures") est porté par un en-tête MQTT.
        // Il nous sert à retrouver l'entrepôt quand le message n'a pas de capteurId
        // (cas du vrai capteur ESP8266, qui publie seulement {temperature, humidite}).
        Object topic = message.getHeaders().get(MqttHeaders.RECEIVED_TOPIC);
        try {
            MesurePayload payload = objectMapper.readValue(json, MesurePayload.class);
            enregistrer(payload, topic != null ? topic.toString() : null);
        } catch (Exception e) {
            log.warn("Message MQTT ignoré (illisible) : {}", json, e);
        }
    }

    public void enregistrer(MesurePayload payload, String topic) {
        // Validation minimale : seules la température et l'humidité sont indispensables.
        // capteurId et timestamp sont désormais OPTIONNELS.
        if (payload.temperature() == null || payload.humidite() == null) {
            log.warn("Mesure incomplète ignorée (temp/hum manquante) : {}", payload);
            return;
        }

        // Résolution de l'entrepôt + capteur selon ce que le message fournit :
        //  - capteurId présent (cas du simulateur) -> on retrouve le capteur, et son entrepôt.
        //  - capteurId absent (cas du vrai capteur) -> on déduit l'entrepôt du topic, capteur = null.
        Entrepot entrepot;
        Capteur capteur = null;

        if (payload.capteurId() != null) {
            capteur = capteurRepository.findByIdentifiantMqtt(payload.capteurId())
                    .orElse(null);
            if (capteur == null) {
                log.warn("Capteur inconnu '{}', mesure ignorée", payload.capteurId());
                return;
            }
            entrepot = capteur.getEntrepot();
        } else {
            entrepot = resoudreEntrepotDepuisTopic(topic);
            if (entrepot == null) {
                log.warn("Mesure sans capteurId et entrepôt introuvable depuis le topic '{}', ignorée", topic);
                return;
            }
        }

        Mesure mesure = new Mesure();
        mesure.setEntrepot(entrepot);
        mesure.setCapteur(capteur);                 // peut rester null (colonne capteur_id nullable)
        mesure.setTemperature(payload.temperature());
        mesure.setHumidite(payload.humidite());
        // timestamp absent -> horodatage serveur à la réception
        mesure.setMesureAt(payload.timestamp() != null ? payload.timestamp() : Instant.now());

        mesureRepository.save(mesure);
        log.info("Mesure enregistrée: entrepot={} capteur={} temp={} hum={}",
                entrepot.getId(),
                capteur != null ? capteur.getIdentifiantMqtt() : "(sans capteurId)",
                payload.temperature(), payload.humidite());
        // L'évaluation d'alerte ne dépend QUE de l'entrepôt + temp/hum (pas du capteur).
        alerteService.evaluerMesure(mesure);
    }

    /**
     * Déduit l'identifiant d'entrepôt depuis le topic, selon la convention
     * futurekawa/<pays>/<entrepotId>/mesures : on prend le segment juste avant "mesures".
     * Renvoie l'entrepôt s'il existe en base, sinon null.
     */
    private Entrepot resoudreEntrepotDepuisTopic(String topic) {
        if (topic == null) {
            return null;
        }
        String[] segments = topic.split("/");
        if (segments.length < 2) {
            return null;
        }
        String segmentEntrepot = segments[segments.length - 2]; // avant-dernier = entrepotId
        try {
            Long entrepotId = Long.parseLong(segmentEntrepot);
            return entrepotRepository.findById(entrepotId).orElse(null);
        } catch (NumberFormatException e) {
            log.warn("Segment entrepôt non numérique dans le topic '{}'", topic);
            return null;
        }
    }
}