package com.futurekawa.central.identite.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IsolationPaysService {

    /** Vérifie que l'utilisateur courant a le droit d'accéder au pays demandé. */
    public void verifierAcces(String paysDemande) {
        UtilisateurAuthentifie u = utilisateurCourant();
        String paysToken = u.pays();   // "*" = super admin

        if ("*".equals(paysToken)) {
            return; // super admin : accès à tous les pays
        }
        if (!paysToken.equalsIgnoreCase(paysDemande)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : vous n'avez pas accès au pays " + paysDemande);
        }
    }

    /** Renvoie l'identité issue du jeton (placée par le filtre JWT). */
    public UtilisateurAuthentifie utilisateurCourant() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UtilisateurAuthentifie u) {
            return u;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non authentifié");
    }

    /** Liste des pays visibles par l'utilisateur courant. */
    public boolean peutVoirTousLesPays() {
        return "*".equals(utilisateurCourant().pays());
    }

    public String paysDeLUtilisateur() {
        return utilisateurCourant().pays();
    }
}