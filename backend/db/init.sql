CREATE EXTENSION IF NOT EXISTS pgcrypto; -- enables gen_random_uuid()

CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             VARCHAR(255) NOT NULL UNIQUE,
    password_hash     VARCHAR(255),
    first_name        VARCHAR(255) NOT NULL,
    last_name         VARCHAR(255) NOT NULL,
    role              user_role NOT NULL,
    status            user_status NOT NULL,
    email_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url        VARCHAR(255),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at     TIMESTAMP
);

-- 2. categories
CREATE TABLE categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_by  UUID         NOT NULL REFERENCES users(id),
    is_active   BOOLEAN      NOT NULL
);

-- 3. tickets
CREATE TYPE ticket_type     AS ENUM ('hardware', 'software', 'bug');
CREATE TYPE ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE ticket_status   AS ENUM ('pending_routing', 'open', 'assigned', 'in_progress', 'resolved', 'closed', 'on_hold');

CREATE TABLE tickets (
    id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title             VARCHAR(255)    NOT NULL,
    description       TEXT            NOT NULL,
    category_id       UUID            NOT NULL REFERENCES categories(id),
    type              ticket_type     NOT NULL,
    priority          ticket_priority NOT NULL,
    status            ticket_status   NOT NULL,
    submitted_by      UUID            NOT NULL REFERENCES users(id),
    replication_steps TEXT,
    routing_metadata  JSONB,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. ticket_assignment
CREATE TABLE ticket_assignment (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID      NOT NULL REFERENCES tickets(id),
    assigned_to UUID      NOT NULL REFERENCES users(id),
    assigned_by UUID      NOT NULL REFERENCES users(id),
    is_active   BOOLEAN   NOT NULL,
    assigned_at TIMESTAMP NOT NULL
);

-- 5. satisfaction_ratings
CREATE TABLE satisfaction_ratings (
    id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID    NOT NULL UNIQUE REFERENCES tickets(id),
    rated_by  UUID    NOT NULL REFERENCES users(id),
    rating    INTEGER NOT NULL,
    comment   TEXT
);

-- 6. oauth_accounts
CREATE TYPE oauth_provider AS ENUM ('google');

CREATE TABLE oauth_accounts (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID          NOT NULL REFERENCES users(id),
    provider         oauth_provider NOT NULL,
    provider_user_id VARCHAR(255)  NOT NULL UNIQUE,
    access_token     TEXT,
    refresh_token    TEXT,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. sessions
CREATE TABLE sessions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users(id),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at    TIMESTAMP    NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent    TEXT         NOT NULL,
    ipadress      TEXT         NOT NULL
);

-- 8. password_reset
CREATE TABLE password_reset (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id),
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used_at    TIMESTAMP
);

-- 9. email_verifications
CREATE TABLE email_verifications (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id),
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used_at    TIMESTAMP
);

-- 10. audit_logs
CREATE TABLE audit_logs (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id   UUID         NOT NULL REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    metadata   JSONB        NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

---
-- SEED DATA
---

-- Super Admin (1)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified)
VALUES ('super.admin@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Super', 'Admin', 'super_admin', 'active', true);

-- Admins (5)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified)
VALUES
  ('alex.chen@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Alex', 'Chen', 'admin', 'active', true),
  ('maria.garcia@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Maria', 'Garcia', 'admin', 'active', true),
  ('james.wilson@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'James', 'Wilson', 'admin', 'active', true),
  ('priya.patel@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Priya', 'Patel', 'admin', 'active', true),
  ('david.kim@lumina.io', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'David', 'Kim', 'admin', 'active', true);

-- Users (4 - user will add 1 more manually for OAuth testing)
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified)
VALUES
  ('john.doe@example.com', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'John', 'Doe', 'user', 'active', true),
  ('sarah.smith@example.com', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Sarah', 'Smith', 'user', 'active', true),
  ('michael.brown@example.com', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Michael', 'Brown', 'user', 'active', true),
  ('emily.johnson@example.com', '$2b$12$uVFF2MCs2HOTh9TCq1BDOuhMMr3cn9nr2ZbItNOGUFlXTKvhaVNlm', 'Emily', 'Johnson', 'user', 'active', true);

-- Categories (for tickets)
INSERT INTO categories (name, description, created_by, is_active)
SELECT
  cat.name,
  cat.description,
  (SELECT id FROM users WHERE email = 'super.admin@lumina.io' LIMIT 1),
  true
FROM (VALUES
  ('Hardware Issues', 'Laptop, desktop, peripherals, network'),
  ('Software Issues', 'Application bugs, crashes, compatibility'),
  ('Network & Connectivity', 'WiFi, VPN, connection drops'),
  ('Account & Access', 'Login issues, permissions, account recovery'),
  ('Performance', 'Slow systems, high CPU/memory usage'),
  ('Data & Storage', 'Backup, recovery, file sync issues'),
  ('Integration Issues', 'Third-party app integration problems'),
  ('General Support', 'Other IT support requests')
) AS cat(name, description);

ñ