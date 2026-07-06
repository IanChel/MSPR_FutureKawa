package com.futurekawa.central.identite.service;

import com.futurekawa.central.identite.entity.RefreshToken;
import com.futurekawa.central.identite.entity.Utilisateur;
import com.futurekawa.central.identite.repository.RefreshTokenRepository;
import com.futurekawa.central.identite.repository.UtilisateurRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.Duration;
@Service
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final long refreshJours;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UtilisateurRepository utilisateurRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       JwtService jwtService,
                       @Value("${app.securite.refresh-token-jours:7}") long refreshJours) {
        this.utilisateurRepository = utilisateurRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.refreshJours = refreshJours;
    }

    /** Renvoie [accessToken, refreshToken]. */
    @Transactional
    public String[] login(String email, String motDePasse) {
        Utilisateur u = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants invalides"));
        if (!u.isActif()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte désactivé");
        }
        if (!encoder.matches(motDePasse, u.getMotDePasseHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identifiants invalides");
        }
        u.setDerniereConnexion(Instant.now());
        return new String[]{ jwtService.genererAccessToken(u), creerRefresh(u) };
    }

    /** Échange un refresh valide contre un nouvel access token (rotation du refresh). */
    @Transactional
    public String[] refresh(String refreshBrut) {
        String hash = jwtService.hacher(refreshBrut);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalide"));

        if (rt.isRevoque() || rt.getExpireAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expiré ou révoqué");
        }
        Utilisateur u = utilisateurRepository.findById(rt.getUtilisateurId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable"));
        if (!u.isActif()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Compte désactivé");
        }
        // rotation : l'ancien refresh est révoqué, on en émet un nouveau
        rt.setRevoque(true);
        return new String[]{ jwtService.genererAccessToken(u), creerRefresh(u) };
    }

    /** Révoque un refresh token (déconnexion). */
    @Transactional
    public void logout(String refreshBrut) {
        refreshTokenRepository.findByTokenHash(jwtService.hacher(refreshBrut))
                .ifPresent(rt -> rt.setRevoque(true));
        // si le token n'existe pas, on ne dit rien (logout idempotent)
    }

    private String creerRefresh(Utilisateur u) {
        String brut = jwtService.genererRefreshBrut();
        Instant expire = Instant.now().plus(Duration.ofDays(refreshJours));
        refreshTokenRepository.save(new RefreshToken(u.getId(), jwtService.hacher(brut), expire));
        return brut;   // on renvoie la valeur en clair UNE seule fois (jamais restockée en clair)
    }
}