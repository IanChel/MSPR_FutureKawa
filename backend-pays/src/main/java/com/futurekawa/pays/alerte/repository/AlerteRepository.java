package com.futurekawa.pays.alerte.repository;

import com.futurekawa.pays.alerte.StatutAlerte;
import com.futurekawa.pays.alerte.TypeAlerte;
import com.futurekawa.pays.alerte.entity.Alerte;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AlerteRepository extends JpaRepository<Alerte, Long> {

    boolean existsByTypeAndStatutAndEntrepotId(
            TypeAlerte type, StatutAlerte statut, Long entrepotId);

    boolean existsByTypeAndStatutAndLotId(
            TypeAlerte type, StatutAlerte statut, Long lotId);

    @Query("""
           SELECT a FROM Alerte a
           WHERE (:statut IS NULL OR a.statut = :statut)
             AND (:type   IS NULL OR a.type   = :type)
           ORDER BY a.declencheeAt DESC
           """)
    List<Alerte> rechercher(@Param("statut") StatutAlerte statut,
                            @Param("type") TypeAlerte type);

    Optional<Alerte> findFirstByTypeAndEntrepotIdAndStatutInOrderByDeclencheeAtDesc(
            TypeAlerte type, Long entrepotId, java.util.Collection<StatutAlerte> statuts);

    List<Alerte> findByTypeAndStatut(TypeAlerte type, StatutAlerte statut);

}