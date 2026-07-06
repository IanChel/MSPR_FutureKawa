package com.futurekawa.pays.referentiel.controller;

import com.futurekawa.pays.referentiel.dto.CapteurDto;
import com.futurekawa.pays.referentiel.service.ReferentielService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class EntrepotController {

    private final ReferentielService referentielService;

    public EntrepotController(ReferentielService referentielService) {
        this.referentielService = referentielService;
    }

    @GetMapping("/entrepots/{id}/capteurs")
    public List<CapteurDto> listerCapteurs(@PathVariable Long id) {
        return referentielService.listerCapteurs(id);
    }
}