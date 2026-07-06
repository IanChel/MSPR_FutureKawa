package com.futurekawa.pays.referentiel.repository;

import com.futurekawa.pays.referentiel.entity.Capteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CapteurRepository extends JpaRepository<Capteur, Long> {
    Optional<Capteur> findByIdentifiantMqtt(String identifiantMqtt);
    List<Capteur> findByEntrepotId(Long entrepotId);
}