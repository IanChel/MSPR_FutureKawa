package com.futurekawa.pays.lot.entity;

import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import com.futurekawa.pays.referentiel.entity.Exploitation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "lot")
@Getter @Setter @NoArgsConstructor
public class Lot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true) private String reference;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exploitation_id", nullable = false)
    private Exploitation exploitation;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entrepot_id", nullable = false)
    private Entrepot entrepot;
    @Column(name = "date_stockage", nullable = false) private Instant dateStockage;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private StatutLot statut;
    @Column(name = "caracteristiques_qualite") private String caracteristiquesQualite;
}