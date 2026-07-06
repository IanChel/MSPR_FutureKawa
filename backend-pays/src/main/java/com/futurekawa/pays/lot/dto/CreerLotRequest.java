package com.futurekawa.pays.lot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreerLotRequest(
        @NotBlank String reference,
        @NotNull Long exploitationId,
        @NotNull Long entrepotId,
        String caracteristiquesQualite
) {}