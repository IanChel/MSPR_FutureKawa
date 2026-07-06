package com.futurekawa.pays.referentiel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "capteur")
@Getter @Setter @NoArgsConstructor
public class Capteur {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "identifiant_mqtt", nullable = false, unique = true)
    private String identifiantMqtt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrepot_id", nullable = false)
    private Entrepot entrepot;
}