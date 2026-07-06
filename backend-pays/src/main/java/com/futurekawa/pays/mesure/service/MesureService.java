package com.futurekawa.pays.mesure.service;

import com.futurekawa.pays.lot.entity.Lot;
import com.futurekawa.pays.lot.repository.LotRepository;
import com.futurekawa.pays.mesure.dto.MesureDto;
import com.futurekawa.pays.mesure.entity.Mesure;
import com.futurekawa.pays.mesure.repository.MesureRepository;
import com.futurekawa.pays.referentiel.repository.EntrepotRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

@Service
public class MesureService {

    private final MesureRepository mesureRepository;
    private final EntrepotRepository entrepotRepository;
    private final LotRepository lotRepository;

    public MesureService(MesureRepository mesureRepository,
                         EntrepotRepository entrepotRepository,
                         LotRepository lotRepository) {
        this.mesureRepository = mesureRepository;
        this.entrepotRepository = entrepotRepository;
        this.lotRepository = lotRepository;
    }

    @Transactional(readOnly = true)
    public List<MesureDto> historiqueParEntrepot(Long entrepotId, Instant from, Instant to) {
        if (!entrepotRepository.existsById(entrepotId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Entrepôt introuvable");
        }
        Instant finalTo = (to != null) ? to : Instant.now();
        Instant finalFrom = (from != null)
                ? from
                : finalTo.minusSeconds(7 * 24 * 60 * 60);        return mesureRepository
                .findByEntrepotIdAndMesureAtBetweenOrderByMesureAtAsc(entrepotId, finalFrom, finalTo)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<MesureDto> historiquePourLot(Long lotId) {
        Lot lot = lotRepository.findById(lotId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lot introuvable"));
        // Les mesures sont liées à l'ENTREPÔT : on prend celles depuis la date de stockage du lot
        return mesureRepository
                .findByEntrepotIdAndMesureAtGreaterThanEqualOrderByMesureAtAsc(
                        lot.getEntrepot().getId(), lot.getDateStockage())
                .stream().map(this::toDto).toList();
    }

    private MesureDto toDto(Mesure m) {
        return new MesureDto(m.getId(), m.getEntrepot().getId(),
                m.getTemperature(), m.getHumidite(), m.getMesureAt());
    }
}