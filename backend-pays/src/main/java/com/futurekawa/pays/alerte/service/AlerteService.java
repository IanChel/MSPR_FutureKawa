package com.futurekawa.pays.alerte.service;

import com.futurekawa.pays.alerte.entity.Alerte;
import com.futurekawa.pays.alerte.repository.AlerteRepository;
import com.futurekawa.pays.alerte.StatutAlerte;
import com.futurekawa.pays.alerte.TypeAlerte;
import com.futurekawa.pays.lot.entity.Lot;
import com.futurekawa.pays.lot.repository.LotRepository;
import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.mesure.entity.Mesure;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.futurekawa.pays.notification.service.NotificationService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.time.Duration;


import com.futurekawa.pays.alerte.dto.AlerteDto;


import org.springframework.scheduling.annotation.Scheduled;
@Service
public class AlerteService {

    private static final Logger log = LoggerFactory.getLogger(AlerteService.class);

    private final AlerteRepository alerteRepository;
    private final LotRepository lotRepository;
    private final SeuilConfig seuils;

    private final NotificationService notificationService;
    private final HysteresisTracker hysteresis;
    private final int seuilOuverture;
    private final int seuilResolution;

    private final int rappelIntervalleMinutes;
    public AlerteService(AlerteRepository alerteRepository,
                         LotRepository lotRepository,
                         SeuilConfig seuils,
                         NotificationService notificationService,
                         HysteresisTracker hysteresis,
                         @org.springframework.beans.factory.annotation.Value("${app.alerte.mesures-consecutives-ouverture:3}") int seuilOuverture,
                         @org.springframework.beans.factory.annotation.Value("${app.alerte.mesures-consecutives-resolution:3}") int seuilResolution,
                         @org.springframework.beans.factory.annotation.Value("${app.alerte.rappel-intervalle-minutes:30}") int rappelIntervalleMinutes) {
        this.alerteRepository = alerteRepository;
        this.lotRepository = lotRepository;
        this.seuils = seuils;
        this.notificationService = notificationService;
        this.hysteresis = hysteresis;
        this.seuilOuverture = seuilOuverture;
        this.seuilResolution = seuilResolution;
        this.rappelIntervalleMinutes = rappelIntervalleMinutes;
    }

    /** Appelée à chaque mesure ingérée. Lève une alerte si hors bande. */
    @Transactional
    public void evaluerMesure(Mesure mesure) {
        Long entrepotId = mesure.getEntrepot().getId();
        boolean dansLaBande = seuils.estDansLaBande(mesure.getTemperature(), mesure.getHumidite());

        Optional<Alerte> incidentOuvert = alerteRepository
                .findFirstByTypeAndEntrepotIdAndStatutInOrderByDeclencheeAtDesc(
                        TypeAlerte.CONDITION, entrepotId,
                        List.of(StatutAlerte.ACTIVE, StatutAlerte.ACQUITTEE));

        if (!dansLaBande) {
            int consecutives = hysteresis.horsPlage(entrepotId);

            if (incidentOuvert.isPresent()) {
                // anomalie déjà connue : on met à jour l'incident (dernière obs + pire valeur)
                majIncident(incidentOuvert.get(), mesure);
            } else if (consecutives >= seuilOuverture) {
                // nouvelle anomalie confirmée par l'hystérésis : on ouvre un incident
                ouvrirIncident(mesure);
            }
            // sinon : pas encore assez de mesures consécutives, on attend (anti-flapping)

        } else {
            int consecutives = hysteresis.dansLaPlage(entrepotId);

            if (incidentOuvert.isPresent() && consecutives >= seuilResolution) {
                // retour à la normale confirmé : on résout
                resoudreAuto(incidentOuvert.get());
            }
        }
    }

    private void ouvrirIncident(Mesure mesure) {
        Alerte alerte = new Alerte();
        alerte.setType(TypeAlerte.CONDITION);
        alerte.setStatut(StatutAlerte.ACTIVE);
        alerte.setEntrepot(mesure.getEntrepot());
        alerte.setValeurTemperature(mesure.getTemperature());
        alerte.setValeurHumidite(mesure.getHumidite());
        alerte.setValeurExtremeTemp(mesure.getTemperature());
        alerte.setValeurExtremeHum(mesure.getHumidite());
        alerte.setDeclencheeAt(Instant.now());
        alerte.setDerniereObservationAt(Instant.now());
        alerte.setMessage(String.format(
                "Conditions hors plage dans l'entrepot %d : %.1f°C / %.1f%% (attendu %.0f-%.0f°C / %.0f-%.0f%%)",
                mesure.getEntrepot().getId(), mesure.getTemperature(), mesure.getHumidite(),
                seuils.tempMin(), seuils.tempMax(), seuils.humMin(), seuils.humMax()));
        alerte.setEmailEnvoye(true);
        alerte.setDerniereNotificationAt(Instant.now());
        alerte.setNbNotifications(1);
        alerteRepository.save(alerte);

        for (Lot lot : lotRepository.findByEntrepotIdOrderByDateStockageAsc(mesure.getEntrepot().getId())) {
            if (lot.getStatut() == StatutLot.CONFORME) lot.setStatut(StatutLot.EN_ALERTE);
        }
        log.warn("ALERTE CONDITION ouverte : {}", alerte.getMessage());
        notificationService.envoyerAlerteEmail(alerte);
    }

    private void majIncident(Alerte alerte, Mesure mesure) {
        alerte.setDerniereObservationAt(Instant.now());
        // mémoriser la pire valeur observée (la plus éloignée de l'idéal)
        if (alerte.getValeurExtremeTemp() == null
                || Math.abs(mesure.getTemperature() - seuils.getTemperatureIdeale())
                > Math.abs(alerte.getValeurExtremeTemp() - seuils.getTemperatureIdeale())) {
            alerte.setValeurExtremeTemp(mesure.getTemperature());
        }
        if (alerte.getValeurExtremeHum() == null
                || Math.abs(mesure.getHumidite() - seuils.getHumiditeIdeale())
                > Math.abs(alerte.getValeurExtremeHum() - seuils.getHumiditeIdeale())) {
            alerte.setValeurExtremeHum(mesure.getHumidite());
        }
        // pas d'email ici : la re-notification sera gérée par le planificateur (étape 3)
    }

    private void resoudreAuto(Alerte alerte) {
        alerte.setStatut(StatutAlerte.RESOLUE);
        alerte.setResolueAt(Instant.now());
        alerte.setModeResolution("AUTO");
        long minutes = java.time.Duration.between(alerte.getDeclencheeAt(), Instant.now()).toMinutes();

        // lots de l'entrepôt : retour à CONFORME (sauf périmés)
        for (Lot lot : lotRepository.findByEntrepotIdOrderByDateStockageAsc(alerte.getEntrepot().getId())) {
            if (lot.getStatut() == StatutLot.EN_ALERTE) lot.setStatut(StatutLot.CONFORME);
        }
        log.info("ALERTE CONDITION résolue (entrepot {}, durée ~{} min)",
                alerte.getEntrepot().getId(), minutes);
        notificationService.envoyerResolutionEmail(alerte, minutes);
    }

    /** S'exécute au démarrage puis toutes les heures. Repère les lots > 365 jours. */
    @Scheduled(initialDelay = 5000, fixedRate = 3600000) // 5 s après démarrage, puis chaque heure
    @Transactional
    public void evaluerPeremptions() {
        Instant seuil365 = Instant.now().minusSeconds(365L * 24 * 60 * 60);
        List<Lot> lotsAnciens = lotRepository
                .findByDateStockageBeforeAndStatutNot(seuil365, StatutLot.PERIME);

        for (Lot lot : lotsAnciens) {
            // garde anti-doublon : ne pas recréer si une alerte PEREMPTION est déjà ACTIVE pour ce lot
            boolean dejaActive = alerteRepository
                    .existsByTypeAndStatutAndLotId(
                            TypeAlerte.PEREMPTION, StatutAlerte.ACTIVE, lot.getId());
            if (dejaActive) {
                continue;
            }

            lot.setStatut(StatutLot.PERIME);

            Alerte alerte = new Alerte();
            alerte.setType(TypeAlerte.PEREMPTION);
            alerte.setStatut(StatutAlerte.ACTIVE);
            alerte.setEntrepot(lot.getEntrepot());
            alerte.setLot(lot);
            alerte.setDeclencheeAt(Instant.now());
            long jours = (Instant.now().getEpochSecond() - lot.getDateStockage().getEpochSecond())
                    / (24 * 60 * 60);            alerte.setMessage(String.format(
                    "Lot %s périmé : %d jours de stockage (> 365)",
                    lot.getReference(), jours));
            alerte.setEmailEnvoye(true);
            alerteRepository.save(alerte);
            notificationService.envoyerAlerteEmail(alerte);

            log.warn("ALERTE PEREMPTION levée : {}", alerte.getMessage());
        }

    }

    @Transactional(readOnly = true)
    public List<AlerteDto> listerAlertes(StatutAlerte statut, TypeAlerte type) {
        return alerteRepository.rechercher(statut, type).stream()
                .map(this::toDto).toList();
    }

    private AlerteDto toDto(Alerte a) {
        return new AlerteDto(
                a.getId(),
                a.getType().name(),
                a.getStatut().name(),
                a.getEntrepot() != null ? a.getEntrepot().getId() : null,
                a.getLot() != null ? a.getLot().getId() : null,
                a.getLot() != null ? a.getLot().getReference() : null,
                a.getMessage(),
                a.getValeurTemperature(),
                a.getValeurHumidite(),
                a.getDeclencheeAt(),
                a.isEmailEnvoye(),
                a.getNbNotifications(),
                a.getAcquitteeAt(),
                a.getResolueAt(),
                a.getModeResolution()
        );
    }

    @Transactional
    public AlerteDto resoudre(Long id) {
        Alerte alerte = alerteRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Alerte introuvable"));

        if (alerte.getStatut() == StatutAlerte.RESOLUE) {
            return toDto(alerte); // déjà résolue, rien à faire
        }
        alerte.setStatut(StatutAlerte.RESOLUE);
        alerte.setResolueAt(java.time.Instant.now());
        return toDto(alerte); // sauvegarde automatique en fin de transaction (entité suivie)
    }

    /** Toutes les minutes : renvoie un rappel pour chaque incident ACTIVE assez ancien. */
    @Scheduled(initialDelay = 10000, fixedRate = 15000) // 10 s puis toutes les 15 s
    @Transactional
    public void envoyerRappels() {
        Instant limite = Instant.now().minus(Duration.ofMinutes(rappelIntervalleMinutes));
        List<Alerte> actives = alerteRepository.findByTypeAndStatut(
                TypeAlerte.CONDITION, StatutAlerte.ACTIVE);

        for (Alerte alerte : actives) {
            Instant derniere = alerte.getDerniereNotificationAt();
            if (derniere == null || derniere.isBefore(limite)) {
                alerte.setNbNotifications(alerte.getNbNotifications() + 1);
                alerte.setDerniereNotificationAt(Instant.now());
                long minutes = Duration.between(
                                alerte.getDeclencheeAt(),
                                Instant.now())
                        .toMinutes();
                notificationService.envoyerRappelEmail(alerte, minutes, alerte.getNbNotifications());
                log.warn("RAPPEL alerte CONDITION entrepot {} (rappel n°{})",
                        alerte.getEntrepot().getId(), alerte.getNbNotifications());
            }
        }
    }

    @Transactional
    public AlerteDto acquitter(Long id) {
        Alerte alerte = alerteRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Alerte introuvable"));

        if (alerte.getStatut() != StatutAlerte.ACTIVE) {
            // on n'acquitte qu'un incident ACTIVE (pas un déjà résolu ou déjà acquitté)
            return toDto(alerte);
        }
        alerte.setStatut(StatutAlerte.ACQUITTEE);
        alerte.setAcquitteeAt(Instant.now());
        log.info("Alerte {} acquittée (entrepot {})", id, alerte.getEntrepot().getId());
        return toDto(alerte);
    }
}