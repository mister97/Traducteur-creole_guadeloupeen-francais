-- Mofwazé : schéma MySQL 8 / MariaDB 10.6+
-- Les colonnes « recherche » contiennent une version normalisée du texte
-- (minuscules, sans accents) calculée par lib/normalisation.mjs.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Dictionnaire
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS entrees (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mot              VARCHAR(160) NOT NULL,
  slug             VARCHAR(190) NOT NULL,
  exclu_quotidien  TINYINT(1)   NOT NULL DEFAULT 0,
  exclu_jeu        TINYINT(1)   NOT NULL DEFAULT 0,
  cree_le          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modifie_le       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_entrees_slug (slug),
  KEY idx_entrees_mot (mot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Forme principale (= entrees.mot) et variantes orthographiques
CREATE TABLE IF NOT EXISTS formes (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  entree_id   INT UNSIGNED NOT NULL,
  forme       VARCHAR(160) NOT NULL,
  recherche   VARCHAR(160) NOT NULL,
  principale  TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_formes_recherche (recherche),
  KEY idx_formes_entree (entree_id),
  CONSTRAINT fk_formes_entree FOREIGN KEY (entree_id) REFERENCES entrees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  entree_id   INT UNSIGNED NOT NULL,
  num         SMALLINT UNSIGNED NOT NULL,
  traduction  TEXT NOT NULL,
  recherche   TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sens_entree (entree_id, num),
  CONSTRAINT fk_sens_entree FOREIGN KEY (entree_id) REFERENCES entrees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemples d'emploi d'un sens (phrase en créole et sa traduction)
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

CREATE TABLE IF NOT EXISTS synonymes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sens_id    INT UNSIGNED NOT NULL,
  position   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  mot        VARCHAR(160) NOT NULL,
  recherche  VARCHAR(160) NOT NULL,
  ref        INT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_syn_sens (sens_id, position),
  KEY idx_syn_recherche (recherche),
  KEY idx_syn_ref (ref),
  CONSTRAINT fk_syn_sens FOREIGN KEY (sens_id) REFERENCES sens (id) ON DELETE CASCADE,
  CONSTRAINT fk_syn_ref FOREIGN KEY (ref) REFERENCES entrees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expressions et exemples rattachés à un mot
CREATE TABLE IF NOT EXISTS locutions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  entree_id   INT UNSIGNED NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  expression  VARCHAR(255) NOT NULL,
  traduction  TEXT NULL,
  exemple_kr  TEXT NULL,
  exemple_fr  TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_loc_entree (entree_id, position),
  CONSTRAINT fk_loc_entree FOREIGN KEY (entree_id) REFERENCES entrees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index français → créole
CREATE TABLE IF NOT EXISTS fr_termes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  terme      VARCHAR(190) NOT NULL,
  recherche  VARCHAR(190) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fr_recherche (recherche)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fr_renvois (
  fr_id    INT UNSIGNED NOT NULL,
  sens_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (fr_id, sens_id),
  KEY idx_fr_renvois_sens (sens_id),
  CONSTRAINT fk_renvoi_fr FOREIGN KEY (fr_id) REFERENCES fr_termes (id) ON DELETE CASCADE,
  CONSTRAINT fk_renvoi_sens FOREIGN KEY (sens_id) REFERENCES sens (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Site
-- ---------------------------------------------------------------------------

-- Mot du jour et mot du jeu, tirés au sort une fois par jour (heure de Guadeloupe)
CREATE TABLE IF NOT EXISTS quotidien (
  jour       DATE NOT NULL,
  type       ENUM('mot', 'jeu') NOT NULL,
  entree_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (jour, type),
  KEY idx_quotidien_entree (type, entree_id),
  CONSTRAINT fk_quotidien_entree FOREIGN KEY (entree_id) REFERENCES entrees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Propositions des visiteurs. « donnees » contient la fiche proposée en JSON
-- (même format que l'éditeur de l'admin).
CREATE TABLE IF NOT EXISTS suggestions (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  type        ENUM('ajout', 'correction', 'remarque') NOT NULL,
  entree_id   INT UNSIGNED NULL,
  mot         VARCHAR(160) NULL,
  donnees     LONGTEXT NULL,
  message     TEXT NULL,
  nom         VARCHAR(120) NULL,
  email       VARCHAR(190) NULL,
  notifier    TINYINT(1) NOT NULL DEFAULT 0,
  langue      CHAR(2) NOT NULL DEFAULT 'kr',
  statut      ENUM('en_attente', 'validee', 'rejetee') NOT NULL DEFAULT 'en_attente',
  note_admin  TEXT NULL,
  ip_hash     CHAR(64) NULL,
  cree_le     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  traite_le   DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_suggestions_statut (statut, cree_le),
  KEY idx_suggestions_ip (ip_hash, cree_le),
  CONSTRAINT fk_suggestion_entree FOREIGN KEY (entree_id) REFERENCES entrees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
