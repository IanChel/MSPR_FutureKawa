INSERT INTO exploitation (nom, pays) VALUES
                                         ('Finca La Esperanza', 'COLOMBIE'),
                                         ('Finca El Carmen',    'COLOMBIE');

INSERT INTO entrepot (nom, localisation, exploitation_id) VALUES
                                                              ('Bodega Huila',     'Huila',     1),
                                                              ('Bodega Narino',    'Narino',    1),
                                                              ('Bodega Antioquia', 'Antioquia', 2);

INSERT INTO capteur (identifiant_mqtt, entrepot_id) VALUES
                                                        ('capteur-colombie-e1', 1),
                                                        ('capteur-colombie-e2', 2),
                                                        ('capteur-colombie-e3', 3);

INSERT INTO lot (reference, exploitation_id, entrepot_id, date_stockage, statut, caracteristiques_qualite) VALUES
                                                                                                               ('LOT-CO-2026-001', 1, 1, now() - interval '10 days',  'CONFORME', 'Arabica supremo, score 86'),
                                                                                                               ('LOT-CO-2026-002', 1, 1, now() - interval '95 days',  'CONFORME', 'Arabica excelso, score 88'),
                                                                                                               ('LOT-CO-2026-003', 2, 3, now() - interval '230 days', 'CONFORME', 'Arabica lave, score 85'),
                                                                                                               ('LOT-CO-2025-007', 1, 2, now() - interval '420 days', 'CONFORME', 'Arabica naturel, score 82');

-- Historique ~7 jours centré sur l'idéal Colombie 26°C / 80%
INSERT INTO mesure (entrepot_id, capteur_id, temperature, humidite, mesure_at)
SELECT 1, 1,
       round((26 + (random()*2 - 1))::numeric, 2),
       round((80 + (random()*2 - 1))::numeric, 2),
       ts
FROM generate_series(now() - interval '7 days', now(), interval '1 hour') AS ts;