package com.futurekawa.central.identite.controller;

import com.futurekawa.central.identite.dto.LoginRequest;
import com.futurekawa.central.identite.dto.LoginResponse;
import com.futurekawa.central.identite.service.AuthService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest req) {
        String[] jetons = authService.login(req.email(), req.motDePasse());
        return new LoginResponse(jetons[0], jetons[1], "Bearer");
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(
            @RequestBody com.futurekawa.central.identite.dto.RefreshRequest req) {
        String[] jetons = authService.refresh(req.refreshToken());
        return new LoginResponse(jetons[0], jetons[1], "Bearer");
    }

    @PostMapping("/logout")
    public java.util.Map<String, String> logout(
            @RequestBody com.futurekawa.central.identite.dto.RefreshRequest req) {
        authService.logout(req.refreshToken());
        return java.util.Map.of("message", "Déconnecté");
    }

    @GetMapping("/me")
    public java.util.Map<String, Object> me(
            org.springframework.security.core.Authentication auth) {
        // /auth/me est en permitAll : si le jeton est absent/expiré, l'utilisateur
        // est "anonymous". On renvoie alors 401 (et non 500 via un cast qui échoue)
        // pour que le front déclenche son rafraîchissement de jeton.
        if (auth == null
                || !(auth.getPrincipal()
                        instanceof com.futurekawa.central.identite.service.UtilisateurAuthentifie)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "Non authentifié");
        }
        var principal = (com.futurekawa.central.identite.service.UtilisateurAuthentifie) auth.getPrincipal();
        return java.util.Map.of(
                "id", principal.id(),
                "email", principal.email(),
                "pays", principal.pays(),
                "roles", principal.roles()
        );
    }
}