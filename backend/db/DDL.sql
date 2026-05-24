CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
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
      'closed',
      'on_hold',
      'pending_routing'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oauth_provider') THEN
    CREATE TYPE oauth_provider AS ENUM ('google');
  END IF;
END $$;

-- Users
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Upgrade path for databases created before columns were folded into CREATE TABLE above.
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name_set BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: mark existing users with real names as having completed the name step.
-- Placeholders: OAuth (Google/New + User) and email signup (User + New).
UPDATE users SET name_set = TRUE
WHERE NOT (
    (lower(last_name) = 'user' AND lower(first_name) IN ('new', 'google'))
    OR (lower(last_name) = 'new' AND lower(first_name) = 'user')
  )
  AND first_name <> ''
  AND last_name <> ''
  AND name_set = FALSE;

-- Correct users who were incorrectly marked name_set from the User/New placeholder.
UPDATE users SET name_set = FALSE
WHERE name_set = TRUE
  AND (
    (lower(last_name) = 'user' AND lower(first_name) IN ('new', 'google'))
    OR (lower(last_name) = 'new' AND lower(first_name) = 'user')
  );

-- Migrate: remove super_admin role, convert existing super_admin users to admin.
UPDATE users SET role = 'admin'::user_role WHERE role = 'super_admin'::user_role;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND enum_range(NULL::user_role) @> ARRAY['super_admin']::text[]) THEN
    ALTER TYPE user_role RENAME TO user_role_old;
    CREATE TYPE user_role AS ENUM ('user', 'admin');
    ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role;
    DROP TYPE user_role_old;
  END IF;
END $$;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  type ticket_type NOT NULL,
  priority ticket_priority NOT NULL,
  status ticket_status NOT NULL,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  replication_steps TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Ticket assignments
CREATE TABLE IF NOT EXISTS ticket_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Satisfaction ratings (1:1 per ticket)
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL,
  comment TEXT
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ticket comments
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments (ticket_id, created_at ASC);

-- Chat conversations (one per user-to-support thread)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_conv_user ON chat_conversations (user_id);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT,
  image_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages (conversation_id, created_at ASC);

-- OAuth accounts
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
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- Password resets
CREATE TABLE IF NOT EXISTS password_reset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  otp_hash TEXT,
  otp_expires_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP
);

ALTER TABLE password_reset ADD COLUMN IF NOT EXISTS otp_hash TEXT;
ALTER TABLE password_reset ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT NOT NULL,
  ipaddress TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower_unique ON categories ((lower(name)));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_tickets_submitted_by ON tickets (submitted_by);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets (category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets (status, priority);
CREATE INDEX IF NOT EXISTS idx_ticket_assignment_active ON ticket_assignment (ticket_id, assigned_to, is_active);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset (user_id, used_at, expires_at);

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

-- Seed users for local development and demos.
INSERT INTO users (
  email, password_hash, first_name, last_name, role, status, email_is_verified,
  onboarding_completed, name_set, approved_at, job_title, department
)
VALUES (
  lower('ynrdevs@gmail.com'),
  crypt('Nachiketh1', gen_salt('bf')),
  'Nachiketh',
  'Reddy',
  'admin'::user_role,
  'active'::user_status,
  TRUE,
  TRUE,
  TRUE,
  NOW(),
  'HR',
  'HR'
)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    email_is_verified = EXCLUDED.email_is_verified,
    onboarding_completed = EXCLUDED.onboarding_completed,
    name_set = EXCLUDED.name_set,
    approved_at = COALESCE(users.approved_at, NOW()),
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department;

INSERT INTO users (
  email, password_hash, first_name, last_name, role, status, email_is_verified,
  onboarding_completed, name_set, approved_by, approved_at, job_title, department
)
SELECT
  lower(seed.email),
  crypt(seed.password, gen_salt('bf')),
  seed.first_name,
  seed.last_name,
  seed.role::user_role,
  seed.status::user_status,
  seed.email_is_verified,
  TRUE,
  TRUE,
  (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')),
  CASE WHEN seed.status = 'active' THEN NOW() ELSE NULL END,
  seed.job_title,
  seed.department
FROM (
  VALUES
    ('admin.platform@lumina.test', 'Testpass1', 'Harper', 'Platform', 'user', 'active', TRUE, 'Platform / Infrastructure Engineer', 'Developers'),
    ('admin.software@lumina.test', 'Testpass1', 'Sage', 'Software', 'user', 'active', TRUE, 'Software Engineer / Developer', 'Developers'),
    ('admin.bugs@lumina.test', 'Testpass1', 'Bianca', 'Bugs', 'user', 'active', TRUE, 'QA Engineer / Test Engineer', 'QA'),
    ('admin.ops@lumina.test', 'Testpass1', 'Opal', 'Ops', 'user', 'active', TRUE, 'DevOps / Site Reliability Engineer', 'Developers'),
    ('admin.qa@lumina.test', 'Testpass1', 'Quinn', 'Assurance', 'user', 'active', TRUE, 'Automation Engineer', 'QA'),
    ('lumina.ai@lumina.test', 'Testpass1', 'Lumina', 'AI', 'admin', 'active', TRUE, 'Release Manager', 'QA'),
    ('alice.user@lumina.test', 'Testpass1', 'Alice', 'User', 'user', 'active', TRUE, 'Software Engineer / Developer', 'Developers'),
    ('qa.tester@lumina.test', 'Testpass1', 'Taylor', 'Tester', 'user', 'active', TRUE, 'QA Engineer / Test Engineer', 'QA'),
    ('qa.auto@lumina.test', 'Testpass1', 'Jordan', 'Auto', 'user', 'active', TRUE, 'Automation Engineer', 'QA'),
    ('bob.user@lumina.test', 'Testpass1', 'Bob', 'User', 'user', 'active', TRUE, 'Product Designer / UX Designer', 'QA'),
    ('carol.user@lumina.test', 'Testpass1', 'Carol', 'User', 'user', 'active', TRUE, 'Security Engineer / AppSec', 'QA'),
    ('dan.user@lumina.test', 'Testpass1', 'Dan', 'User', 'user', 'active', TRUE, 'Architect', 'Developers'),
    ('eve.user@lumina.test', 'Testpass1', 'Eve', 'Owner', 'admin', 'active', TRUE, 'Product Owner', 'Managers'),
    ('manager.priya@lumina.test', 'Testpass1', 'Priya', 'Shah', 'admin', 'active', TRUE, 'Product Manager', 'Managers'),
    ('manager.ian@lumina.test', 'Testpass1', 'Ian', 'Brooks', 'admin', 'active', TRUE, 'Program / Project Manager', 'Managers'),
    ('pending.user1@lumina.test', 'Testpass1', 'Pending', 'UserOne', 'user', 'pending', TRUE, 'Tech Lead / Lead Engineer', 'Developers'),
    ('pending.user2@lumina.test', 'Testpass1', 'Pending', 'UserTwo', 'user', 'pending', TRUE, 'UX Researcher', 'QA'),
    ('pending.user3@lumina.test', 'Testpass1', 'Pending', 'UserThree', 'user', 'pending', TRUE, 'Content Designer / UX Writer', 'QA'),
    ('pending.admin1@lumina.test', 'Testpass1', 'Pending', 'AdminOne', 'admin', 'pending', TRUE, 'Program / Project Manager', 'Managers'),
    ('pending.admin2@lumina.test', 'Testpass1', 'Pending', 'AdminTwo', 'admin', 'pending', TRUE, 'Product Owner', 'Managers')
) AS seed(email, password, first_name, last_name, role, status, email_is_verified, job_title, department)
ON CONFLICT (email) DO UPDATE
SET first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    email_is_verified = EXCLUDED.email_is_verified,
    onboarding_completed = EXCLUDED.onboarding_completed,
    name_set = EXCLUDED.name_set,
    approved_by = EXCLUDED.approved_by,
    approved_at = COALESCE(users.approved_at, EXCLUDED.approved_at),
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department;

INSERT INTO categories (name, description, created_by, is_active)
SELECT *
FROM (
  SELECT 'Platform & Infrastructure', 'Production incidents, deployments, and cloud infrastructure', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
  UNION ALL
  SELECT 'Software Support', 'Application access, integrations, and configuration help', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
  UNION ALL
  SELECT 'Bug Reports', 'Crashes, defects, and reproducible product issues', (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com')), TRUE
) AS seeded_categories(name, description, created_by, is_active)
ON CONFLICT DO NOTHING;

-- Seed tickets: 
--   resolved/closed tickets → have final assignment + audit trail
--   active tickets (assigned/in_progress) → assigned to real admin directly
--   pending_routing tickets → staged with Lumina AI, left for routing engine
INSERT INTO tickets (
  title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata, created_at
)
SELECT
  seed.title,
  seed.description,
  c.id,
  seed.type::ticket_type,
  seed.priority::ticket_priority,
  seed.status::ticket_status,
  u.id,
  seed.replication_steps,
  seed.metadata::jsonb,
  NOW() - (seed.age_days || ' days')::interval
FROM (
  VALUES
    -- ✅ RESOLVED / CLOSED (3 tickets — complete lifecycle with audit trail)
    ('Kubernetes pod crash loop', 'Checkout service pods restart every 30 seconds in staging.', 'Platform & Infrastructure', 'incident', 'P3', 'resolved', 'dan.user@lumina.test', 'kubectl describe pod checkout-api in staging.', '{"source":"seed"}', 5),
    ('Notification emails delayed', 'Password reset emails arrive after 15 minutes.', 'Software Support', 'software', 'P2', 'closed', 'bob.user@lumina.test', 'Triggered from forgot password page.', '{"source":"seed"}', 4),
    ('SSO callback loop', 'Logging in with SSO keeps redirecting back to the login page.', 'Software Support', 'software', 'P1', 'resolved', 'eve.user@lumina.test', 'Happens in Chrome and Edge.', '{"source":"seed"}', 3),
    -- 🟢 ACTIVE — assigned / in_progress (6 tickets — assigned to real admins)
    ('API latency spike in production', 'P95 response time doubled after the latest API release.', 'Platform & Infrastructure', 'incident', 'P2', 'assigned', 'alice.user@lumina.test', 'Open Grafana dashboard and compare last 24h.', '{"source":"seed"}', 2),
    ('VPN login blocked', 'The VPN rejects my password after the latest reset.', 'Software Support', 'software', 'P1', 'in_progress', 'bob.user@lumina.test', 'Open VPN client and attempt login.', '{"source":"seed"}', 1),
    ('App crashes on startup', 'The app closes instantly after showing the splash screen.', 'Bug Reports', 'bug', 'P1', 'assigned', 'carol.user@lumina.test', 'Launch app on Windows 11 after fresh install.', '{"source":"seed"}', 1),
    ('Reporting export timeout', 'CSV export times out after around 30 seconds.', 'Software Support', 'software', 'P2', 'assigned', 'eve.user@lumina.test', 'Run export from finance dashboard.', '{"source":"seed"}', 2),
    ('Search results missing records', 'Two recent tickets do not appear in search results.', 'Bug Reports', 'bug', 'P2', 'in_progress', 'carol.user@lumina.test', 'Search by ticket title after creating a ticket.', '{"source":"seed"}', 1),
    ('Mobile UI overlaps buttons', 'Action buttons overlap on iPhone Safari.', 'Bug Reports', 'bug', 'P3', 'in_progress', 'dan.user@lumina.test', 'Open settings on iPhone 14.', '{"source":"seed"}', 1),
    -- 🟡 PENDING ROUTING — staged with Lumina AI, waiting for routing engine (6 tickets)
    ('Production outage after deploy', 'Users cannot log in after v2.4.1 was deployed to production.', 'Platform & Infrastructure', 'incident', 'P1', 'pending_routing', 'alice.user@lumina.test', 'Rollback deploy and check error logs.', '{"source":"seed","routing_intent":"needs_immediate_assignment"}', 0),
    ('Redis cache cluster unreachable', 'Application cannot connect to Redis after maintenance window.', 'Platform & Infrastructure', 'incident', 'P3', 'pending_routing', 'dan.user@lumina.test', 'Verify Redis endpoint and TLS certs.', '{"source":"seed"}', 0),
    ('Attachment upload fails', 'PNG attachments fail with a 500 error.', 'Bug Reports', 'bug', 'P2', 'pending_routing', 'alice.user@lumina.test', 'Upload 2MB PNG to a new ticket.', '{"source":"seed"}', 0),
    ('License activation stuck', 'Activation spinner never completes for a desktop tool.', 'Software Support', 'software', 'P3', 'pending_routing', 'carol.user@lumina.test', 'Click activate after entering key.', '{"source":"seed"}', 0),
    ('Webhook delivery retry backlog', 'Partner webhooks are queuing and not delivering within SLA.', 'Software Support', 'software', 'P4', 'pending_routing', 'eve.user@lumina.test', 'Inspect webhook worker logs and queue depth.', '{"source":"seed"}', 0),
    ('Staging environment config drift', 'Staging API returns different schema than documented OpenAPI spec.', 'Software Support', 'software', 'P4', 'pending_routing', 'bob.user@lumina.test', 'Compare staging vs production env vars.', '{"source":"seed"}', 0)
) AS seed(title, description, category_name, type, priority, status, submitter_email, replication_steps, metadata, age_days)
JOIN categories c ON lower(c.name) = lower(seed.category_name)
JOIN users u ON u.email = lower(seed.submitter_email)
WHERE NOT EXISTS (SELECT 1 FROM tickets);

-- Assign resolved/closed tickets to the final admin who resolved them.
INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  t.id,
  assignee.id,
  approver.id,
  TRUE,
  t.created_at + interval '2 days'
FROM tickets t
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
JOIN users assignee ON assignee.email = lower(
  CASE t.title
    WHEN 'Kubernetes pod crash loop' THEN 'admin.platform@lumina.test'
    WHEN 'Notification emails delayed' THEN 'admin.software@lumina.test'
    WHEN 'SSO callback loop' THEN 'admin.ops@lumina.test'
  END
)
WHERE t.title IN ('Kubernetes pod crash loop', 'Notification emails delayed', 'SSO callback loop')
  AND t.status IN ('resolved', 'closed');

-- Assign active tickets to the best-fit admin by skill area.
INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  t.id,
  assignee.id,
  approver.id,
  TRUE,
  t.created_at + interval '1 hour'
FROM tickets t
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
JOIN users assignee ON assignee.email = lower(
  CASE t.title
    WHEN 'API latency spike in production' THEN 'admin.platform@lumina.test'
    WHEN 'VPN login blocked' THEN 'admin.software@lumina.test'
    WHEN 'App crashes on startup' THEN 'admin.bugs@lumina.test'
    WHEN 'Reporting export timeout' THEN 'admin.software@lumina.test'
    WHEN 'Search results missing records' THEN 'admin.bugs@lumina.test'
    WHEN 'Mobile UI overlaps buttons' THEN 'admin.bugs@lumina.test'
  END
)
WHERE t.title IN (
  'API latency spike in production', 'VPN login blocked', 'App crashes on startup',
  'Reporting export timeout', 'Search results missing records', 'Mobile UI overlaps buttons'
)
AND t.status IN ('assigned', 'in_progress');

-- Stage pending_routing tickets with Lumina AI (so routing engine picks them up on next route call).
INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  t.id,
  lumina.id,
  approver.id,
  TRUE,
  NOW()
FROM tickets t
JOIN users lumina ON lumina.email = lower('lumina.ai@lumina.test')
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
WHERE t.status = 'pending_routing'::ticket_status
  AND NOT EXISTS (SELECT 1 FROM ticket_assignment ta WHERE ta.ticket_id = t.id AND ta.is_active = TRUE);

-- Add routing metadata to resolved/closed and active tickets so AI Decision Log shows history.
UPDATE tickets
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{routing}',
  jsonb_build_object(
    'source', 'seed',
    'assigned_admin_id', assignee.id::text,
    'reasoning', CASE
      WHEN t.status IN ('resolved', 'closed') THEN 'Ticket was resolved by the assignee.'
      ELSE 'Assigned based on skill fit and availability.'
    END,
    'decision', jsonb_build_object(
      'assigned_admin_id', assignee.id::text,
      'assignee_name', CONCAT(assignee.first_name, ' ', assignee.last_name),
      'assignee_job_title', NULLIF(TRIM(assignee.job_title), ''),
      'source', 'seed',
      'confidence', 0.85,
      'ticket_note', jsonb_build_object(
        'summary', CONCAT('Route to ', assignee.first_name, ' ', assignee.last_name, '.'),
        'rationale', 'Seed data assignment based on ticket category and admin specialty.',
        'next_step', CASE WHEN t.status IN ('resolved', 'closed') THEN 'Ticket complete.' ELSE 'Assignee reviews and starts work.' END
      )
    )
  ),
  true
)
FROM tickets t
JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
JOIN users assignee ON assignee.id = ta.assigned_to
WHERE tickets.id = t.id
  AND lower(assignee.email) <> lower('lumina.ai@lumina.test')
  AND tickets.status NOT IN ('pending_routing');

-- Create audit log entries for resolved/closed tickets to show the full lifecycle.
INSERT INTO audit_logs (actor_id, action, metadata, created_at)
SELECT
  assignee.id,
  seed.action,
  seed.metadata::jsonb,
  seed.occurred_at::timestamptz
FROM (
  VALUES
    ('Kubernetes pod crash loop', 'admin.platform@lumina.test', 'ticket_created', '{"ticket_id":"placeholder","action":"ticket_created","priority":"P3","type":"incident"}', NOW() - interval '5 days'),
    ('Kubernetes pod crash loop', 'admin.platform@lumina.test', 'ticket_assigned', '{"ticket_id":"placeholder","action":"ticket_assigned","assigned_to_name":"Harper Platform","source":"lumina_ai"}', NOW() - interval '5 days'),
    ('Kubernetes pod crash loop', 'admin.platform@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"assigned","new_status":"in_progress"}', NOW() - interval '4 days'),
    ('Kubernetes pod crash loop', 'admin.platform@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"in_progress","new_status":"resolved"}', NOW() - interval '3 days'),
    ('Notification emails delayed', 'admin.software@lumina.test', 'ticket_created', '{"ticket_id":"placeholder","action":"ticket_created","priority":"P2","type":"software"}', NOW() - interval '4 days'),
    ('Notification emails delayed', 'admin.software@lumina.test', 'ticket_assigned', '{"ticket_id":"placeholder","action":"ticket_assigned","assigned_to_name":"Sage Software","source":"lumina_ai"}', NOW() - interval '4 days'),
    ('Notification emails delayed', 'admin.software@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"assigned","new_status":"in_progress"}', NOW() - interval '3 days'),
    ('Notification emails delayed', 'admin.software@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"in_progress","new_status":"resolved"}', NOW() - interval '2 days'),
    ('Notification emails delayed', 'admin.software@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"resolved","new_status":"closed"}', NOW() - interval '1 days'),
    ('SSO callback loop', 'admin.ops@lumina.test', 'ticket_created', '{"ticket_id":"placeholder","action":"ticket_created","priority":"P1","type":"software"}', NOW() - interval '3 days'),
    ('SSO callback loop', 'admin.ops@lumina.test', 'ticket_assigned', '{"ticket_id":"placeholder","action":"ticket_assigned","assigned_to_name":"Opal Ops","source":"lumina_ai"}', NOW() - interval '3 days'),
    ('SSO callback loop', 'admin.ops@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"assigned","new_status":"in_progress"}', NOW() - interval '2 days'),
    ('SSO callback loop', 'admin.ops@lumina.test', 'ticket_status_changed', '{"ticket_id":"placeholder","action":"ticket_status_changed","old_status":"in_progress","new_status":"resolved"}', NOW() - interval '1 days')
) AS seed(ticket_title, actor_email, action, metadata, occurred_at)
JOIN tickets t ON t.title = seed.ticket_title
JOIN users assignee ON assignee.email = lower(seed.actor_email)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.metadata->>'ticket_id' = t.id::text AND a.action = seed.action);

-- Fix audit_log ticket_id references to point to actual ticket IDs.
UPDATE audit_logs a
SET metadata = jsonb_set(metadata, '{ticket_id}', to_jsonb(t.id::text), false)
FROM tickets t
WHERE a.metadata->>'ticket_id' = 'placeholder'
  AND a.metadata->>'action' IS NOT NULL
  AND a.action = 'ticket_created'
  AND t.title = COALESCE(
    (SELECT seed.title FROM (VALUES
      ('Kubernetes pod crash loop'),
      ('Notification emails delayed'),
      ('SSO callback loop')
    ) AS seed(title) WHERE EXISTS (
      SELECT 1 FROM audit_logs a2
      WHERE a2.metadata->>'ticket_id' = 'placeholder'
      AND a2.action = a.action
      AND a2.ctid = a.ctid
    )),
    NULL
  );

-- Insert satisfaction ratings for resolved/closed tickets.
INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
SELECT
  t.id,
  u.id,
  seed.rating,
  seed.comment
FROM (
  VALUES
    ('Kubernetes pod crash loop', 'dan.user@lumina.test', 5, 'Fast turnaround and clear updates.'),
    ('Notification emails delayed', 'bob.user@lumina.test', 4, 'Issue fixed after SMTP tuning.'),
    ('SSO callback loop', 'eve.user@lumina.test', 5, 'Resolved quickly with a clean workaround.')
) AS seed(ticket_title, user_email, rating, comment)
JOIN tickets t ON t.title = seed.ticket_title
JOIN users u ON u.email = lower(seed.user_email)
WHERE NOT EXISTS (SELECT 1 FROM satisfaction_ratings);

-- General seed audit log entries.
INSERT INTO audit_logs (actor_id, action, metadata)
SELECT
  actor.id,
  seed.action,
  seed.metadata::jsonb
FROM (
  VALUES
    ('ynrdevs@gmail.com', 'seed_users_loaded', '{"source":"init.sql"}'),
    ('ynrdevs@gmail.com', 'seed_tickets_loaded', '{"source":"init.sql"}'),
    ('admin.platform@lumina.test', 'seed_assignment_reviewed', '{"source":"init.sql","area":"platform"}')
) AS seed(actor_email, action, metadata)
JOIN users actor ON actor.email = lower(seed.actor_email)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs a WHERE a.action = seed.action);

-- Clean up legacy demo accounts from earlier local seeds so routing and approvals stay focused
-- on the current Lumina test set.
UPDATE categories
SET created_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE created_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE ticket_assignment
SET assigned_to = (SELECT id FROM users WHERE email = lower('admin.platform@lumina.test'))
WHERE assigned_to IN (
  (SELECT id FROM users WHERE email = lower('admin@example.com')),
  (SELECT id FROM users WHERE email = lower('y.nachiketh.reddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('itsnachikethreddy@gmail.com')),
  (SELECT id FROM users WHERE email = lower('ynrworks@gmail.com')),
  (SELECT id FROM users WHERE email = lower('rlasya005@gmail.com'))
);

UPDATE ticket_assignment
SET assigned_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE assigned_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE users
SET approved_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE approved_by = (SELECT id FROM users WHERE email = lower('admin@example.com'));

UPDATE audit_logs
SET actor_id = (SELECT id FROM users WHERE email = lower('admin.platform@lumina.test'))
WHERE actor_id IN (
  SELECT id FROM users WHERE email IN (
    lower('y.nachiketh.reddy@gmail.com'),
    lower('itsnachikethreddy@gmail.com'),
    lower('ynrworks@gmail.com'),
    lower('rlasya005@gmail.com'),
    lower('admin.hardware@lumina.test')
  )
);

UPDATE tickets
SET submitted_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE submitted_by IN (
  SELECT id FROM users WHERE email IN (
    lower('rlasya005@gmail.com'),
    lower('admin.hardware@lumina.test')
  )
);

UPDATE ticket_assignment
SET assigned_to = (SELECT id FROM users WHERE email = lower('admin.platform@lumina.test'))
WHERE assigned_to = (SELECT id FROM users WHERE email = lower('admin.hardware@lumina.test'));

UPDATE ticket_assignment
SET assigned_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE assigned_by = (SELECT id FROM users WHERE email = lower('admin.hardware@lumina.test'));

UPDATE users
SET approved_by = (SELECT id FROM users WHERE email = lower('ynrdevs@gmail.com'))
WHERE approved_by IN (
  SELECT id FROM users WHERE email IN (
    lower('rlasya005@gmail.com'),
    lower('admin.hardware@lumina.test')
  )
);

DELETE FROM users
WHERE email IN (
  lower('admin@example.com'),
  lower('alice@test.lumina'),
  lower('bob@test.lumina'),
  lower('carol@test.lumina'),
  lower('itsnachikethreddyy@gmail.com'),
  lower('y.nachiketh.reddy@gmail.com'),
  lower('itsnachikethreddy@gmail.com'),
  lower('ynrworks@gmail.com'),
  lower('rlasya005@gmail.com'),
  lower('admin.hardware@lumina.test')
);

-- Backfill onboarding job roles for any existing Lumina seed account (idempotent re-runs).
UPDATE users u
SET job_title = seed.job_title,
    department = seed.department,
    onboarding_completed = TRUE,
    name_set = TRUE
FROM (
  VALUES
    ('ynrdevs@gmail.com', 'HR', 'HR'),
    ('admin.platform@lumina.test', 'Platform / Infrastructure Engineer', 'Developers'),
    ('admin.software@lumina.test', 'Software Engineer / Developer', 'Developers'),
    ('admin.bugs@lumina.test', 'QA Engineer / Test Engineer', 'QA'),
    ('admin.ops@lumina.test', 'DevOps / Site Reliability Engineer', 'Developers'),
    ('admin.qa@lumina.test', 'Automation Engineer', 'QA'),
    ('eve.user@lumina.test', 'Product Owner', 'Managers'),
    ('lumina.ai@lumina.test', 'Release Manager', 'QA'),
    ('alice.user@lumina.test', 'Software Engineer / Developer', 'Developers'),
    ('qa.tester@lumina.test', 'QA Engineer / Test Engineer', 'QA'),
    ('qa.auto@lumina.test', 'Automation Engineer', 'QA'),
    ('bob.user@lumina.test', 'Product Designer / UX Designer', 'QA'),
    ('carol.user@lumina.test', 'Security Engineer / AppSec', 'QA'),
    ('dan.user@lumina.test', 'Architect', 'Developers'),
    ('manager.priya@lumina.test', 'Product Manager', 'Managers'),
    ('manager.ian@lumina.test', 'Program / Project Manager', 'Managers'),
    ('pending.user1@lumina.test', 'Tech Lead / Lead Engineer', 'Developers'),
    ('pending.user2@lumina.test', 'UX Researcher', 'QA'),
    ('pending.user3@lumina.test', 'Content Designer / UX Writer', 'QA'),
    ('pending.admin1@lumina.test', 'Program / Project Manager', 'Managers'),
    ('pending.admin2@lumina.test', 'Product Owner', 'Managers')
) AS seed(email, job_title, department)
WHERE u.email = lower(seed.email);

-- Role model: system admin = PO, managers, HR (+ Lumina AI). System user = developers & testers.
UPDATE users
SET role = 'user'::user_role
WHERE email IN (
  lower('admin.platform@lumina.test'),
  lower('admin.software@lumina.test'),
  lower('admin.bugs@lumina.test'),
  lower('admin.ops@lumina.test'),
  lower('admin.qa@lumina.test')
);

UPDATE users
SET role = 'admin'::user_role
WHERE email IN (
  lower('manager.priya@lumina.test'),
  lower('manager.ian@lumina.test'),
  lower('eve.user@lumina.test'),
  lower('ynrdevs@gmail.com'),
  lower('lumina.ai@lumina.test')
);

-- Tickets previously assigned to IC accounts should sit with managers (PO/manager triage).
UPDATE ticket_assignment ta
SET assigned_to = mgr.id,
    assigned_by = COALESCE(lumina.id, ta.assigned_by)
FROM tickets t
JOIN users submitter ON submitter.id = t.submitted_by
JOIN users mgr ON mgr.email = lower(
  CASE
    WHEN submitter.department = 'QA' THEN 'manager.priya@lumina.test'
    WHEN submitter.department = 'Developers' THEN 'manager.ian@lumina.test'
    ELSE 'manager.ian@lumina.test'
  END
)
LEFT JOIN users lumina ON lumina.email = lower('lumina.ai@lumina.test')
WHERE ta.ticket_id = t.id
  AND ta.is_active = TRUE
  AND ta.assigned_to IN (
    SELECT id FROM users WHERE email IN (
      lower('admin.platform@lumina.test'),
      lower('admin.software@lumina.test'),
      lower('admin.bugs@lumina.test'),
      lower('admin.ops@lumina.test'),
      lower('admin.qa@lumina.test')
    )
  );

-- Software company: migrate legacy hardware ticket type and category away
DO $add_incident_enum$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ticket_type' AND e.enumlabel = 'incident'
  ) THEN
    ALTER TYPE ticket_type ADD VALUE 'incident';
  END IF;
END $add_incident_enum$;

UPDATE tickets
SET type = 'incident'::ticket_type
WHERE type::text = 'hardware';

UPDATE categories
SET
  name = 'Platform & Infrastructure',
  description = 'Production incidents, deployments, and cloud infrastructure'
WHERE name = 'Hardware Support'
  AND NOT EXISTS (
    SELECT 1 FROM categories c2
    WHERE lower(c2.name) = lower('Platform & Infrastructure')
      AND c2.id <> categories.id
  );

UPDATE users
SET
  email = lower('admin.platform@lumina.test'),
  first_name = 'Harper',
  last_name = 'Platform'
WHERE email = lower('admin.hardware@lumina.test')
  AND NOT EXISTS (
    SELECT 1 FROM users u2 WHERE u2.email = lower('admin.platform@lumina.test')
  );

-- Google OAuth: require /complete-profile until user explicitly confirms name
UPDATE users u
SET name_set = FALSE
FROM oauth_accounts o
WHERE o.user_id = u.id
  AND o.provider = 'google'::oauth_provider
  AND u.onboarding_completed = FALSE
  AND u.name_set = TRUE;

-- Google OAuth: require email OTP like password signup (do not auto-verify from Google identity)
UPDATE users u
SET email_is_verified = FALSE
FROM oauth_accounts o
WHERE o.user_id = u.id
  AND o.provider = 'google'::oauth_provider
  AND u.email_is_verified = TRUE
  AND (
    u.status = 'pending'::user_status
    OR NOT u.onboarding_completed
  );

-- Backfill routing decision assignee job title for existing AI-routed tickets
UPDATE tickets t
SET metadata = jsonb_set(
  COALESCE(t.metadata, '{}'::jsonb),
  '{routing,decision,assignee_job_title}',
  to_jsonb(NULLIF(TRIM(u.job_title), '')),
  true
)
FROM ticket_assignment ta
JOIN users u ON u.id = ta.assigned_to
WHERE ta.ticket_id = t.id
  AND ta.is_active = TRUE
  AND t.metadata->'routing' IS NOT NULL
  AND t.metadata->'routing' != 'null'::jsonb
  AND COALESCE(t.metadata->'routing'->'decision'->>'assignee_job_title', '') = '';
