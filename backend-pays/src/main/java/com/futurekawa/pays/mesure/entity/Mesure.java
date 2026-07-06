package com.futurekawa.pays.mesure.entity;

import com.futurekawa.pays.referentiel.entity.Capteur;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "mesure")
@Getter @Setter @NoArgsConstructor
public class Mesure {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrepot_id", nullable = false)
    private Entrepot entrepot;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "capteur_id")
    private Capteur capteur;
    @Column(nullable = false) private Double temperature;
    @Column(nullable = false) private Double humidite;
    @Column(name = "mesure_at", nullable = false) private Instant mesureAt;
}