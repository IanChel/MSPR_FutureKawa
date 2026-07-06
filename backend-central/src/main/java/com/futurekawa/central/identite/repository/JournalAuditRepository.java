package com.futurekawa.central.identite.repository;

import com.futurekawa.central.identite.entity.JournalAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JournalAuditRepository extends JpaRepository<JournalAudit, Long> {
    List<JournalAudit> findTop100ByOrderByHorodatageDesc();
    List<JournalAudit> findTop100ByPaysCibleOrderByHorodatageDesc(String paysCible);
}