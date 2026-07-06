package com.futurekawa.pays.mesure.repository;

import com.futurekawa.pays.mesure.entity.Mesure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface MesureRepository extends JpaRepository<Mesure, Long> {
    List<Mesure> findByEntrepotIdAndMesureAtBetweenOrderByMesureAtAsc(
            Long entrepotId, Instant from, Instant to);

    List<Mesure> findByEntrepotIdAndMesureAtGreaterThanEqualOrderByMesureAtAsc(
            Long entrepotId, Instant from);
}