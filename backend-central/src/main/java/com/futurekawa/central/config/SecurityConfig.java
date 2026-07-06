package com.futurekawa.central.config;

import com.futurekawa.central.identite.service.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity   // active @PreAuthorize (utilisé à l'étape suivante)
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(org.springframework.security.config.Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health/**", "/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                // Requête non authentifiée (jeton absent/expiré) -> 401 et non 403,
                // pour que l'intercepteur du front tente un refresh + rejeu.
                // Un utilisateur authentifié mais sans le droit reste, lui, en 403.
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authEx) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType("application/json");
                            response.getWriter().write(
                                    "{\"status\":401,\"message\":\"Authentification requise\"}");
                        }))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        cfg.setAllowedOrigins(java.util.List.of(
                "http://localhost:4200",   // Angular (front actuel, ng serve)
                "http://localhost:5173",   // Vite (ancien front React)
                "http://localhost:3000"    // autre port front éventuel
        ));
        cfg.setAllowedMethods(java.util.List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(java.util.List.of("*"));
        var src = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }
}