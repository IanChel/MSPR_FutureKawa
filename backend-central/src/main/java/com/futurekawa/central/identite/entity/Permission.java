package com.futurekawa.central.identite.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "permission")
public class Permission {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String code;
    private String libelle;

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getLibelle() { return libelle; }
}