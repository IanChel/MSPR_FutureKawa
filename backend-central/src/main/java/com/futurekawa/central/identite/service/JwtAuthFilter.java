package com.futurekawa.central.identite.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final SecretKey cle;

    public JwtAuthFilter(@Value("${app.securite.jwt-secret}") String secret) {
        this.cle = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parser().verifyWith(cle).build()
                        .parseSignedClaims(token).getPayload();

                @SuppressWarnings("unchecked")
                List<String> roles = claims.get("roles", List.class);
                var authorities = roles.stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                        .toList();

                // on stocke email + pays dans le "principal" via un objet simple
                var principal = new UtilisateurAuthentifie(
                        claims.getSubject(),
                        claims.get("email", String.class),
                        claims.get("pays", String.class),
                        roles);

                var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                // jeton invalide/expiré : on ne pose pas d'authentification -> 401 plus loin
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}