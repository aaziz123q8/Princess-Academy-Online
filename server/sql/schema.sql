-- ============================================================================
--  Princess Academy Online — MySQL schema
--  Compatible with Hostinger MySQL (InnoDB, utf8mb4). Run once against your DB:
--     mysql -u USER -p DBNAME < server/sql/schema.sql
--  or paste into hPanel → Databases → phpMyAdmin → SQL.
--  utf8mb4 is required so Arabic text and emoji store correctly.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---- Accounts ----
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(20)  NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('player','moderator','admin') NOT NULL DEFAULT 'player',
  locale        ENUM('en','ar') NOT NULL DEFAULT 'en',
  status        ENUM('active','muted','banned') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Character / progression (1:1 with a user for now) ----
CREATE TABLE IF NOT EXISTS characters (
  user_id     BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(24) NOT NULL,
  skin_color  VARCHAR(9)  NOT NULL DEFAULT '#ffd9c0',
  hair_color  VARCHAR(9)  NOT NULL DEFAULT '#5b3a29',
  dress_color VARCHAR(9)  NOT NULL DEFAULT '#ff5fa2',
  level       INT UNSIGNED NOT NULL DEFAULT 1,
  xp          INT UNSIGNED NOT NULL DEFAULT 0,
  xp_max      INT UNSIGNED NOT NULL DEFAULT 100,
  coins       INT UNSIGNED NOT NULL DEFAULT 100,
  gems        INT UNSIGNED NOT NULL DEFAULT 5,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_characters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Owned items (clothes, hairstyles, accessories, furniture, pets) ----
CREATE TABLE IF NOT EXISTS inventory_items (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  item_key   VARCHAR(64) NOT NULL,           -- references a catalog definition
  category   ENUM('clothes','hair','accessory','furniture','pet') NOT NULL,
  equipped   TINYINT(1) NOT NULL DEFAULT 0,
  acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_user_item (user_id, item_key),
  KEY idx_inv_user (user_id),
  CONSTRAINT fk_inv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Friendships (symmetric; one row per pair, lower id first) ----
CREATE TABLE IF NOT EXISTS friendships (
  user_low   BIGINT UNSIGNED NOT NULL,
  user_high  BIGINT UNSIGNED NOT NULL,
  status     ENUM('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
  requested_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_low, user_high),
  KEY idx_friend_high (user_high),
  CONSTRAINT fk_friend_low  FOREIGN KEY (user_low)  REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_friend_high FOREIGN KEY (user_high) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Refresh tokens (hashed, revocable) ----
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,              -- sha256 of the token
  expires_at DATETIME NOT NULL,
  revoked    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_rt_user (user_id),
  KEY idx_rt_hash (token_hash),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Leaderboard snapshot (fashion / XP / events) ----
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  board_key  VARCHAR(32) NOT NULL,           -- 'xp', 'fashion', 'event_2026w27'
  user_id    BIGINT UNSIGNED NOT NULL,
  score      INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (board_key, user_id),
  KEY idx_lb_board_score (board_key, score DESC),
  CONSTRAINT fk_lb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---- Admin / moderation audit log ----
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id   BIGINT UNSIGNED NULL,
  action     VARCHAR(48) NOT NULL,
  target_id  BIGINT UNSIGNED NULL,
  detail     JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
