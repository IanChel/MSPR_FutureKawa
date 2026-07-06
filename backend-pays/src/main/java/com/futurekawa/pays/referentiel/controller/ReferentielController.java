package com.futurekawa.pays.referentiel.controller;

import com.futurekawa.pays.referentiel.dto.EntrepotDto;
import com.futurekawa.pays.referentiel.dto.ExploitationDto;
import com.futurekawa.pays.referentiel.service.ReferentielService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.futurekawa.pays.referentiel.dto.CapteurDto;


@RestController
@RequestMapping("/exploitations")
public class ReferentielController {

    private final ReferentielService referentielService;

    public ReferentielController(ReferentielService referentielService) {
        this.referentielService = referentielService;
    }

    @GetMapping
    public List<ExploitationDto> listerExploitations() {
        return referentielService.listerExploitations();
    }

    @GetMapping("/{id}/entrepots")
    public List<EntrepotDto> listerEntrepots(@PathVariable Long id) {
        return referentielService.listerEntrepots(id);
    }

}