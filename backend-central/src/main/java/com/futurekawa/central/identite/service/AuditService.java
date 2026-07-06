package com.futurekawa.central.identite.service;

import com.futurekawa.central.identite.entity.JournalAudit;
import com.futurekawa.central.identite.repository.JournalAuditRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final JournalAuditRepository repository;
    private final IsolationPaysService isolation;

    public AuditService(JournalAuditRepository repository, IsolationPaysService isolation) {
        this.repository = repository;
        this.isolation = isolation;
    }

    /** Journalise une action de l'utilisateur courant. */
    @Transactional
    public void tracer(String action, String ressource, String paysCible, String resultat) {
        Long auteurId = null;
        try {
            auteurId = Long.valueOf(isolation.utilisateurCourant().id());
        } catch (Exception ignore) { /* action non authentifiée : auteur inconnu */ }
        repository.save(new JournalAudit(auteurId, action, ressource, paysCible, resultat));
    }

    @Transactional(readOnly = true)
    public java.util.List<com.futurekawa.central.identite.dto.AuditDto> consulter() {
        java.util.List<JournalAudit> entrees = isolation.peutVoirTousLesPays()
                ? repository.findTop100ByOrderByHorodatageDesc()
                : repository.findTop100ByPaysCibleOrderByHorodatageDesc(isolation.paysDeLUtilisateur());
        return entrees.stream().map(a -> new com.futurekawa.central.identite.dto.AuditDto(
                a.getId(), a.getUtilisateurId(), a.getAction(), a.getRessource(),
                a.getPaysCible(), a.getHorodatage(), a.getResultat())).toList();
    }
}