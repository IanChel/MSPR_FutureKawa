-- Rôles
INSERT INTO role (code, libelle) VALUES
                                     ('SUPER_ADMIN', 'Super administrateur (siège, tous pays)'),
                                     ('ADMIN_PAYS',  'Administrateur d''un pays'),
                                     ('OPERATEUR',   'Opérateur (saisie / acquittement)'),
                                     ('LECTEUR',     'Lecteur (consultation seule)');

-- Permissions (jeu représentatif)
INSERT INTO permission (code, libelle) VALUES
                                           ('USER_MANAGE',  'Gérer les utilisateurs'),
                                           ('PARAM_MANAGE', 'Gérer les paramètres / entrepôts / capteurs'),
                                           ('LOT_WRITE',    'Créer / modifier des lots'),
                                           ('LOT_READ',     'Consulter lots et mesures'),
                                           ('ALERTE_ACT',   'Acquitter / résoudre des alertes'),
                                           ('ALERTE_READ',  'Consulter les alertes'),
                                           ('AUDIT_READ',   'Consulter le journal d''audit');

-- SUPER_ADMIN : toutes les permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code='SUPER_ADMIN'), p.id FROM permission p;

-- ADMIN_PAYS : tout sauf rien (mais limité à son pays par l'isolation, pas par les permissions)
INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code='ADMIN_PAYS'), p.id
FROM permission p WHERE p.code IN
                        ('USER_MANAGE','PARAM_MANAGE','LOT_WRITE','LOT_READ','ALERTE_ACT','ALERTE_READ','AUDIT_READ');

-- OPERATEUR : saisie + acquittement + lecture
INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code='OPERATEUR'), p.id
FROM permission p WHERE p.code IN ('LOT_WRITE','LOT_READ','ALERTE_ACT','ALERTE_READ');

-- LECTEUR : lecture seule
INSERT INTO role_permission (role_id, permission_id)
SELECT (SELECT id FROM role WHERE code='LECTEUR'), p.id
FROM permission p WHERE p.code IN ('LOT_READ','ALERTE_READ');

-- Utilisateurs (mot de passe = Admin123!)
INSERT INTO utilisateur (email, mot_de_passe_hash, nom, prenom, pays) VALUES
                                                                          ('superadmin@futurekawa.example', '$2b$10$ppifvNnN3/d2/a7DeN327eGGhi9mwSLxrYVj8g7mUN38gDoMMFf7a', 'Siège',   'Super',  NULL),
                                                                          ('admin-bresil@futurekawa.example',   '$2b$10$ppifvNnN3/d2/a7DeN327eGGhi9mwSLxrYVj8g7mUN38gDoMMFf7a', 'Brésil',   'Admin', 'BRESIL'),
                                                                          ('admin-equateur@futurekawa.example', '$2b$10$ppifvNnN3/d2/a7DeN327eGGhi9mwSLxrYVj8g7mUN38gDoMMFf7a', 'Équateur', 'Admin', 'EQUATEUR'),
                                                                          ('admin-colombie@futurekawa.example', '$2b$10$ppifvNnN3/d2/a7DeN327eGGhi9mwSLxrYVj8g7mUN38gDoMMFf7a', 'Colombie', 'Admin', 'COLOMBIE');

-- Attribution des rôles
INSERT INTO utilisateur_role (utilisateur_id, role_id)
SELECT u.id, (SELECT id FROM role WHERE code='SUPER_ADMIN')
FROM utilisateur u WHERE u.email='superadmin@futurekawa.example';

INSERT INTO utilisateur_role (utilisateur_id, role_id)
SELECT u.id, (SELECT id FROM role WHERE code='ADMIN_PAYS')
FROM utilisateur u WHERE u.email LIKE 'admin-%@futurekawa.example';