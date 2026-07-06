package com.futurekawa.central.identite.dto;

public record CreerUtilisateurRequest(
        String email,
        String motDePasse,
        String nom,
        String prenom,
        String pays,        // code pays, ou null pour un compte global (super admin uniquement)
        String role         // SUPER_ADMIN / ADMIN_PAYS / OPERATEUR / LECTEUR
) {}