package com.futurekawa.pays.alerte.dto;

import java.time.Instant;

public record AlerteDto(
        Long id,
        String type,
        String statut,
        Long entrepotId,
        Long lotId,
        String lotReference,
        String message,
        Double valeurTemperature,
        Double valeurHumidite,
        Instant declencheeAt,
        boolean emailEnvoye,
        int nbNotifications,
        Instant acquitteeAt,
        Instant resolueAt,
        String modeResolution
) {}