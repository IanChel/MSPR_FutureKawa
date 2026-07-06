package com.futurekawa.central.client;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class PaysClient {

    private static final ParameterizedTypeReference<List<Map<String, Object>>> LISTE =
            new ParameterizedTypeReference<>() {};

    private final RestClient restClient;

    public PaysClient(RestClient restClient) {
        this.restClient = restClient;
    }

    /** Récupère une liste JSON générique depuis un back-end pays (ex. /lots, /alertes). */
    public List<Map<String, Object>> getListe(String baseUrl, String path) {
        return restClient.get()
                .uri(baseUrl + path)
                .retrieve()
                .body(LISTE);
    }

    /** Vérifie si un back-end pays répond (via Actuator health). */
    public boolean estDisponible(String baseUrl) {
        try {
            restClient.get()
                    .uri(baseUrl + "/actuator/health")
                    .retrieve()
                    .toBodilessEntity();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, Object> patch(String baseUrl, String path) {
        return restClient.patch()
                .uri(baseUrl + path)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /** Envoie un POST avec corps JSON à un back-end pays (ex. /lots). */
    public Map<String, Object> post(String baseUrl, String path, Object corps) {
        return restClient.post()
                .uri(baseUrl + path)
                .body(corps)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /** Envoie un PUT avec corps JSON à un back-end pays (ex. modification de lot). */
    public Map<String, Object> put(String baseUrl, String path, Object corps) {
        return restClient.put()
                .uri(baseUrl + path)
                .body(corps)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }

    /** Envoie un DELETE à un back-end pays (ex. suppression de lot). */
    public Map<String, Object> delete(String baseUrl, String path) {
        return restClient.delete()
                .uri(baseUrl + path)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    }
}
