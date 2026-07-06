package com.futurekawa.pays.lot.dto;

import com.futurekawa.pays.lot.StatutLot;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Champs modifiables d'un lot (la date de stockage et l'exploitation restent figées). */
public record ModifierLotRequest(
        @NotBlank String reference,
        @NotNull Long entrepotId,
        @NotNull StatutLot statut
) {}
