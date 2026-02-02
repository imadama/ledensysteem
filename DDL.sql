-- DDL.sql (MySQL 8)
-- Afgestemd op de Laravel migraties in `backend/database/migrations/`.
-- Let op: i.v.m. een circulaire relatie (users <-> members) wordt een deel via ALTER TABLE toegevoegd.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS subscription_audit_logs;
DROP TABLE IF EXISTS member_subscriptions;
DROP TABLE IF EXISTS member_contribution_histories;
DROP TABLE IF EXISTS member_contribution_records;
DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS organisation_stripe_connections;
DROP TABLE IF EXISTS organisation_subscriptions;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS member_invitations;
DROP TABLE IF EXISTS role_user;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS stripe_events;
DROP TABLE IF EXISTS personal_access_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS organisations;

SET FOREIGN_KEY_CHECKS = 1;

-- organisations
CREATE TABLE organisations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(255) NULL,
  type VARCHAR(255) NOT NULL,
  city VARCHAR(255) NULL,
  country VARCHAR(255) NULL,
  contact_email VARCHAR(255) NOT NULL,
  status ENUM('new','active','blocked') NOT NULL DEFAULT 'new',
  billing_status VARCHAR(255) NOT NULL DEFAULT 'ok',
  billing_note TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY organisations_subdomain_unique (subdomain),
  KEY organisations_subdomain_index (subdomain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- users basis (zonder organisation_id/member_id FK om volgorde te bewaken)
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  password VARCHAR(255) NOT NULL,
  remember_token VARCHAR(100) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'active',
  organisation_id BIGINT UNSIGNED NULL,
  member_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  UNIQUE KEY users_member_id_unique (member_id),
  KEY users_organisation_id_index (organisation_id),
  CONSTRAINT users_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- members (zonder sepa_subscription_setup_by FK, die wordt later toegevoegd)
CREATE TABLE members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisation_id BIGINT UNSIGNED NOT NULL,
  member_number VARCHAR(255) NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  gender CHAR(1) NOT NULL,
  birth_date DATE NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(255) NULL,
  street_address VARCHAR(255) NULL,
  postal_code VARCHAR(255) NULL,
  city VARCHAR(255) NULL,
  iban VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'active',
  contribution_amount DECIMAL(10,2) NULL,
  contribution_frequency VARCHAR(255) NULL,
  contribution_start_date DATE NULL,
  contribution_note TEXT NULL,
  sepa_subscription_enabled TINYINT(1) NOT NULL DEFAULT 0,
  sepa_subscription_iban VARCHAR(255) NULL,
  sepa_mandate_stripe_id VARCHAR(255) NULL,
  sepa_subscription_notes TEXT NULL,
  sepa_subscription_setup_at TIMESTAMP NULL,
  sepa_subscription_setup_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY members_organisation_member_number_index (organisation_id, member_number),
  KEY members_status_index (status),
  CONSTRAINT members_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- cirkel sluiten: users.member_id -> members.id (FK) + members.sepa_subscription_setup_by -> users.id (FK)
ALTER TABLE users
  ADD CONSTRAINT users_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE SET NULL;

ALTER TABLE members
  ADD CONSTRAINT members_sepa_subscription_setup_by_foreign
    FOREIGN KEY (sepa_subscription_setup_by) REFERENCES users(id)
    ON DELETE SET NULL;

-- roles + role_user (M:N)
CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY roles_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_user (
  role_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (role_id, user_id),
  CONSTRAINT role_user_role_id_foreign
    FOREIGN KEY (role_id) REFERENCES roles(id)
    ON DELETE CASCADE,
  CONSTRAINT role_user_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- member_invitations
CREATE TABLE member_invitations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY member_invitations_token_unique (token),
  CONSTRAINT member_invitations_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- platform_settings
CREATE TABLE platform_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY platform_settings_key_unique (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- plans
CREATE TABLE plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  billing_interval VARCHAR(255) NOT NULL DEFAULT 'month',
  monthly_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- organisation_subscriptions
CREATE TABLE organisation_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisation_id BIGINT UNSIGNED NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  latest_checkout_session_id VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'trial',
  metadata JSON NULL,
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  cancel_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  CONSTRAINT organisation_subscriptions_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE CASCADE,
  CONSTRAINT organisation_subscriptions_plan_id_foreign
    FOREIGN KEY (plan_id) REFERENCES plans(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- organisation_stripe_connections
CREATE TABLE organisation_stripe_connections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisation_id BIGINT UNSIGNED NOT NULL,
  stripe_account_id VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'none',
  activated_at TIMESTAMP NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY organisation_stripe_connections_organisation_id_unique (organisation_id),
  CONSTRAINT organisation_stripe_connections_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- payment_transactions
CREATE TABLE payment_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisation_id BIGINT UNSIGNED NULL,
  member_id BIGINT UNSIGNED NULL,
  type VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(255) NOT NULL DEFAULT 'EUR',
  status VARCHAR(255) NOT NULL DEFAULT 'created',
  failure_reason VARCHAR(255) NULL,
  retry_count INT NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMP NULL,
  failure_metadata JSON NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  stripe_checkout_session_id VARCHAR(255) NULL,
  metadata JSON NULL,
  occurred_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  CONSTRAINT payment_transactions_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE SET NULL,
  CONSTRAINT payment_transactions_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- member_contribution_records
CREATE TABLE member_contribution_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  period DATE NULL,
  amount DECIMAL(10,2) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'unknown',
  payment_transaction_id BIGINT UNSIGNED NULL,
  note TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  CONSTRAINT member_contribution_records_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE,
  CONSTRAINT member_contribution_records_payment_transaction_id_foreign
    FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- member_contribution_histories
CREATE TABLE member_contribution_histories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  old_amount DECIMAL(10,2) NULL,
  old_frequency VARCHAR(255) NULL,
  old_start_date DATE NULL,
  old_note TEXT NULL,
  new_amount DECIMAL(10,2) NULL,
  new_frequency VARCHAR(255) NULL,
  new_start_date DATE NULL,
  new_note TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY member_contribution_histories_member_id_index (member_id),
  KEY member_contribution_histories_changed_by_index (changed_by),
  CONSTRAINT member_contribution_histories_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE,
  CONSTRAINT member_contribution_histories_changed_by_foreign
    FOREIGN KEY (changed_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- member_subscriptions
CREATE TABLE member_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  member_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  stripe_customer_id VARCHAR(255) NULL,
  stripe_subscription_id VARCHAR(255) NULL,
  latest_checkout_session_id VARCHAR(255) NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMP NULL,
  current_period_end TIMESTAMP NULL,
  cancel_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY member_subscriptions_member_id_index (member_id),
  KEY member_subscriptions_stripe_subscription_id_index (stripe_subscription_id),
  CONSTRAINT member_subscriptions_member_id_foreign
    FOREIGN KEY (member_id) REFERENCES members(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- subscription_audit_logs
CREATE TABLE subscription_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organisation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  action_type VARCHAR(255) NOT NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  description TEXT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY subscription_audit_logs_organisation_id_index (organisation_id),
  KEY subscription_audit_logs_action_type_index (action_type),
  KEY subscription_audit_logs_created_at_index (created_at),
  CONSTRAINT subscription_audit_logs_organisation_id_foreign
    FOREIGN KEY (organisation_id) REFERENCES organisations(id)
    ON DELETE CASCADE,
  CONSTRAINT subscription_audit_logs_user_id_foreign
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- overige tabellen uit migraties (optioneel, maar opgenomen voor volledigheid)
CREATE TABLE password_reset_tokens (
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NULL,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
  id VARCHAR(255) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  payload LONGTEXT NOT NULL,
  last_activity INT NOT NULL,
  PRIMARY KEY (id),
  KEY sessions_user_id_index (user_id),
  KEY sessions_last_activity_index (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE personal_access_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT UNSIGNED NOT NULL,
  name TEXT NOT NULL,
  token VARCHAR(64) NOT NULL,
  abilities TEXT NULL,
  last_used_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY personal_access_tokens_token_unique (token),
  KEY personal_access_tokens_tokenable_type_tokenable_id_index (tokenable_type, tokenable_id),
  KEY personal_access_tokens_expires_at_index (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE stripe_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_id VARCHAR(255) NOT NULL,
  type VARCHAR(255) NULL,
  payload JSON NULL,
  processed_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  UNIQUE KEY stripe_events_event_id_unique (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

