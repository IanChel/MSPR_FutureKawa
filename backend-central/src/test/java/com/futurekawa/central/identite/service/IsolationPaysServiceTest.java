package com.futurekawa.central.identite.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests unitaires de l'isolation par pays (sécurité multi-tenant).
 *
 * On place une identité simulée dans le contexte de sécurité Spring, puis on
 * vérifie les règles d'accès :
 *   - un super admin (pays = "*") accède à tous les pays ;
 *   - un admin pays n'accède qu'à SON pays (sinon 403 Forbidden).
 */
@DisplayName("IsolationPaysService — contrôle d'accès par pays")
class IsolationPaysServiceTest {

    private final IsolationPaysService service = new IsolationPaysService();

    /** Injecte une identité authentifiée dans le SecurityContext. */
    private void authentifierAvecPays(String pays) {
        UtilisateurAuthentifie principal =
                new UtilisateurAuthentifie("u1", "user@futurekawa.example", pays, List.of("ADMIN_PAYS"));
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void nettoyerContexte() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("le super admin (*) accède à n'importe quel pays")
    void superAdminAccedeATout() {
        authentifierAvecPays("*");

        assertThatCode(() -> service.verifierAcces("BRESIL")).doesNotThrowAnyException();
        assertThatCode(() -> service.verifierAcces("COLOMBIE")).doesNotThrowAnyException();
        assertThat(service.peutVoirTousLesPays()).isTrue();
    }

    @Test
    @DisplayName("un admin pays accède à son propre pays (insensible à la casse)")
    void adminAccedeASonPays() {
        authentifierAvecPays("BRESIL");

        assertThatCode(() -> service.verifierAcces("BRESIL")).doesNotThrowAnyException();
        assertThatCode(() -> service.verifierAcces("bresil")).doesNotThrowAnyException();
        assertThat(service.peutVoirTousLesPays()).isFalse();
    }

    @Test
    @DisplayName("un admin pays se voit refuser l'accès à un autre pays (403)")
    void adminRefuseAutrePays() {
        authentifierAvecPays("BRESIL");

        assertThatThrownBy(() -> service.verifierAcces("COLOMBIE"))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        ex -> assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
    }
}
