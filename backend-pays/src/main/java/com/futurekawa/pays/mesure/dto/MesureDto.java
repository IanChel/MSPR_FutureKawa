package com.futurekawa.pays.mesure.dto;

import java.time.Instant;

public record MesureDto(
        Long id,
        Long entrepotId,
        Double temperature,
        Double humidite,
        Instant mesureAt
) {}