-- 1. Définitions, marque d'usage et catégorie grammaticale, rattachées au SENS
--    et non à l'entrée : MANJÉ sens 1 (nourrir) est un verbe, sens 2 (la
--    nourriture) est un nom, et les deux appellent des définitions différentes.
--    Tous ces champs sont facultatifs : ils ne s'affichent que remplis.

ALTER TABLE sens ADD COLUMN categorie     VARCHAR(40) NULL AFTER traduction;
ALTER TABLE sens ADD COLUMN marque        VARCHAR(60) NULL AFTER categorie;
ALTER TABLE sens ADD COLUMN definition_kr TEXT        NULL AFTER marque;
ALTER TABLE sens ADD COLUMN definition_fr TEXT        NULL AFTER definition_kr;

-- 2. Mesure du Mokaché : des compteurs par jour, jamais de joueurs.
--    Aucun identifiant, aucune adresse IP, aucun cookie : on ne peut pas
--    savoir qui a joué, seulement combien.

CREATE TABLE IF NOT EXISTS jeu_stats (
  jour       DATE NOT NULL,
  commencees INT UNSIGNED NOT NULL DEFAULT 0,
  terminees  INT UNSIGNED NOT NULL DEFAULT 0,
  gagnees    INT UNSIGNED NOT NULL DEFAULT 0,
  coups1     INT UNSIGNED NOT NULL DEFAULT 0,
  coups2     INT UNSIGNED NOT NULL DEFAULT 0,
  coups3     INT UNSIGNED NOT NULL DEFAULT 0,
  coups4     INT UNSIGNED NOT NULL DEFAULT 0,
  coups5     INT UNSIGNED NOT NULL DEFAULT 0,
  coups6     INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (jour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Recherches restées sans résultat : la liste des mots qu'on vous demande
--    et que le dictionnaire n'a pas. On garde le mot cherché, jamais qui l'a
--    cherché. « traite » permet de cocher ce qui a été ajouté ou écarté.

CREATE TABLE IF NOT EXISTS recherches_vides (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  terme       VARCHAR(190) NOT NULL,
  direction   ENUM('kr','fr') NOT NULL,
  occurrences INT UNSIGNED NOT NULL DEFAULT 1,
  premiere    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  derniere    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  traite      TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_recherche (terme, direction),
  KEY idx_recherches_frequence (traite, occurrences)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
