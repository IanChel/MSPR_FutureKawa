package com.futurekawa.pays.mesure.controller;

import com.futurekawa.pays.mesure.dto.MesureDto;
import com.futurekawa.pays.mesure.service.MesureService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
public class MesureController {

    private final MesureService mesureService;

    public MesureController(MesureService mesureService) {
        this.mesureService = mesureService;
    }

    @GetMapping("/entrepots/{id}/mesures")
    public List<MesureDto> historiqueEntrepot(
            @PathVariable Long id,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to) {
        return mesureService.historiqueParEntrepot(id, from, to);
    }

    @GetMapping("/lots/{id}/mesures")
    public List<MesureDto> historiqueLot(@PathVariable Long id) {
        return mesureService.historiquePourLot(id);
    }
}