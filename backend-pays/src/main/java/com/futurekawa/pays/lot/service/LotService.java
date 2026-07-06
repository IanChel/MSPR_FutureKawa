package com.futurekawa.pays.lot.service;

import com.futurekawa.pays.lot.StatutLot;
import com.futurekawa.pays.lot.dto.CreerLotRequest;
import com.futurekawa.pays.lot.dto.LotDto;
import com.futurekawa.pays.lot.entity.Lot;
import com.futurekawa.pays.lot.repository.LotRepository;
import com.futurekawa.pays.referentiel.entity.Entrepot;
import com.futurekawa.pays.referentiel.entity.Exploitation;
import com.futurekawa.pays.referentiel.repository.EntrepotRepository;
import com.futurekawa.pays.referentiel.repository.ExploitationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class LotService {

    private final LotRepository lotRepository;
    private final ExploitationRepository exploitationRepository;
    private final EntrepotRepository entrepotRepository;

    public LotService(LotRepository lotRepository,
                      ExploitationRepository exploitationRepository,
                      EntrepotRepository entrepotRepository) {
        this.lotRepository = lotRepository;
        this.exploitationRepository = exploitationRepository;
        this.entrepotRepository = entrepotRepository;
    }

    @Transactional
    public LotDto creerLot(CreerLotRequest req) {
        if (lotRepository.existsByReference(req.reference())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un lot avec cette référence existe déjà");
        }
        Exploitation exploitation = exploitationRepository.findById(req.exploitationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Exploitation introuvable"));
        Entrepot entrepot = entrepotRepository.findById(req.entrepotId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Entrepôt introuvable"));

        Lot lot = new Lot();
        lot.setReference(req.reference());
        lot.setExploitation(exploitation);
        lot.setEntrepot(entrepot);
        lot.setDateStockage(Instant.now());          // entrée en stockage = maintenant
        lot.setStatut(StatutLot.CONFORME);            // statut initial
        lot.setCaracteristiquesQualite(req.caracteristiquesQualite());

        return toDto(lotRepository.save(lot));
    }

    @Transactional
    public LotDto modifierLot(Long id, com.futurekawa.pays.lot.dto.ModifierLotRequest req) {
        Lot lot = lotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Lot introuvable"));
        // référence unique (sauf si elle n'a pas changé)
        if (!lot.getReference().equals(req.reference())
                && lotRepository.existsByReference(req.reference())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Un lot avec cette référence existe déjà");
        }
        Entrepot entrepot = entrepotRepository.findById(req.entrepotId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Entrepôt introuvable"));
        lot.setReference(req.reference());
        lot.setEntrepot(entrepot);
        lot.setStatut(req.statut());
        return toDto(lotRepository.save(lot));
    }

    @Transactional
    public void supprimerLot(Long id) {
        if (!lotRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Lot introuvable");
        }
        lotRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<LotDto> listerLots(Long entrepotId, StatutLot statut) {
        List<Lot> lots;
        if (entrepotId != null) {
            lots = lotRepository.findByEntrepotIdOrderByDateStockageAsc(entrepotId);
        } else if (statut != null) {
            lots = lotRepository.findByStatutOrderByDateStockageAsc(statut);
        } else {
            lots = lotRepository.findAllByOrderByDateStockageAsc(); // FIFO global
        }
        return lots.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public LotDto consulterLot(Long id) {
        Lot lot = lotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Lot introuvable"));
        return toDto(lot);
    }

    private LotDto toDto(Lot lot) {
        long jours = Duration.between(lot.getDateStockage(), Instant.now()).toDays();
        return new LotDto(
                lot.getId(),
                lot.getReference(),
                lot.getExploitation().getId(),
                lot.getEntrepot().getId(),
                lot.getEntrepot().getNom(),
                lot.getDateStockage(),
                lot.getStatut().name(),
                jours,
                lot.getCaracteristiquesQualite()
        );
    }
}