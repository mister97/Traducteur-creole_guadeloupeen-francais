-- Migration : exemples rattachés à chaque sens.
-- À appliquer sur une base existante, au choix :
--   - « npm run db:init » (sans --ecraser) : crée les tables manquantes sans toucher aux données ;
--   - ou importer ce fichier dans phpMyAdmin.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS exemples (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sens_id   INT UNSIGNED NOT NULL,
  position  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  kreyol    TEXT NOT NULL,
  francais  TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_exemples_sens (sens_id, position),
  CONSTRAINT fk_exemple_sens FOREIGN KEY (sens_id) REFERENCES sens (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
