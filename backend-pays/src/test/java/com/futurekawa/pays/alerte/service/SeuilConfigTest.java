package com.futurekawa.pays.alerte.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires de la logique de seuils (conditions idéales ± tolérance).
 *
 * Référence cahier des charges (pays Brésil) : 29 °C / 55 %, tolérance ±3 °C / ±2 %.
 * La bande acceptable est donc : température [26 ; 32] °C, humidité [53 ; 57] %.
 *
 * Aucun contexte Spring, aucune base de données : test pur de la règle métier.
 */
@DisplayName("SeuilConfig — bande acceptable température / humidité (Brésil)")
class SeuilConfigTest {

    private SeuilConfig seuils;

    @BeforeEach
    void initSeuilsBresil() {
        seuils = new SeuilConfig();
        seuils.setTemperatureIdeale(29.0);
        seuils.setHumiditeIdeale(55.0);
        seuils.setToleranceTemperature(3.0);
        seuils.setToleranceHumidite(2.0);
    }

    @Nested
    @DisplayName("Calcul des bornes")
    class Bornes {

        @Test
        @DisplayName("les bornes dérivent de l'idéal ± tolérance")
        void bornesCalculees() {
            assertThat(seuils.tempMin()).isEqualTo(26.0);
            assertThat(seuils.tempMax()).isEqualTo(32.0);
            assertThat(seuils.humMin()).isEqualTo(53.0);
            assertThat(seuils.humMax()).isEqualTo(57.0);
        }
    }

    @Nested
    @DisplayName("estDansLaBande")
    class DansLaBande {

        @Test
        @DisplayName("valeur centrale (idéale) -> dans la bande")
        void valeurIdeale() {
            assertThat(seuils.estDansLaBande(29.0, 55.0)).isTrue();
        }

        @Test
        @DisplayName("les bornes sont incluses (>= et <=)")
        void bornesIncluses() {
            assertThat(seuils.estDansLaBande(26.0, 53.0)).isTrue(); // min/min
            assertThat(seuils.estDansLaBande(32.0, 57.0)).isTrue(); // max/max
            assertThat(seuils.estDansLaBande(26.0, 57.0)).isTrue(); // tempMin / humMax
        }

        @Test
        @DisplayName("température juste au-dessus du max -> hors bande")
        void temperatureTropHaute() {
            assertThat(seuils.estDansLaBande(32.1, 55.0)).isFalse();
        }

        @Test
        @DisplayName("température juste en dessous du min -> hors bande")
        void temperatureTropBasse() {
            assertThat(seuils.estDansLaBande(25.9, 55.0)).isFalse();
        }

        @Test
        @DisplayName("humidité hors plage même si température correcte -> hors bande")
        void humiditeHorsPlage() {
            assertThat(seuils.estDansLaBande(29.0, 57.1)).isFalse();
            assertThat(seuils.estDansLaBande(29.0, 52.9)).isFalse();
        }

        @Test
        @DisplayName("température ET humidité hors plage -> hors bande")
        void toutHorsPlage() {
            assertThat(seuils.estDansLaBande(40.0, 90.0)).isFalse();
        }
    }
}
