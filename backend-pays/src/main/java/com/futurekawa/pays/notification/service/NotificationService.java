package com.futurekawa.pays.notification.service;

import com.futurekawa.pays.alerte.entity.Alerte;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final JavaMailSender mailSender;
    private final String destinataire;
    private final String pays;

    public NotificationService(JavaMailSender mailSender,
                               @Value("${app.alerting.email-destinataire}") String destinataire,
                               @Value("${app.pays}") String pays) {
        this.mailSender = mailSender;
        this.destinataire = destinataire;
        this.pays = pays;
    }

    /** Envoi asynchrone : ne bloque pas l'ingestion des mesures. */
    @Async
    public void envoyerAlerteEmail(Alerte alerte) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom("alerting@futurekawa.example");
            mail.setTo(destinataire);
            mail.setSubject("[FutureKawa " + pays + "] Alerte " + alerte.getType());
            mail.setText(
                    "Bonjour,\n\n" +
                            "Une alerte de type " + alerte.getType() + " a été déclenchée.\n\n" +
                            alerte.getMessage() + "\n\n" +
                            "Déclenchée le : " + alerte.getDeclencheeAt() + "\n\n" +
                            "Merci de prendre les mesures nécessaires.\n" +
                            "-- Système de supervision FutureKawa");
            mailSender.send(mail);
            log.info("Email d'alerte envoyé à {}", destinataire);
        } catch (Exception e) {
            // L'email peut échouer sans bloquer le métier : l'alerte reste en base.
            log.error("Échec d'envoi de l'email d'alerte", e);
        }
    }

    @Async
    public void envoyerResolutionEmail(Alerte alerte, long dureeMinutes) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom("alerting@futurekawa.example");
            mail.setTo(destinataire);
            mail.setSubject("[FutureKawa " + pays + "] Résolution - Alerte " + alerte.getType());
            mail.setText(
                    "Bonjour,\n\n" +
                            "L'incident suivant est résolu (retour à la normale) :\n\n" +
                            alerte.getMessage() + "\n\n" +
                            "Durée de l'incident : ~" + dureeMinutes + " min\n" +
                            "Résolu le : " + alerte.getResolueAt() + "\n\n" +
                            "-- Système de supervision FutureKawa");
            mailSender.send(mail);
            log.info("Email de résolution envoyé à {}", destinataire);
        } catch (Exception e) {
            log.error("Échec d'envoi de l'email de résolution", e);
        }
    }

    @Async
    public void envoyerRappelEmail(Alerte alerte, long dureeMinutes, int numeroRappel) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom("alerting@futurekawa.example");
            mail.setTo(destinataire);
            mail.setSubject("[FutureKawa " + pays + "] RAPPEL #" + numeroRappel
                    + " - Alerte " + alerte.getType() + " toujours active");
            mail.setText(
                    "Bonjour,\n\n" +
                            "L'incident suivant est TOUJOURS EN COURS depuis ~" + dureeMinutes + " min :\n\n" +
                            alerte.getMessage() + "\n\n" +
                            "Ceci est le rappel n°" + numeroRappel + ". Merci de traiter cet incident.\n" +
                            "-- Système de supervision FutureKawa");
            mailSender.send(mail);
            log.info("Email de rappel n°{} envoyé à {}", numeroRappel, destinataire);
        } catch (Exception e) {
            log.error("Échec d'envoi de l'email de rappel", e);
        }
    }
}