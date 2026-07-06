package com.futurekawa.central.identite.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "utilisateur")
public class Utilisateur {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String email;

    @Column(name = "mot_de_passe_hash")
    private String motDePasseHash;

    private String nom;
    private String prenom;
    private String pays;                 // NULL = super admin (tous pays)
    private boolean actif;

    @Column(name = "date_creation")
    private Instant dateCreation;

    @Column(name = "derniere_connexion")
    private Instant derniereConnexion;

    @Column(name = "tentatives_echouees")
    private int tentativesEchouees;

    @Column(name = "verrouille_jusqu_a")
    private Instant verrouilleJusquA;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "utilisateur_role",
            joinColumns = @JoinColumn(name = "utilisateur_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getMotDePasseHash() { return motDePasseHash; }
    public String getNom() { return nom; }
    public String getPrenom() { return prenom; }
    public String getPays() { return pays; }
    public boolean isActif() { return actif; }
    public Instant getDerniereConnexion() { return derniereConnexion; }
    public void setDerniereConnexion(Instant d) { this.derniereConnexion = d; }
    public int getTentativesEchouees() { return tentativesEchouees; }
    public void setTentativesEchouees(int t) { this.tentativesEchouees = t; }
    public Instant getVerrouilleJusquA() { return verrouilleJusquA; }
    public void setVerrouilleJusquA(Instant v) { this.verrouilleJusquA = v; }
    public Set<Role> getRoles() { return roles; }

    public void appliquerCreation(String email, String motDePasseHash, String nom,
                                  String prenom, String pays, Role role) {
        this.email = email;
        this.motDePasseHash = motDePasseHash;
        this.nom = nom;
        this.prenom = prenom;
        this.pays = pays;
        this.actif = true;
        this.dateCreation = java.time.Instant.now();
        this.tentativesEchouees = 0;
        this.roles.add(role);
    }

    public void setActif(boolean actif) { this.actif = actif; }

    public void remplacerRole(Role role) {
        this.roles.clear();
        this.roles.add(role);
    }
}