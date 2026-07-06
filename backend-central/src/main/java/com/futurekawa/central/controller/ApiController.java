package com.futurekawa.central.controller;

import com.futurekawa.central.dto.PaysStatutDto;
import com.futurekawa.central.identite.service.IsolationPaysService;
import com.futurekawa.central.service.ConsolidationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final ConsolidationService consolidation;
    private final IsolationPaysService isolation;

    public ApiController(ConsolidationService consolidation, IsolationPaysService isolation) {
        this.consolidation = consolidation;
        this.isolation = isolation;
    }

    /** Liste des pays et leur disponibilité (filtrée selon le périmètre). */
    @GetMapping("/pays")
    public List<PaysStatutDto> pays() {
        List<PaysStatutDto> tous = consolidation.statutPays();
        if (isolation.peutVoirTousLesPays()) {
            return tous;
        }
        String monPays = isolation.paysDeLUtilisateur();
        return tous.stream()
                .filter(p -> p.code().equalsIgnoreCase(monPays))
                .toList();
    }

    /** Tous les lots (super admin) ou ceux de son pays (admin pays). */
    @GetMapping("/lots")
    public List<Map<String, Object>> lots() {
        if (isolation.peutVoirTousLesPays()) {
            return consolidation.consoliderTous("/lots");
        }
        return consolidation.consoliderPays(isolation.paysDeLUtilisateur(), "/lots");
    }

    /** Toutes les alertes (super admin) ou celles de son pays (admin pays). */
    @GetMapping("/alertes")
    public List<Map<String, Object>> alertes() {
        if (isolation.peutVoirTousLesPays()) {
            return consolidation.consoliderTous("/alertes");
        }
        return consolidation.consoliderPays(isolation.paysDeLUtilisateur(), "/alertes");
    }

    /** Lots d'un pays précis. */
    @GetMapping("/pays/{code}/lots")
    public List<Map<String, Object>> lotsPays(@PathVariable String code) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/lots");
    }

    /** Alertes d'un pays précis. */
    @GetMapping("/pays/{code}/alertes")
    public List<Map<String, Object>> alertesPays(@PathVariable String code) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/alertes");
    }

    /** Courbes d'un lot : mesures de son entrepôt depuis sa date de stockage. */
    @GetMapping("/pays/{code}/lots/{lotId}/mesures")
    public List<Map<String, Object>> mesuresLot(@PathVariable String code,
                                                @PathVariable Long lotId) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/lots/" + lotId + "/mesures");
    }

    /** Historique des mesures d'un entrepôt d'un pays. */
    @GetMapping("/pays/{code}/entrepots/{entrepotId}/mesures")
    public List<Map<String, Object>> mesuresEntrepot(@PathVariable String code,
                                                     @PathVariable Long entrepotId) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/entrepots/" + entrepotId + "/mesures");
    }

    @GetMapping("/pays/{code}/exploitations")
    public List<Map<String, Object>> exploitations(@PathVariable String code) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/exploitations");
    }

    @GetMapping("/pays/{code}/exploitations/{expId}/entrepots")
    public List<Map<String, Object>> entrepots(@PathVariable String code,
                                               @PathVariable Long expId) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/exploitations/" + expId + "/entrepots");
    }

    @GetMapping("/pays/{code}/entrepots/{entrepotId}/capteurs")
    public List<Map<String, Object>> capteurs(@PathVariable String code,
                                              @PathVariable Long entrepotId) {
        isolation.verifierAcces(code);
        return consolidation.consoliderPays(code, "/entrepots/" + entrepotId + "/capteurs");
    }

    @org.springframework.web.bind.annotation.PatchMapping("/pays/{code}/alertes/{id}/acquitter")
    public Map<String, Object> acquitterAlerte(@PathVariable String code, @PathVariable Long id) {
        isolation.verifierAcces(code);
        return consolidation.actionPays(code, "/alertes/" + id + "/acquitter");
    }

    @org.springframework.web.bind.annotation.PatchMapping("/pays/{code}/alertes/{id}/resoudre")
    public Map<String, Object> resoudreAlerte(@PathVariable String code, @PathVariable Long id) {
        isolation.verifierAcces(code);
        return consolidation.actionPays(code, "/alertes/" + id + "/resoudre");
    }

    @org.springframework.web.bind.annotation.PostMapping("/pays/{code}/lots")
    public Map<String, Object> creerLot(@PathVariable String code,
                                        @org.springframework.web.bind.annotation.RequestBody Map<String, Object> lot) {
        isolation.verifierAcces(code);
        return consolidation.creerDansPays(code, "/lots", lot);
    }

    @org.springframework.web.bind.annotation.PutMapping("/pays/{code}/lots/{id}")
    public Map<String, Object> modifierLot(@PathVariable String code, @PathVariable Long id,
                                           @org.springframework.web.bind.annotation.RequestBody Map<String, Object> lot) {
        isolation.verifierAcces(code);
        return consolidation.modifierDansPays(code, "/lots/" + id, lot);
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/pays/{code}/lots/{id}")
    public Map<String, Object> supprimerLot(@PathVariable String code, @PathVariable Long id) {
        isolation.verifierAcces(code);
        return consolidation.supprimerDansPays(code, "/lots/" + id);
    }
}
