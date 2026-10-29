-- Comptage des visiteurs, sans cookie et sans conserver d'adresse IP.
--
-- L'empreinte est un SHA-256 de (adresse IP + navigateur + secret + JOUR).
-- Comme le jour entre dans le calcul, la même personne obtient une empreinte
-- différente demain : on peut compter les visiteurs d'une journée, jamais
-- suivre quelqu'un d'un jour à l'autre. Les empreintes sont effacées au bout
-- de deux jours ; seuls les totaux de visites_jour sont conservés.

CREATE TABLE IF NOT EXISTS visites (
  jour      DATE     NOT NULL,
  empreinte CHAR(64) NOT NULL,
  PRIMARY KEY (jour, empreinte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visites_jour (
  jour      DATE NOT NULL,
  visiteurs INT UNSIGNED NOT NULL DEFAULT 0,
  pages     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (jour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
