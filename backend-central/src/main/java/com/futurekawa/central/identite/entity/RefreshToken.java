package com.futurekawa.central.identite.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "refresh_token")
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    @Column(name = "token_hash")
    private String tokenHash;

    @Column(name = "expire_at")
    private Instant expireAt;

    private boolean revoque;

    @Column(name = "cree_at")
    private Instant creeAt;

    public RefreshToken() {}

    public RefreshToken(Long utilisateurId, String tokenHash, Instant expireAt) {
        this.utilisateurId = utilisateurId;
        this.tokenHash = tokenHash;
        this.expireAt = expireAt;
        this.revoque = false;
        this.creeAt = Instant.now();
    }

    public Long getId() { return id; }
    public Long getUtilisateurId() { return utilisateurId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpireAt() { return expireAt; }
    public boolean isRevoque() { return revoque; }
    public void setRevoque(boolean revoque) { this.revoque = revoque; }
}