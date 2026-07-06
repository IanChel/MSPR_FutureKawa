import { describe, it, expect } from 'vitest';
import { userInitials, userDisplayName, userRoleLabel } from './AuthContext';

/**
 * Tests unitaires des fonctions pures d'affichage de l'utilisateur
 * (initiales, nom affiché, libellé de rôle/pays). Aucune dépendance au DOM :
 * ce sont des fonctions de transformation de données.
 */

describe('userInitials', () => {
  it('compose les initiales à partir du prénom et du nom', () => {
    expect(userInitials({ prenom: 'Yasmine', nom: 'Achour' })).toBe('YA');
  });

  it('retombe sur la première lettre de l\'email si pas de prénom/nom', () => {
    expect(userInitials({ email: 'ops@futurekawa.example' })).toBe('O');
  });

  it('renvoie "U" par défaut si aucune information', () => {
    expect(userInitials(null)).toBe('U');
    expect(userInitials({})).toBe('U');
  });
});

describe('userDisplayName', () => {
  it('assemble prénom et nom', () => {
    expect(userDisplayName({ prenom: 'Yasmine', nom: 'Achour' })).toBe('Yasmine Achour');
  });

  it('utilise l\'email si prénom et nom sont absents', () => {
    expect(userDisplayName({ email: 'ops@futurekawa.example' })).toBe('ops@futurekawa.example');
  });

  it('renvoie une chaîne vide pour un utilisateur nul', () => {
    expect(userDisplayName(null)).toBe('');
  });
});

describe('userRoleLabel', () => {
  it('libelle le super admin comme siège tous pays', () => {
    expect(userRoleLabel({ roles: ['SUPER_ADMIN'] })).toBe('Siège · tous pays');
  });

  it('traduit le code pays pour un administrateur pays', () => {
    expect(userRoleLabel({ roles: ['ADMIN_PAYS'], pays: 'BRESIL' }))
      .toBe('Administrateur · Brésil');
  });

  it('retombe sur "Lecteur" pour un rôle non reconnu', () => {
    expect(userRoleLabel({ roles: [], pays: 'COLOMBIE' }))
      .toBe('Lecteur · Colombie');
  });
});
