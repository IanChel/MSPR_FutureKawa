package com.futurekawa.central.identite.service;

import java.util.List;

public record UtilisateurAuthentifie(String id, String email, String pays, List<String> roles) {}