package com.futurekawa.pays.mesure.dto;

import java.time.Instant;

public record MesurePayload(
        String capteurId,
        Double temperature,
        Double humidite,
        Instant timestamp
) {}