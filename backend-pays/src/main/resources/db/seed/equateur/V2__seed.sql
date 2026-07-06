INSERT INTO exploitation (nom, pays) VALUES
                                         ('Finca El Mirador', 'EQUATEUR'),
                                         ('Finca Los Andes',  'EQUATEUR');

INSERT INTO entrepot (nom, localisation, exploitation_id) VALUES
                                                              ('Bodega Loja',      'Loja',       1),
                                                              ('Bodega Zamora',    'Zamora',     1),
                                                              ('Bodega Pichincha', 'Pichincha',  2);

INSERT INTO capteur (identifiant_mqtt, entrepot_id) VALUES
                                                        ('capteur-equateur-e1', 1),
                                                        ('capteur-equateur-e2', 2),
                                                        ('capteur-equateur-e3', 3);

INSERT INTO lot (reference, exploitation_id, entrepot_id, date_stockage, statut, caracteristiques_qualite) VALUES
                                                                                                               ('LOT-EC-2026-001', 1, 1, now() - interval '20 days',  'CONFORME', 'Arabica altura, score 85'),
                                                                                                               ('LOT-EC-2026-002', 1, 1, now() - interval '120 days', 'CONFORME', 'Arabica lave, score 87'),
                                                                                                               ('LOT-EC-2026-003', 2, 3, now() - interval '210 days', 'CONFORME', 'Arabica honey, score 84'),
                                                                                                               ('LOT-EC-2025-010', 1, 2, now() - interval '410 days', 'CONFORME', 'Arabica naturel, score 83');

-- Historique ~7 jours centré sur l'idéal Équateur 31°C / 60%
INSERT INTO mesure (entrepot_id, capteur_id, temperature, humidite, mesure_at)
SELECT 1, 1,
       round((31 + (random()*2 - 1))::numeric, 2),
       round((60 + (random()*2 - 1))::numeric, 2),
       ts
FROM generate_series(now() - interval '7 days', now(), interval '1 hour') AS ts;