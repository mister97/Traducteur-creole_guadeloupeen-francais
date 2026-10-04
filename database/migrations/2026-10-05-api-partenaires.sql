-- Migration : API publique en lecture et espace partenaire
-- (tables des sections 2.1, 3.1, 3.3 et 3.5 de la spécification)

SET NAMES utf8mb4;

-- Demandes d'accès envoyées depuis /api et /licence (aucun compte n'est créé automatiquement)
CREATE TABLE IF NOT EXISTS access_requests (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  site_url      VARCHAR(190)  NULL,
  usage_desc    TEXT          NOT NULL,
  non_commercial TINYINT(1)   NOT NULL DEFAULT 0,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ip_hash       CHAR(64)      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  handled_at    DATETIME      NULL,
  INDEX idx_access_status (status, created_at),
  INDEX idx_access_ip (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS partners (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120)  NOT NULL,
  site_url       VARCHAR(190)  NULL,
  contact_email  VARCHAR(190)  NOT NULL UNIQUE,
  usage_type     ENUM('non_commercial','commercial_autorise') NOT NULL DEFAULT 'non_commercial',
  is_active      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suspended_at   DATETIME      NULL,
  password_hash   VARCHAR(255) NULL,
  password_set_at DATETIME     NULL,
  is_admin        TINYINT(1)   NOT NULL DEFAULT 0,
  failed_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME     NULL,
  last_login_at   DATETIME     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_keys (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id  INT UNSIGNED NOT NULL,
  label       VARCHAR(120) NOT NULL,
  key_hash    CHAR(64)     NOT NULL UNIQUE,
  key_prefix  CHAR(8)      NOT NULL,
  rate_limit  SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  allowed_origins TEXT     NULL,
  last_used_at DATETIME    NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at  DATETIME     NULL,
  INDEX idx_prefix (key_prefix),
  CONSTRAINT fk_key_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_requests (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  api_key_id INT UNSIGNED NULL,
  endpoint   VARCHAR(120) NOT NULL,
  query      VARCHAR(190) NULL,
  status     SMALLINT UNSIGNED NOT NULL,
  ip_hash    CHAR(64)     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_key_date (api_key_id, created_at),
  INDEX idx_req_date (created_at),
  CONSTRAINT fk_req_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_usage_daily (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  api_key_id INT UNSIGNED NOT NULL,
  day        DATE         NOT NULL,
  endpoint   VARCHAR(120) NOT NULL,
  calls      INT UNSIGNED NOT NULL DEFAULT 0,
  errors     INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_key_day_endpoint (api_key_id, day, endpoint),
  CONSTRAINT fk_usage_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations (première connexion) et réinitialisations de mot de passe, à usage unique
CREATE TABLE IF NOT EXISTS auth_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id INT UNSIGNED NOT NULL,
  purpose    ENUM('invitation','reset') NOT NULL,
  token_hash CHAR(64)     NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  used_at    DATETIME     NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trace des acceptations des conditions : ces lignes ne sont jamais modifiées ni supprimées
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id    INT UNSIGNED NOT NULL,
  terms_version VARCHAR(20)  NOT NULL,
  accepted_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_hash       CHAR(64)     NOT NULL,
  user_agent    VARCHAR(255) NULL,
  CONSTRAINT fk_terms_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
