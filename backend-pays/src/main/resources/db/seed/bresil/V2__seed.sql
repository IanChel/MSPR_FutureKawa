INSERT INTO exploitation (nom, pays) VALUES
                                         ('Fazenda Santa Clara', 'BRESIL'),
                                         ('Fazenda Boa Vista',   'BRESIL');

INSERT INTO entrepot (nom, localisation, exploitation_id) VALUES
                                                              ('Entrepot Sud',     'Minas Gerais', 1),
                                                              ('Entrepot Nord',    'Sao Paulo',    1),
                                                              ('Entrepot Central', 'Parana',       2);

INSERT INTO capteur (identifiant_mqtt, entrepot_id) VALUES
                                                        ('capteur-bresil-e1', 1),
                                                        ('capteur-bresil-e2', 2),
                                                        ('capteur-bresil-e3', 3);

-- 3 lots récents + 1 lot ancien (>365 j) pour tester la péremption
INSERT INTO lot (reference, exploitation_id, entrepot_id, date_stockage, statut, caracteristiques_qualite) VALUES
                                                                                                               ('LOT-BR-2026-001', 1, 1, now() - interval '15 days',  'CONFORME', 'Arabica lave, score 84'),
                                                                                                               ('LOT-BR-2026-002', 1, 1, now() - interval '90 days',  'CONFORME', 'Arabica naturel, score 86'),
                                                                                                               ('LOT-BR-2026-003', 1, 2, now() - interval '200 days', 'CONFORME', 'Arabica honey, score 85'),
                                                                                                               ('LOT-BR-2025-014', 2, 3, now() - interval '400 days', 'CONFORME', 'Arabica lave, score 82');

-- Historique ~7 jours (1 point/heure) sur l'entrepot 1, valeurs autour de l'ideal Bresil 29C/55%
INSERT INTO mesure (entrepot_id, capteur_id, temperature, humidite, mesure_at)
SELECT 1, 1,
       round((29 + (random() * 2 - 1))::numeric, 2),
       round((55 + (random() * 2 - 1))::numeric, 2),
       ts
FROM generate_series(now() - interval '7 days', now(), interval '1 hour') AS ts;