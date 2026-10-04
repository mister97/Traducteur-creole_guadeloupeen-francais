-- Migration : autorisation d'export complet, accordée partenaire par partenaire

SET NAMES utf8mb4;

ALTER TABLE partners
  ADD COLUMN export_autorise TINYINT(1) NOT NULL DEFAULT 0;
