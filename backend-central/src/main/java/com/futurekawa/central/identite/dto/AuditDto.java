package com.futurekawa.central.identite.dto;

import java.time.Instant;

public record AuditDto(Long id, Long auteurId, String action, String ressource,
                       String paysCible, Instant horodatage, String resultat) {}