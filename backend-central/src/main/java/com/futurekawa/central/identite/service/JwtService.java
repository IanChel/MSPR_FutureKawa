package com.futurekawa.central.identite.service;

import com.futurekawa.central.identite.entity.Role;
import com.futurekawa.central.identite.entity.Utilisateur;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.Duration;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    private final SecretKey cle;
    private final long accesMinutes;

    public JwtService(@Value("${app.securite.jwt-secret}") String secret,
                      @Value("${app.securite.acces-token-minutes:15}") long accesMinutes) {
        this.cle = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accesMinutes = accesMinutes;
    }

    public String genererAccessToken(Utilisateur u) {
        Instant maintenant = Instant.now();
        List<String> roles = u.getRoles().stream().map(Role::getCode).toList();
        return Jwts.builder()
                .subject(u.getId().toString())
                .claim("email", u.getEmail())
                .claim("roles", roles)
                .claim("pays", u.getPays() == null ? "*" : u.getPays())  // * = tous pays
                .issuedAt(Date.from(maintenant))
                .expiration(Date.from(maintenant.plus(Duration.ofMinutes(accesMinutes))))                .signWith(cle)
                .compact();
    }

    // --- Refresh token (chaîne aléatoire opaque) ---

    public String genererRefreshBrut() {
        byte[] bytes = new byte[48];
        new java.security.SecureRandom().nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Hash SHA-256 du refresh (on ne stocke jamais la valeur en clair). */
    public String hacher(String valeur) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(valeur.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(h);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}