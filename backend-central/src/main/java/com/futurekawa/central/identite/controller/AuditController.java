package com.futurekawa.central.identite.controller;

import com.futurekawa.central.identite.dto.AuditDto;
import com.futurekawa.central.identite.service.AuditService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/audit")
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN_PAYS')")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditDto> consulter() {
        return auditService.consulter();
    }
}