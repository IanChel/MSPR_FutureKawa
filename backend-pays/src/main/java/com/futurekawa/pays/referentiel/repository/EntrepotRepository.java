package com.futurekawa.pays.referentiel.repository;

import com.futurekawa.pays.referentiel.entity.Entrepot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EntrepotRepository extends JpaRepository<Entrepot, Long> {
    List<Entrepot> findByExploitationId(Long exploitationId);
}