package com.futurekawa.pays.alerte.service;

import com.futurekawa.pays.alerte.StatutAlerte;
import com.futurekawa.pays.alerte.TypeAlerte;
import com.futurekawa.pays.alerte.entity.Alerte;
import com.futurekawa.pays.alerte.repository.AlerteRepository;
import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.lot.entity.Lot;
import com.futurekawa.pays.lot.repository.LotRepository;
import com.futurekawa.pays.mesure.entity.Mesure;
import com.futurekawa.pays.notification.service.NotificationService;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires du cœur métier des alertes (logique pure, sans base de données).
 *
 * Les dépendances de persistance et d'email sont simulées (Mockito) ; la logique
 * de seuils et d'hystérésis est réelle. On valide les deux règles centrales du
 * cahier des charges :
 *   - alerte « conditions » : levée seulement après N mesures consécutives hors plage
 *     (anti-flapping) ;
 *   - alerte « péremption » : levée pour un lot stocké depuis plus de 365 jours,
 *     avec garde anti-doublon.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AlerteService — ouverture d'alerte conditions & péremption")
class AlerteServiceTest {

    @Mock private AlerteRepository alerteRepository;
    @Mock private LotRepository lotRepository;
    @Mock private NotificationService notificationService;

    private AlerteService service;

    private static final int SEUIL_OUVERTURE = 3;
    private static final int SEUIL_RESOLUTION = 3;

    @BeforeEach
    void init() {
        // Seuils réels du Brésil : 29 °C / 55 %, tolérance ±3 / ±2 -> bande [26;32] / [53;57]
        SeuilConfig seuils = new SeuilConfig();
        seuils.setTemperatureIdeale(29.0);
        seuils.setHumiditeIdeale(55.0);
        seuils.setToleranceTemperature(3.0);
        seuils.setToleranceHumidite(2.0);

        service = new AlerteService(
                alerteRepository,
                lotRepository,
                seuils,
                notificationService,
                new HysteresisTracker(),
                SEUIL_OUVERTURE,
                SEUIL_RESOLUTION,
                30 // rappel-intervalle-minutes (non utilisé dans ces tests)
        );
    }

    private Entrepot entrepot(long id) {
        Entrepot e = new Entrepot();
        e.setId(id);
        return e;
    }

    private Mesure mesure(Entrepot e, double temp, double hum) {
        Mesure m = new Mesure();
        m.setEntrepot(e);
        m.setTemperature(temp);
        m.setHumidite(hum);
        m.setMesureAt(Instant.now());
        return m;
    }

    @Test
    @DisplayName("une seule mesure hors plage ne lève PAS d'alerte (anti-flapping)")
    void uneMesureHorsPlageNeLevePasAlerte() {
        Entrepot e = entrepot(1L);
        when(alerteRepository.findFirstByTypeAndEntrepotIdAndStatutInOrderByDeclencheeAtDesc(
                any(), anyLong(), any())).thenReturn(Optional.empty());

        service.evaluerMesure(mesure(e, 40.0, 55.0)); // température très au-dessus du max

        verify(alerteRepository, never()).save(any());
        verify(notificationService, never()).envoyerAlerteEmail(any());
    }

    @Test
    @DisplayName("3 mesures consécutives hors plage lèvent exactement UNE alerte + 1 email")
    void troisMesuresConsecutivesLeventUneAlerte() {
        Entrepot e = entrepot(1L);
        when(alerteRepository.findFirstByTypeAndEntrepotIdAndStatutInOrderByDeclencheeAtDesc(
                any(), anyLong(), any())).thenReturn(Optional.empty());
        when(lotRepository.findByEntrepotIdOrderByDateStockageAsc(1L)).thenReturn(List.of());

        service.evaluerMesure(mesure(e, 40.0, 55.0));
        service.evaluerMesure(mesure(e, 40.0, 55.0));
        service.evaluerMesure(mesure(e, 40.0, 55.0)); // 3e mesure -> ouverture

        verify(alerteRepository, times(1)).save(any(Alerte.class));
        verify(notificationService, times(1)).envoyerAlerteEmail(any(Alerte.class));
    }

    @Test
    @DisplayName("un lot stocké depuis plus de 365 jours est marqué PERIME et déclenche une alerte")
    void lotTropAncienDeclencheAlertePeremption() {
        Entrepot e = entrepot(1L);
        Lot lot = new Lot();
        lot.setId(10L);
        lot.setReference("BR-2024-001");
        lot.setEntrepot(e);
        lot.setStatut(StatutLot.CONFORME);
        lot.setDateStockage(Instant.now().minus(400, ChronoUnit.DAYS)); // > 365 j

        when(lotRepository.findByDateStockageBeforeAndStatutNot(any(), any()))
                .thenReturn(List.of(lot));
        when(alerteRepository.existsByTypeAndStatutAndLotId(
                TypeAlerte.PEREMPTION, StatutAlerte.ACTIVE, 10L)).thenReturn(false);

        service.evaluerPeremptions();

        assertThat(lot.getStatut()).isEqualTo(StatutLot.PERIME);
        verify(alerteRepository, times(1)).save(any(Alerte.class));
        verify(notificationService, times(1)).envoyerAlerteEmail(any(Alerte.class));
    }

    @Test
    @DisplayName("aucune alerte de péremption en double si une est déjà active pour le lot")
    void pasDeDoublonPeremption() {
        Entrepot e = entrepot(1L);
        Lot lot = new Lot();
        lot.setId(10L);
        lot.setReference("BR-2024-001");
        lot.setEntrepot(e);
        lot.setStatut(StatutLot.CONFORME);
        lot.setDateStockage(Instant.now().minus(400, ChronoUnit.DAYS));

        when(lotRepository.findByDateStockageBeforeAndStatutNot(any(), any()))
                .thenReturn(List.of(lot));
        when(alerteRepository.existsByTypeAndStatutAndLotId(
                TypeAlerte.PEREMPTION, StatutAlerte.ACTIVE, 10L)).thenReturn(true); // déjà active

        service.evaluerPeremptions();

        verify(alerteRepository, never()).save(any());
        verify(notificationService, never()).envoyerAlerteEmail(any());
    }
}
