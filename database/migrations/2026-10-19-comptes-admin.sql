-- Comptes nominatifs pour l'administration et journal des actions.
-- Remplace le mot de passe unique partagé (ADMIN_PASSWORD_HASH).

CREATE TABLE IF NOT EXISTS admin_users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(190) NOT NULL UNIQUE,
  role            ENUM('proprietaire','editeur') NOT NULL DEFAULT 'editeur',
  password_hash   VARCHAR(255) NULL,
  password_set_at DATETIME     NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  failed_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME     NULL,
  last_login_at   DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suspended_at    DATETIME     NULL,
  created_by      INT UNSIGNED NULL,
  CONSTRAINT fk_admin_createur FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations (première connexion) et réinitialisations, à usage unique.
-- Seule l'empreinte SHA-256 du jeton est stockée : une fuite de la base ne donne aucun lien utilisable.
CREATE TABLE IF NOT EXISTS admin_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  purpose    ENUM('invitation','reset') NOT NULL,
  token_hash CHAR(64)     NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_token_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Journal des actions : qui a fait quoi, quand. Ces lignes ne sont jamais modifiées.
-- user_label fige le nom au moment de l'action, pour qu'un compte supprimé reste identifiable.
CREATE TABLE IF NOT EXISTS admin_audit (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NULL,
  user_label  VARCHAR(190) NOT NULL,
  action      VARCHAR(60)  NOT NULL,
  cible_type  VARCHAR(30)  NULL,
  cible_id    INT UNSIGNED NULL,
  cible_label VARCHAR(190) NULL,
  details     TEXT         NULL,
  ip_hash     CHAR(64)     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_date (created_at),
  INDEX idx_audit_user (user_id, created_at),
  INDEX idx_audit_action (action, created_at),
  INDEX idx_audit_cible (cible_type, cible_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
