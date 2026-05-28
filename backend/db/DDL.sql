-- Lumina backend schema
-- -----------------------------------------------------------------------------
-- This file is the clean, fresh-install definition for the PostgreSQL database
-- used by the Express API under backend/routes/*.js. It intentionally avoids
-- migration/backfill ALTER blocks; changes for already-running databases should
-- live in a separate migration path, while this script describes the current
-- desired schema from scratch.
--
-- Frontend connection map:
-- - src/utils/apiClient.ts defines the browser-side API contract.
-- - src/context/UserContext.tsx and auth pages read/write users, sessions,
--   oauth_accounts, email_verifications, and password_reset through /auth and
--   /users endpoints.
-- - ticket dashboards, queue/history pages, and analytics views read tickets,
--   ticket_assignment, ticket_comments, audit_logs, categories, and the
--   admin_workload view through /tickets, /categories, /notifications, and
--   /reports endpoints.

-- pgcrypto supplies gen_random_uuid() for primary keys and crypt()/gen_salt()
-- for development seed passwords below.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Domain enums keep database values aligned with TypeScript union types in
-- src/utils/apiClient.ts. If a value is added here, update the frontend types,
-- validation helpers, and status/role labels at the same time.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_type') THEN
    CREATE TYPE ticket_type AS ENUM ('software', 'bug', 'incident');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('P1', 'P2', 'P3', 'P4');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM (
      'open',
      'assigned',
      'in_progress',
      'resolved',
      'abandoned',
      'on_hold',
      'pending_routing'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_role') THEN
    CREATE TYPE assignment_role AS ENUM ('qa', 'developer');
  END IF;
END $$;

-- Users
-- -----------------------------------------------------------------------------
-- Central account table used by:
-- - /auth/* for login, signup, email verification, Google OAuth, and reset flows.
-- - /users/me for the current-user context, profile setup, avatar upload, and
--   notification preferences.
-- - /users admin endpoints for approvals, directory filtering, role changes,
--   and profile maintenance.
-- Frontend consumers include UserContext, ProtectedRoute, Login/SignUp,
-- OAuthName, Onboarding, AccountSettings, Profile, AdminUsers, and AdminApprovals.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  status user_status NOT NULL,
  email_is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url VARCHAR(255),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  job_title VARCHAR(255),
  department VARCHAR(100),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  name_set BOOLEAN NOT NULL DEFAULT FALSE,
  email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Categories
-- -----------------------------------------------------------------------------
-- Ticket category options shown in CreateTicketModal and used by the admin
-- category API. tickets.category_id is restricted so historical tickets keep a
-- valid category label even if category management is expanded later.
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL
);

-- Tickets
-- -----------------------------------------------------------------------------
-- Core support records behind the ticket queue, ticket history, role dashboards,
-- and closure analytics. metadata stores routing decisions and flexible details
-- that the backend can expose without adding a new relational column for every
-- AI-routing explanation or workflow note.
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type ticket_type NOT NULL,
  priority ticket_priority NOT NULL,
  status ticket_status NOT NULL,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  replication_steps TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ticket assignments
-- -----------------------------------------------------------------------------
-- Tracks the active QA and developer owners for each ticket. The frontend reads
-- these joins as qa_assignee_* and dev_assignee_* fields on ApiTicket, which
-- drive role-specific actions in TicketDetailPanel and the queue/history cards.
CREATE TABLE IF NOT EXISTS ticket_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL,
  assignment_role assignment_role NOT NULL DEFAULT 'developer',
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
-- -----------------------------------------------------------------------------
-- Immutable activity stream for notifications, admin audit views, ticket
-- timelines, and report diagnostics. actor_id is nullable so audit history
-- survives account deletion.
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments
-- -----------------------------------------------------------------------------
-- Conversation thread shown in TicketCommentsPanel. Deletes are soft deletes:
-- body is nulled, deleted_at/deleted_by/deletion_type become a tombstone, and
-- audit_logs records the delete action for ticket activity.
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deletion_type VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id, created_at ASC);

-- OAuth accounts
-- -----------------------------------------------------------------------------
-- Links Google identities to users for GoogleAuthButton and the /auth/google
-- route. The provider_user_id uniqueness prevents one Google account from
-- binding to multiple Lumina users.
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider oauth_provider NOT NULL,
  provider_user_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Email verifications
-- -----------------------------------------------------------------------------
-- Stores link tokens and hashed OTP codes used by VerifyEmailPage,
-- VerifyEmailOtpPage, and resend-verification flows. used_at prevents replay.
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Password resets
-- -----------------------------------------------------------------------------
-- Same token/OTP pattern as email verification, consumed by ForgotPasswordPage
-- and ResetPasswordPage. Tokens remain server-side and only hashes of OTPs are
-- stored.
CREATE TABLE IF NOT EXISTS password_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

-- Sessions
-- -----------------------------------------------------------------------------
-- Server-side session/audit trail created during login. The current frontend
-- stores JWTs locally, while this table gives account settings and audit
-- reporting a durable record of user agent, IP address, and expiry metadata.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT NOT NULL,
  ipaddress TEXT NOT NULL
);

-- Query support for API screens and dashboards. These indexes mirror common
-- filters in src/hooks/useTicketData.ts, src/hooks/useUsersList.ts, the sidebar
-- notification fetch, and admin analytics endpoints.
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower_unique ON categories ((lower(name)));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by ON tickets (submitted_by);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets (category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets (status, priority);
CREATE INDEX IF NOT EXISTS idx_ticket_assignment_active ON ticket_assignment (ticket_id, assigned_to, is_active);

-- Enforce one active QA assignment and one active developer assignment per
-- ticket. Historical inactive rows are preserved for timelines and reports.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_qa_assignment_unique ON ticket_assignment (ticket_id) WHERE is_active AND assignment_role = 'qa';
CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_dev_assignment_unique ON ticket_assignment (ticket_id) WHERE is_active AND assignment_role = 'developer';
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset (user_id, used_at, expires_at);

-- Admin workload view
-- -----------------------------------------------------------------------------
-- Summarizes open assignment load for AI routing and the admin workload chart.
-- Backend consumers: ticketRouting.getAdminWorkloads and GET /tickets/admin/workload.
-- Frontend consumers: useAdminWorkload, role dashboards, and routing controls.
CREATE OR REPLACE VIEW admin_workload AS
SELECT
  u.id AS admin_id,
  u.email,
  u.first_name,
  u.last_name,
  COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_1_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_2_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_3_count,
  COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)::int AS priority_4_count,
  COALESCE(COUNT(CASE WHEN t.status IN ('open', 'assigned', 'in_progress') THEN 1 END), 0)::int AS total_open,
  (
    COALESCE(SUM(CASE WHEN t.priority = 'P1' AND t.status IN ('open', 'assigned', 'in_progress') THEN 3 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P2' AND t.status IN ('open', 'assigned', 'in_progress') THEN 2 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P3' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0) +
    COALESCE(SUM(CASE WHEN t.priority = 'P4' AND t.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END), 0)
  )::int AS load_score
FROM users u
LEFT JOIN ticket_assignment ta
  ON ta.assigned_to = u.id
 AND ta.is_active = TRUE
LEFT JOIN tickets t
  ON t.id = ta.ticket_id
WHERE u.role = 'admin'
  AND u.status = 'active'
  AND NOT (
    lower(u.email) = lower('lumina.ai@lumina.test')
    OR lower(u.email) LIKE 'pending.%@lumina.test'
    OR lower(u.first_name) = 'pending'
    OR (lower(u.first_name) = 'lumina' AND lower(u.last_name) = 'ai')
  )
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- =============================================================================
-- BASE DEVELOPMENT DATA
-- =============================================================================
-- These records are schema-adjacent demo fixtures required by ticket seed data.
-- Ticket volume/history lives in backend/db/seed.sql.

-- System / special accounts
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'lumina.ai@lumina.test', NULL,
   'Lumina', 'AI', 'user', 'suspended', TRUE, FALSE, NULL, NULL, NULL, FALSE, NULL, NULL, NOW() - INTERVAL '180 days', NULL),

  ('00000000-0000-0000-0000-000000000002', 'pending.user@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Pending', 'User', 'user', 'pending', FALSE, FALSE, NULL, NULL, NULL, FALSE, NULL, NULL, NOW() - INTERVAL '3 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- HR & Management
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'ynrdevs@gmail.com',
   crypt('Password1!', gen_salt('bf')),
   'Nachiketh', 'Reddy', 'admin', 'active', TRUE, TRUE, 'HR Director', 'HR', NULL, TRUE, NULL, NULL, NOW() - INTERVAL '120 days', NOW() - INTERVAL '1 hour'),

  ('00000000-0000-0000-0000-000000000011', 'david.kim@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'David', 'Kim', 'admin', 'active', TRUE, TRUE, 'IT Service Delivery Manager', 'Managers', NULL, TRUE, NULL, NULL, NOW() - INTERVAL '118 days', NOW() - INTERVAL '3 hours'),

  ('00000000-0000-0000-0000-000000000017', 'rachel.adams@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Rachel', 'Adams', 'admin', 'active', TRUE, TRUE, 'Product Manager', 'Managers', NULL, TRUE, NULL, NULL, NOW() - INTERVAL '112 days', NOW() - INTERVAL '7 hours'),

  ('00000000-0000-0000-0000-000000000018', 'andrew.chen@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Andrew', 'Chen', 'admin', 'active', TRUE, TRUE, 'Project Manager', 'Managers', NULL, TRUE, NULL, NULL, NOW() - INTERVAL '109 days', NOW() - INTERVAL '9 hours')
ON CONFLICT (id) DO NOTHING;

-- Developers
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000012', 'alex.johnson@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Alex', 'Johnson', 'admin', 'active', TRUE, TRUE, 'Senior Software Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '60 days', NOW() - INTERVAL '115 days', NOW() - INTERVAL '2 hours'),

  ('00000000-0000-0000-0000-000000000013', 'maria.garcia@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Maria', 'Garcia', 'admin', 'active', TRUE, TRUE, 'Software Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '45 days', NOW() - INTERVAL '110 days', NOW() - INTERVAL '5 hours'),

  ('00000000-0000-0000-0000-000000000014', 'james.wilson@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'James', 'Wilson', 'admin', 'active', TRUE, TRUE, 'Full Stack Developer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '30 days', NOW() - INTERVAL '105 days', NOW() - INTERVAL '1 day'),

  ('00000000-0000-0000-0000-000000000023', 'liam.patel@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Liam', 'Patel', 'admin', 'active', TRUE, TRUE, 'Backend Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '26 days', NOW() - INTERVAL '102 days', NOW() - INTERVAL '12 hours'),

  ('00000000-0000-0000-0000-000000000024', 'sofia.martinez@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Sofia', 'Martinez', 'admin', 'active', TRUE, TRUE, 'Frontend Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '24 days', NOW() - INTERVAL '99 days', NOW() - INTERVAL '14 hours')
ON CONFLICT (id) DO NOTHING;

-- QA
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000015', 'priya.sharma@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Priya', 'Sharma', 'admin', 'active', TRUE, TRUE, 'QA Lead', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '50 days', NOW() - INTERVAL '100 days', NOW() - INTERVAL '4 hours'),

  ('00000000-0000-0000-0000-000000000016', 'tom.brown@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Tom', 'Brown', 'admin', 'active', TRUE, TRUE, 'QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '20 days', NOW() - INTERVAL '95 days', NOW() - INTERVAL '6 hours'),

  ('00000000-0000-0000-0000-000000000025', 'nina.rao@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Nina', 'Rao', 'admin', 'active', TRUE, TRUE, 'QA Analyst', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '18 days', NOW() - INTERVAL '93 days', NOW() - INTERVAL '11 hours'),

  ('00000000-0000-0000-0000-000000000026', 'omar.hassan@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Omar', 'Hassan', 'admin', 'active', TRUE, TRUE, 'Senior QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '16 days', NOW() - INTERVAL '91 days', NOW() - INTERVAL '13 hours'),

  ('00000000-0000-0000-0000-000000000027', 'grace.park@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Grace', 'Park', 'admin', 'active', TRUE, TRUE, 'Automation QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '14 days', NOW() - INTERVAL '89 days', NOW() - INTERVAL '15 hours')
ON CONFLICT (id) DO NOTHING;

-- Regular users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'emily.davis@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Emily', 'Davis', 'user', 'active', TRUE, TRUE, 'Product Designer', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '40 days', NOW() - INTERVAL '90 days', NOW() - INTERVAL '8 hours'),

  ('00000000-0000-0000-0000-000000000021', 'michael.lee@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Michael', 'Lee', 'user', 'active', TRUE, TRUE, 'Marketing Coordinator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '35 days', NOW() - INTERVAL '85 days', NOW() - INTERVAL '10 hours'),

  ('00000000-0000-0000-0000-000000000022', 'jane.doe@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Jane', 'Doe', 'user', 'suspended', TRUE, TRUE, 'former employee', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '90 days', NOW() - INTERVAL '80 days', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, description, created_by, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Desktop & Hardware',
   'Desktops, laptops, monitors, docks, and peripheral hardware issues',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000002', 'Software & Applications',
   'Operating system, productivity tools, IDE, and business application support',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000003', 'Network & Connectivity',
   'Wi-Fi, VPN, wired networking, firewall, and remote access issues',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000004', 'Security & Access',
   'Authentication, authorization, certificate, and security incident reports',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000005', 'Email & Collaboration',
   'Email delivery, calendar, Slack, Teams, Zoom, and document sharing',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000006', 'Account & Identity',
   'Account provisioning, password reset, MFA, role changes, and onboarding',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000007', 'Mobile Device',
   'Company phone, tablet, MDM, and mobile application support',
   '00000000-0000-0000-0000-000000000011', TRUE),

  ('10000000-0000-0000-0000-000000000008', 'Printer & Scanner',
   'Network printers, local printers, multi-function devices, and scan-to-email',
   '00000000-0000-0000-0000-000000000011', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, created_at)
VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'google', 'google-oauth2|117894567890123456789',
   NOW() - INTERVAL '40 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sessions (id, user_id, session_token, expires_at, created_at, user_agent, ipaddress)
VALUES
  ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'seed-session-hr-001', NOW() + INTERVAL '7 days', NOW() - INTERVAL '1 hour', 'Chrome on macOS', '127.0.0.1'),
  ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'seed-session-hr-002', NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 days', 'Chrome on macOS', '127.0.0.1'),
  ('90000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'seed-session-hr-003', NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days', 'Safari on macOS', '127.0.0.1'),
  ('90000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012', 'seed-session-dev-001', NOW() + INTERVAL '7 days', NOW() - INTERVAL '2 hours', 'Chrome on macOS', '127.0.0.1'),
  ('90000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000013', 'seed-session-dev-002', NOW() + INTERVAL '7 days', NOW() - INTERVAL '5 hours', 'Firefox on Windows', '127.0.0.1'),
  ('90000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000015', 'seed-session-qa-001', NOW() + INTERVAL '7 days', NOW() - INTERVAL '4 hours', 'Chrome on Windows', '127.0.0.1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_logs (id, actor_id, action, metadata, created_at)
VALUES
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'user_logged_in',
   '{"method": "password", "user_agent": "Chrome on macOS", "ipaddress": "127.0.0.1"}', NOW() - INTERVAL '1 hour'),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'user_logged_in',
   '{"method": "password", "user_agent": "Chrome on macOS", "ipaddress": "127.0.0.1"}', NOW() - INTERVAL '8 days'),
  ('91000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', 'user_logged_in',
   '{"method": "password", "user_agent": "Safari on macOS", "ipaddress": "127.0.0.1"}', NOW() - INTERVAL '21 days'),
  ('91000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012', 'user_logged_in',
   '{"method": "password", "user_agent": "Chrome on macOS", "ipaddress": "127.0.0.1"}', NOW() - INTERVAL '2 hours'),
  ('91000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000015', 'user_logged_in',
   '{"method": "password", "user_agent": "Chrome on Windows", "ipaddress": "127.0.0.1"}', NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;
