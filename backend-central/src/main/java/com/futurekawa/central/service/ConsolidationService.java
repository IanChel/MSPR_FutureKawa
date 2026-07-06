package com.futurekawa.central.service;

import com.futurekawa.central.client.PaysClient;
import com.futurekawa.central.config.PaysProperties;
import com.futurekawa.central.dto.PaysStatutDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class ConsolidationService {

    private static final Logger log = LoggerFactory.getLogger(ConsolidationService.class);

    private final PaysProperties props;
    private final PaysClient client;

    public ConsolidationService(PaysProperties props, PaysClient client) {
        this.props = props;
        this.client = client;
    }

    /** Statut de chaque pays (disponible ou non). */
    public List<PaysStatutDto> statutPays() {
        return props.getPays().stream()
                .map(p -> new PaysStatutDto(p.getCode(), p.getUrl(),
                        client.estDisponible(p.getUrl())))
                .toList();
    }

    /**
     * Interroge TOUS les pays sur un même chemin (ex. "/lots") et fusionne les résultats,
     * en ajoutant le code pays à chaque élément. Un pays injoignable est ignoré
     * (dégradation gracieuse) — les autres sont quand même renvoyés.
     */
    public List<Map<String, Object>> consoliderTous(String path) {
        List<Map<String, Object>> resultat = new ArrayList<>();
        for (PaysProperties.Pays p : props.getPays()) {
            try {
                List<Map<String, Object>> items = client.getListe(p.getUrl(), path);
                if (items != null) {
                    for (Map<String, Object> item : items) {
                        item.put("pays", p.getCode());
                        resultat.add(item);
                    }
                }
            } catch (Exception e) {
                log.warn("Pays {} injoignable sur {} : {}", p.getCode(), path, e.getMessage());
            }
        }
        return resultat;
    }

    /** Interroge UN seul pays sur un chemin, en ajoutant le code pays à chaque élément. */
    public List<Map<String, Object>> consoliderPays(String code, String path) {
        PaysProperties.Pays p = trouverPays(code);
        List<Map<String, Object>> items = client.getListe(p.getUrl(), path);
        if (items != null) {
            items.forEach(i -> i.put("pays", code));
        }
        return items;
    }

    private PaysProperties.Pays trouverPays(String code) {
        return props.getPays().stream()
                .filter(p -> p.getCode().equalsIgnoreCase(code))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Pays inconnu : " + code));
    }

    /** Relaie une action PATCH (acquitter/résoudre) vers le back-end du pays. */
    public Map<String, Object> actionPays(String code, String path) {
        PaysProperties.Pays p = trouverPays(code);
        return client.patch(p.getUrl(), path);
    }

    /** Relaie une création (POST) vers le back-end du pays. */
    public Map<String, Object> creerDansPays(String code, String path, Object corps) {
        PaysProperties.Pays p = trouverPays(code);
        return client.post(p.getUrl(), path, corps);
    }

    /** Relaie une modification (PUT) vers le back-end du pays. */
    public Map<String, Object> modifierDansPays(String code, String path, Object corps) {
        PaysProperties.Pays p = trouverPays(code);
        return client.put(p.getUrl(), path, corps);
    }

    /** Relaie une suppression (DELETE) vers le back-end du pays. */
    public Map<String, Object> supprimerDansPays(String code, String path) {
        PaysProperties.Pays p = trouverPays(code);
        return client.delete(p.getUrl(), path);
    }
}
