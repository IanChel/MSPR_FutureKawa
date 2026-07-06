package com.futurekawa.pays.referentiel.service;

import com.futurekawa.pays.referentiel.dto.CapteurDto;
import com.futurekawa.pays.referentiel.dto.EntrepotDto;
import com.futurekawa.pays.referentiel.dto.ExploitationDto;
import com.futurekawa.pays.referentiel.repository.CapteurRepository;
import com.futurekawa.pays.referentiel.repository.EntrepotRepository;
import com.futurekawa.pays.referentiel.repository.ExploitationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
public class ReferentielService {

    private final ExploitationRepository exploitationRepository;
    private final EntrepotRepository entrepotRepository;

    private final CapteurRepository capteurRepository;

    public ReferentielService(ExploitationRepository exploitationRepository,
                              EntrepotRepository entrepotRepository,
                              CapteurRepository capteurRepository) {
        this.exploitationRepository = exploitationRepository;
        this.entrepotRepository = entrepotRepository;
        this.capteurRepository = capteurRepository;
    }

    public List<ExploitationDto> listerExploitations() {
        return exploitationRepository.findAll().stream()
                .map(e -> new ExploitationDto(e.getId(), e.getNom(), e.getPays()))
                .toList();
    }

    public List<EntrepotDto> listerEntrepots(Long exploitationId) {
        if (!exploitationRepository.existsById(exploitationId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Exploitation introuvable");
        }
        return entrepotRepository.findByExploitationId(exploitationId).stream()
                .map(e -> new EntrepotDto(e.getId(), e.getNom(), e.getLocalisation(),
                        e.getExploitation().getId()))
                .toList();
    }

    public List<CapteurDto> listerCapteurs(Long entrepotId) {
        if (!entrepotRepository.existsById(entrepotId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entrepôt introuvable");
        }
        return capteurRepository.findByEntrepotId(entrepotId).stream()
                .map(c -> new CapteurDto(c.getId(), c.getIdentifiantMqtt(),
                        c.getEntrepot().getId()))
                .toList();
    }
}