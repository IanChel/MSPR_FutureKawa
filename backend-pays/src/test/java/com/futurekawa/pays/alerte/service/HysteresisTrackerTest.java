package com.futurekawa.pays.alerte.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests unitaires de l'anti-rebond (hystérésis) sur les compteurs de mesures
 * consécutives par entrepôt.
 *
 * Règle métier : une mesure hors plage incrémente le compteur d'anomalies et
 * remet à zéro celui des mesures normales (et inversement). C'est ce mécanisme
 * qui évite d'ouvrir/fermer une alerte sur une seule mesure isolée (flapping).
 */
@DisplayName("HysteresisTracker — compteurs consécutifs par entrepôt")
class HysteresisTrackerTest {

    private HysteresisTracker tracker;

    private static final Long ENTREPOT_A = 1L;
    private static final Long ENTREPOT_B = 2L;

    @BeforeEach
    void init() {
        tracker = new HysteresisTracker();
    }

    @Test
    @DisplayName("les anomalies consécutives s'additionnent")
    void anomaliesConsecutives() {
        assertThat(tracker.horsPlage(ENTREPOT_A)).isEqualTo(1);
        assertThat(tracker.horsPlage(ENTREPOT_A)).isEqualTo(2);
        assertThat(tracker.horsPlage(ENTREPOT_A)).isEqualTo(3);
    }

    @Test
    @DisplayName("les mesures normales consécutives s'additionnent")
    void normalesConsecutives() {
        assertThat(tracker.dansLaPlage(ENTREPOT_A)).isEqualTo(1);
        assertThat(tracker.dansLaPlage(ENTREPOT_A)).isEqualTo(2);
    }

    @Test
    @DisplayName("une mesure normale remet à zéro le compteur d'anomalies")
    void normaleResetAnomalies() {
        tracker.horsPlage(ENTREPOT_A);
        tracker.horsPlage(ENTREPOT_A);   // 2 anomalies

        tracker.dansLaPlage(ENTREPOT_A); // retour normal -> reset anomalies

        // l'anomalie suivante repart de 1, pas de 3
        assertThat(tracker.horsPlage(ENTREPOT_A)).isEqualTo(1);
    }

    @Test
    @DisplayName("une mesure hors plage remet à zéro le compteur de mesures normales")
    void anomalieResetNormales() {
        tracker.dansLaPlage(ENTREPOT_A);
        tracker.dansLaPlage(ENTREPOT_A); // 2 normales

        tracker.horsPlage(ENTREPOT_A);   // anomalie -> reset normales

        assertThat(tracker.dansLaPlage(ENTREPOT_A)).isEqualTo(1);
    }

    @Test
    @DisplayName("les compteurs sont indépendants d'un entrepôt à l'autre")
    void isolationParEntrepot() {
        tracker.horsPlage(ENTREPOT_A);
        tracker.horsPlage(ENTREPOT_A);   // A = 2 anomalies

        // B n'a jamais été vu : son premier hors-plage doit valoir 1
        assertThat(tracker.horsPlage(ENTREPOT_B)).isEqualTo(1);

        // A n'est pas impacté par B
        assertThat(tracker.horsPlage(ENTREPOT_A)).isEqualTo(3);
    }
}
