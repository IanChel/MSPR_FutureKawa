package com.futurekawa.central.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class GestionExceptions {

    private final ObjectMapper mapper = new ObjectMapper();

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of(
                        "status", ex.getStatusCode().value(),
                        "message", ex.getReason() == null ? "Erreur" : ex.getReason()
                ));
    }

    /**
     * Erreur renvoyée par un back-end pays lors d'un relais (POST /lots, PATCH …).
     * Sans ce handler, l'exception remonte non gérée : Spring redispatche vers
     * /error, la requête d'erreur repasse par la sécurité sans contexte → 401
     * trompeur. On propage donc le VRAI statut (400/404/409…) et le message.
     */
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, Object>> handleRelais(RestClientResponseException ex) {
        String message = "Le service pays a refusé la requête";
        try {
            var node = mapper.readTree(ex.getResponseBodyAsString());
            if (node.hasNonNull("message") && !node.get("message").asText().isBlank()) {
                message = node.get("message").asText();
            } else if (node.hasNonNull("error") && !node.get("error").asText().isBlank()) {
                message = node.get("error").asText();
            }
        } catch (Exception ignore) {
            // corps non-JSON : on garde le message par défaut
        }
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("status", ex.getStatusCode().value(), "message", message));
    }
}