package com.futurekawa.central.identite.dto;

public record LoginResponse(String accessToken, String refreshToken, String type) {}