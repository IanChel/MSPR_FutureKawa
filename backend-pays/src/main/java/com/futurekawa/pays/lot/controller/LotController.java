package com.futurekawa.pays.lot.controller;

import com.futurekawa.pays.lot.dto.CreerLotRequest;
import com.futurekawa.pays.lot.dto.LotDto;
import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.lot.service.LotService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lots")
public class LotController {

    private final LotService lotService;

    public LotController(LotService lotService) {
        this.lotService = lotService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LotDto creerLot(@Valid @RequestBody CreerLotRequest req) {
        return lotService.creerLot(req);
    }

    @GetMapping
    public List<LotDto> listerLots(
            @RequestParam(required = false) Long entrepotId,
            @RequestParam(required = false) StatutLot statut) {
        return lotService.listerLots(entrepotId, statut);
    }

    @GetMapping("/{id}")
    public LotDto consulterLot(@PathVariable Long id) {
        return lotService.consulterLot(id);
    }

    @PutMapping("/{id}")
    public LotDto modifierLot(@PathVariable Long id,
                              @Valid @RequestBody com.futurekawa.pays.lot.dto.ModifierLotRequest req) {
        return lotService.modifierLot(id, req);
    }

    @DeleteMapping("/{id}")
    public java.util.Map<String, String> supprimerLot(@PathVariable Long id) {
        lotService.supprimerLot(id);
        return java.util.Map.of("message", "Lot supprimé");
    }
}