package com.futurekawa.central.identite.dto;

import java.time.Instant;
import java.util.List;

public record UtilisateurDto(
        Long id,
        String email,
        String nom,
        String prenom,
        String pays,
        boolean actif,
        Instant derniereConnexion,
        List<String> roles
) {}