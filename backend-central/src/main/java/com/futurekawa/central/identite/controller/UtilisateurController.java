package com.futurekawa.central.identite.controller;

import com.futurekawa.central.identite.dto.UtilisateurDto;
import com.futurekawa.central.identite.service.UtilisateurService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_PAYS')")   // gestion des comptes réservée aux admins
public class UtilisateurController {

    private final UtilisateurService service;

    public UtilisateurController(UtilisateurService service) {
        this.service = service;
    }

    @GetMapping
    public List<UtilisateurDto> lister() {
        return service.lister();
    }

    @GetMapping("/{id}")
    public UtilisateurDto parId(@PathVariable Long id) {
        return service.parId(id);
    }

    @org.springframework.web.bind.annotation.PostMapping
    public UtilisateurDto creer(
            @org.springframework.web.bind.annotation.RequestBody
            com.futurekawa.central.identite.dto.CreerUtilisateurRequest req) {
        return service.creer(req);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}/desactiver")
    public UtilisateurDto desactiver(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return service.changerActivation(id, false);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}/activer")
    public UtilisateurDto activer(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return service.changerActivation(id, true);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/{id}/role")
    public UtilisateurDto changerRole(
            @org.springframework.web.bind.annotation.PathVariable Long id,
            @org.springframework.web.bind.annotation.RequestBody
            com.futurekawa.central.identite.dto.ChangerRoleRequest req) {
        return service.changerRole(id, req.role());
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('SUPER_ADMIN')")
    public java.util.Map<String, String> supprimer(
            @org.springframework.web.bind.annotation.PathVariable Long id) {
        service.supprimer(id);
        return java.util.Map.of("message", "Utilisateur supprimé");
    }
}