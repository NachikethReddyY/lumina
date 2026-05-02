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
CREATE TYPE ticket_status   AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed', 'on_hold');

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
