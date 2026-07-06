package com.futurekawa.pays.lot.repository;

import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.lot.entity.Lot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.Instant;
import com.futurekawa.pays.lot.StatutLot;
public interface LotRepository extends JpaRepository<Lot, Long> {

    boolean existsByReference(String reference);

    // FIFO : les plus anciens d'abord
    List<Lot> findAllByOrderByDateStockageAsc();

    List<Lot> findByEntrepotIdOrderByDateStockageAsc(Long entrepotId);

    List<Lot> findByStatutOrderByDateStockageAsc(StatutLot statut);

    // lots stockés avant une date donnée et pas déjà périmés
    List<Lot> findByDateStockageBeforeAndStatutNot(Instant seuil, StatutLot statut);
}