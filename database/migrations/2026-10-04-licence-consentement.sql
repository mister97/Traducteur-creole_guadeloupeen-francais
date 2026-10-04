-- Migration : consentement du contributeur à la licence CC BY-NC-SA 4.0
-- (une proposition ne peut être enregistrée sans ce consentement)

SET NAMES utf8mb4;

ALTER TABLE suggestions
  ADD COLUMN consent_license TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN consent_at DATETIME NULL;
