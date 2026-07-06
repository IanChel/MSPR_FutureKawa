package com.futurekawa.central.service;

import com.futurekawa.central.client.PaysClient;
import com.futurekawa.central.config.PaysProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires de la consolidation multi-pays du siège.
 *
 * Le client HTTP vers les back-ends pays est simulé (Mockito). On valide :
 *   - la fusion des résultats de plusieurs pays avec ajout du code pays ;
 *   - la TOLÉRANCE AUX PANNES : un pays injoignable est ignoré, les autres
 *     restent consolidés (dégradation gracieuse) ;
 *   - le rejet d'un code pays inconnu (404).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ConsolidationService — fusion multi-pays & tolérance aux pannes")
class ConsolidationServiceTest {

    @Mock private PaysClient client;

    private ConsolidationService service;

    @BeforeEach
    void init() {
        PaysProperties props = new PaysProperties();
        PaysProperties.Pays br = new PaysProperties.Pays();
        br.setCode("BRESIL");
        br.setUrl("http://bresil");
        PaysProperties.Pays co = new PaysProperties.Pays();
        co.setCode("COLOMBIE");
        co.setUrl("http://colombie");
        props.setPays(List.of(br, co));

        service = new ConsolidationService(props, client);
    }

    /** Map MUTABLE : la consolidation ajoute la clé "pays" sur chaque élément. */
    private Map<String, Object> item(String ref) {
        Map<String, Object> m = new HashMap<>();
        m.put("reference", ref);
        return m;
    }

    @Test
    @DisplayName("fusionne les lots des deux pays en taguant chaque élément du code pays")
    void fusionneEtTagueLesPays() {
        when(client.getListe("http://bresil", "/lots"))
                .thenReturn(new ArrayList<>(List.of(item("BR-1"))));
        when(client.getListe("http://colombie", "/lots"))
                .thenReturn(new ArrayList<>(List.of(item("CO-1"))));

        List<Map<String, Object>> resultat = service.consoliderTous("/lots");

        assertThat(resultat).hasSize(2);
        assertThat(resultat).anySatisfy(m -> {
            assertThat(m).containsEntry("reference", "BR-1");
            assertThat(m).containsEntry("pays", "BRESIL");
        });
        assertThat(resultat).anySatisfy(m -> {
            assertThat(m).containsEntry("reference", "CO-1");
            assertThat(m).containsEntry("pays", "COLOMBIE");
        });
    }

    @Test
    @DisplayName("un pays injoignable est ignoré, les autres sont quand même renvoyés (tolérance aux pannes)")
    void paysInjoignableEstIgnore() {
        when(client.getListe("http://bresil", "/lots"))
                .thenReturn(new ArrayList<>(List.of(item("BR-1"))));
        when(client.getListe("http://colombie", "/lots"))
                .thenThrow(new RuntimeException("connexion refusée / timeout"));

        List<Map<String, Object>> resultat = service.consoliderTous("/lots");

        // La Colombie est tombée : on garde quand même le Brésil, pas d'exception propagée.
        assertThat(resultat).hasSize(1);
        assertThat(resultat.get(0)).containsEntry("pays", "BRESIL");
    }

    @Test
    @DisplayName("un code pays inconnu lève une erreur 404")
    void paysInconnuLeve404() {
        assertThatThrownBy(() -> service.consoliderPays("JAPON", "/lots"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode().value()).isEqualTo(404));
    }
}
