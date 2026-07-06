package com.futurekawa.pays.referentiel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "entrepot")
@Getter @Setter @NoArgsConstructor
public class Entrepot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String nom;
    private String localisation;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exploitation_id", nullable = false)
    private Exploitation exploitation;
}