package com.futurekawa.central.identite.repository;

import com.futurekawa.central.identite.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByEmail(String email);

    List<Utilisateur> findByPays(String pays);
    boolean existsByEmail(String email);
}