package com.futurekawa.pays.alerte.entity;

import com.futurekawa.pays.alerte.StatutAlerte;
import com.futurekawa.pays.alerte.TypeAlerte;
import com.futurekawa.pays.lot.entity.Lot;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "alerte")
@Getter @Setter @NoArgsConstructor
public class Alerte {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private TypeAlerte type;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatutAlerte statut;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "entrepot_id") private Entrepot entrepot;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lot_id") private Lot lot;
    @Column(length = 500) private String message;
    @Column(name = "valeur_temperature") private Double valeurTemperature;
    @Column(name = "valeur_humidite") private Double valeurHumidite;
    @Column(name = "declenchee_at", nullable = false) private Instant declencheeAt;
    @Column(name = "email_envoye", nullable = false) private boolean emailEnvoye;
    @Column(name = "resolue_at") private Instant resolueAt;

    @Column(name = "derniere_observation_at")
    private Instant derniereObservationAt;

    @Column(name = "derniere_notification_at")
    private Instant derniereNotificationAt;

    @Column(name = "nb_notifications", nullable = false)
    private int nbNotifications;

    @Column(name = "valeur_extreme_temp")
    private Double valeurExtremeTemp;

    @Column(name = "valeur_extreme_hum")
    private Double valeurExtremeHum;

    @Column(name = "acquittee_at")
    private Instant acquitteeAt;

    @Column(name = "mode_resolution")
    private String modeResolution;
}