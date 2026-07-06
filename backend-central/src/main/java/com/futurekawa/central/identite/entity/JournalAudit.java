package com.futurekawa.central.identite.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "journal_audit")
public class JournalAudit {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "utilisateur_id")
    private Long utilisateurId;          // l'auteur de l'action

    private String action;               // ex. USER_CREATE, USER_DESACTIVER
    private String ressource;            // ex. utilisateur #6
    @Column(name = "pays_cible")
    private String paysCible;
    private Instant horodatage;
    private String ip;
    private String resultat;             // OK / REFUSE

    public JournalAudit() {}

    public JournalAudit(Long utilisateurId, String action, String ressource,
                        String paysCible, String resultat) {
        this.utilisateurId = utilisateurId;
        this.action = action;
        this.ressource = ressource;
        this.paysCible = paysCible;
        this.resultat = resultat;
        this.horodatage = Instant.now();
    }

    public Long getId() { return id; }
    public Long getUtilisateurId() { return utilisateurId; }
    public String getAction() { return action; }
    public String getRessource() { return ressource; }
    public String getPaysCible() { return paysCible; }
    public Instant getHorodatage() { return horodatage; }
    public String getResultat() { return resultat; }
}