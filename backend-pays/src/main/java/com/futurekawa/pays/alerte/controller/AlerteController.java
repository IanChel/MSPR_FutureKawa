package com.futurekawa.pays.alerte.controller;

import com.futurekawa.pays.alerte.dto.AlerteDto;
import com.futurekawa.pays.alerte.StatutAlerte;
import com.futurekawa.pays.alerte.TypeAlerte;
import com.futurekawa.pays.alerte.service.AlerteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AlerteController {

    private final AlerteService alerteService;

    public AlerteController(AlerteService alerteService) {
        this.alerteService = alerteService;
    }

    @GetMapping("/alertes")
    public List<AlerteDto> listerAlertes(
            @RequestParam(required = false) StatutAlerte statut,
            @RequestParam(required = false) TypeAlerte type) {
        return alerteService.listerAlertes(statut, type);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/alertes/{id}/resoudre")
    public AlerteDto resoudre(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return alerteService.resoudre(id);
    }

    @org.springframework.web.bind.annotation.PatchMapping("/alertes/{id}/acquitter")
    public AlerteDto acquitter(@org.springframework.web.bind.annotation.PathVariable Long id) {
        return alerteService.acquitter(id);
    }
}