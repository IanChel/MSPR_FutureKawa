package com.futurekawa.pays.alerte.service;

import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class HysteresisTracker {

    // par entrepôt : compteurs de mesures consécutives hors plage / normales
    private final ConcurrentHashMap<Long, int[]> compteurs = new ConcurrentHashMap<>();
    // index 0 = consécutives anormales, index 1 = consécutives normales

    /** Enregistre une mesure hors plage ; renvoie le nb consécutif d'anomalies. */
    public int horsPlage(Long entrepotId) {
        int[] c = compteurs.computeIfAbsent(entrepotId, k -> new int[2]);
        c[0]++; c[1] = 0;
        return c[0];
    }

    /** Enregistre une mesure normale ; renvoie le nb consécutif de mesures normales. */
    public int dansLaPlage(Long entrepotId) {
        int[] c = compteurs.computeIfAbsent(entrepotId, k -> new int[2]);
        c[1]++; c[0] = 0;
        return c[1];
    }
}