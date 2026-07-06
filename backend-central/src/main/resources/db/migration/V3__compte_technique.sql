-- Compte technique pour le simulateur (lecture seule, tous pays)
-- Mot de passe = Admin123! (même hash bcrypt que les autres comptes de démo)
INSERT INTO utilisateur (email, mot_de_passe_hash, nom, prenom, pays) VALUES
    ('simulateur@futurekawa.example', '$2b$10$ppifvNnN3/d2/a7DeN327eGGhi9mwSLxrYVj8g7mUN38gDoMMFf7a', 'Technique', 'Simulateur', NULL);

INSERT INTO utilisateur_role (utilisateur_id, role_id)
SELECT u.id, (SELECT id FROM role WHERE code='LECTEUR')
FROM utilisateur u WHERE u.email='simulateur@futurekawa.example';