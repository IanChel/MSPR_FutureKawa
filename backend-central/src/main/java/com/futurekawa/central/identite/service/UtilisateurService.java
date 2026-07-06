package com.futurekawa.central.identite.service;

import com.futurekawa.central.identite.dto.UtilisateurDto;
import com.futurekawa.central.identite.entity.Role;
import com.futurekawa.central.identite.entity.Utilisateur;
import com.futurekawa.central.identite.repository.RoleRepository;
import com.futurekawa.central.identite.repository.UtilisateurRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final IsolationPaysService isolation;
    private final RoleRepository roleRepository;

    private final AuditService auditService;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder =
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    public UtilisateurService(UtilisateurRepository utilisateurRepository,
                              IsolationPaysService isolation, RoleRepository roleRepository, AuditService auditService) {
        this.utilisateurRepository = utilisateurRepository;
        this.isolation = isolation;
        this.roleRepository = roleRepository;
        this.auditService = auditService;
    }

    /** Liste filtrée : super admin voit tout, admin pays voit son pays uniquement. */
    @Transactional(readOnly = true)
    public List<UtilisateurDto> lister() {
        List<Utilisateur> users = isolation.peutVoirTousLesPays()
                ? utilisateurRepository.findAll()
                : utilisateurRepository.findByPays(isolation.paysDeLUtilisateur());
        return users.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UtilisateurDto parId(Long id) {
        Utilisateur u = trouver(id);
        verifierPerimetre(u);   // un admin pays ne peut pas lire un user d'un autre pays
        return toDto(u);
    }

    // --- helpers internes ---

    Utilisateur trouver(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    /** Vérifie que l'utilisateur cible est dans le périmètre de l'appelant. */
    void verifierPerimetre(Utilisateur cible) {
        if (isolation.peutVoirTousLesPays()) return;            // super admin : OK partout
        String monPays = isolation.paysDeLUtilisateur();
        if (cible.getPays() == null || !cible.getPays().equalsIgnoreCase(monPays)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Accès refusé : cet utilisateur n'est pas dans votre périmètre");
        }
    }

    UtilisateurDto toDto(Utilisateur u) {
        return new UtilisateurDto(
                u.getId(), u.getEmail(), u.getNom(), u.getPrenom(),
                u.getPays(), u.isActif(), u.getDerniereConnexion(),
                u.getRoles().stream().map(Role::getCode).toList());
    }

    @Transactional
    public UtilisateurDto creer(com.futurekawa.central.identite.dto.CreerUtilisateurRequest req) {
        // 1. email unique
        if (utilisateurRepository.existsByEmail(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }

        // 2. le rôle demandé doit exister
        Role role = roleRepository.findByCode(req.role())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Rôle inconnu : " + req.role()));

        // 3. règles de périmètre pour un admin pays (non super admin)
        if (!isolation.peutVoirTousLesPays()) {
            String monPays = isolation.paysDeLUtilisateur();
            // un admin pays ne crée que dans SON pays
            if (req.pays() == null || !req.pays().equalsIgnoreCase(monPays)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Vous ne pouvez créer un compte que dans votre pays (" + monPays + ")");
            }
            // ... et ne peut pas fabriquer un super admin
            if ("SUPER_ADMIN".equalsIgnoreCase(req.role())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Vous ne pouvez pas créer de super administrateur");
            }
        }

        // 4. cohérence : SUPER_ADMIN => pays null ; les autres => un pays obligatoire
        String pays = req.pays();
        if ("SUPER_ADMIN".equalsIgnoreCase(req.role())) {
            pays = null;
        } else if (pays == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Un pays est obligatoire pour ce rôle");
        }

        // 5. création + hachage bcrypt
        Utilisateur u = new Utilisateur();
        u.appliquerCreation(
                req.email(),
                encoder.encode(req.motDePasse()),
                req.nom(), req.prenom(), pays, role);
        utilisateurRepository.save(u);
        auditService.tracer("USER_CREATE", "utilisateur " + u.getEmail(), u.getPays(), "OK");
        return toDto(u);
    }

    @Transactional
    public UtilisateurDto changerActivation(Long id, boolean actif) {
        Utilisateur u = trouver(id);
        verifierPerimetre(u);                 // un admin pays n'agit que sur son périmètre
        empecherAutoBlocage(u, actif);        // garde-fou (voir plus bas)
        u.setActif(actif);
        auditService.tracer(actif ? "USER_ACTIVER" : "USER_DESACTIVER",
                "utilisateur " + u.getEmail(), u.getPays(), "OK");
        return toDto(u);
    }

    @Transactional
    public UtilisateurDto changerRole(Long id, String codeRole) {
        Utilisateur u = trouver(id);
        verifierPerimetre(u);

        Role role = roleRepository.findByCode(codeRole)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Rôle inconnu : " + codeRole));

        // un admin pays ne peut pas attribuer le rôle SUPER_ADMIN
        if (!isolation.peutVoirTousLesPays() && "SUPER_ADMIN".equalsIgnoreCase(codeRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Vous ne pouvez pas attribuer le rôle super administrateur");
        }
        u.remplacerRole(role);                // on remplace les rôles par le nouveau
        auditService.tracer("USER_CHANGER_ROLE",
                "utilisateur " + u.getEmail() + " -> " + codeRole, u.getPays(), "OK");
        return toDto(u);
    }

    /** Empêche un admin de se désactiver lui-même (évite de se verrouiller dehors). */
    private void empecherAutoBlocage(Utilisateur cible, boolean actif) {
        if (!actif) {
            String emailCourant = isolation.utilisateurCourant().email();
            if (cible.getEmail().equalsIgnoreCase(emailCourant)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Vous ne pouvez pas désactiver votre propre compte");
            }
        }
    }

    @Transactional
    public void supprimer(Long id) {
        Utilisateur u = trouver(id);

        // garde-fou 1 : on ne supprime pas son propre compte
        String emailCourant = isolation.utilisateurCourant().email();
        if (u.getEmail().equalsIgnoreCase(emailCourant)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Vous ne pouvez pas supprimer votre propre compte");
        }
        // garde-fou 2 : on protège le compte technique du simulateur
        if ("simulateur@futurekawa.example".equalsIgnoreCase(u.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Le compte technique du simulateur ne peut pas être supprimé");
        }

        String emailCible = u.getEmail();
        String paysCible = u.getPays();
        utilisateurRepository.delete(u);
        auditService.tracer("USER_DELETE", "utilisateur " + emailCible, paysCible, "OK");
    }
}