package com.futurekawa.pays.lot.dto;

import java.time.Instant;

public record LotDto(
        Long id,
        String reference,
        Long exploitationId,
        Long entrepotId,
        String entrepotNom,
        Instant dateStockage,
        String statut,
        long joursEnStock,
        String caracteristiquesQualite
) {}