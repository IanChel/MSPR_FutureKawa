-- Étendre les statuts possibles (ajout de ACQUITTEE)
ALTER TABLE alerte DROP CONSTRAINT alerte_statut_check;
ALTER TABLE alerte ADD CONSTRAINT alerte_statut_check
    CHECK (statut IN ('ACTIVE','ACQUITTEE','RESOLUE'));

-- Champs de cycle de vie de l'incident
ALTER TABLE alerte
    ADD COLUMN derniere_observation_at  TIMESTAMP,
    ADD COLUMN derniere_notification_at TIMESTAMP,
    ADD COLUMN nb_notifications         INT NOT NULL DEFAULT 0,
    ADD COLUMN valeur_extreme_temp      NUMERIC(5,2),
    ADD COLUMN valeur_extreme_hum       NUMERIC(5,2),
    ADD COLUMN acquittee_at             TIMESTAMP,
    ADD COLUMN mode_resolution          VARCHAR(10);   -- AUTO / MANUEL