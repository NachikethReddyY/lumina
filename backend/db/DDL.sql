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

INSERT INTO tickets (
  title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata
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
  seed.metadata::jsonb
FROM (
  VALUES
    ('API latency spike in production', 'P95 response time doubled after the latest API release.', 'Platform & Infrastructure', 'incident', 'P2', 'assigned', 'alice.user@lumina.test', 'Open Grafana dashboard and compare last 24h.', '{"source":"seed","routing":{"source":"seed","reasoning":"Balanced to least-loaded admin."}}'),
    ('VPN login blocked', 'The VPN rejects my password after the latest reset.', 'Software Support', 'software', 'P1', 'in_progress', 'bob.user@lumina.test', 'Open VPN client and attempt login.', '{"source":"seed","routing":{"source":"seed","reasoning":"Critical auth issue routed to active admin."}}'),
    ('App crashes on startup', 'The app closes instantly after showing the splash screen.', 'Bug Reports', 'bug', 'P1', 'assigned', 'carol.user@lumina.test', 'Launch app on Windows 11 after fresh install.', '{"source":"seed","routing":{"source":"seed","reasoning":"Routed to Lumina AI for routing trace review."}}'),
    ('Kubernetes pod crash loop', 'Checkout service pods restart every 30 seconds in staging.', 'Platform & Infrastructure', 'incident', 'P3', 'resolved', 'dan.user@lumina.test', 'kubectl describe pod checkout-api in staging.', '{"source":"seed"}'),
    ('Reporting export timeout', 'CSV export times out after around 30 seconds.', 'Software Support', 'software', 'P2', 'assigned', 'eve.user@lumina.test', 'Run export from finance dashboard.', '{"source":"seed"}'),
    ('Production outage after deploy', 'Users cannot log in after v2.4.1 was deployed to production.', 'Platform & Infrastructure', 'incident', 'P1', 'assigned', 'alice.user@lumina.test', 'Rollback deploy and check error logs.', '{"source":"seed","routing":{"source":"seed","reasoning":"Routed to Lumina AI for routing trace review."}}'),
    ('Notification emails delayed', 'Password reset emails arrive after 15 minutes.', 'Software Support', 'software', 'P2', 'closed', 'bob.user@lumina.test', 'Triggered from forgot password page.', '{"source":"seed"}'),
    ('Search results missing records', 'Two recent tickets do not appear in search results.', 'Bug Reports', 'bug', 'P2', 'in_progress', 'carol.user@lumina.test', 'Search by ticket title after creating a ticket.', '{"source":"seed"}'),
    ('Redis cache cluster unreachable', 'Application cannot connect to Redis after maintenance window.', 'Platform & Infrastructure', 'incident', 'P3', 'assigned', 'dan.user@lumina.test', 'Verify Redis endpoint and TLS certs.', '{"source":"seed"}'),
    ('SSO callback loop', 'Logging in with SSO keeps redirecting back to the login page.', 'Software Support', 'software', 'P1', 'resolved', 'eve.user@lumina.test', 'Happens in Chrome and Edge.', '{"source":"seed"}'),
    ('Attachment upload fails', 'PNG attachments fail with a 500 error.', 'Bug Reports', 'bug', 'P2', 'assigned', 'alice.user@lumina.test', 'Upload 2MB PNG to a new ticket.', '{"source":"seed","routing":{"source":"seed","reasoning":"Routed to Lumina AI for routing trace review."}}'),
    ('Staging environment config drift', 'Staging API returns different schema than documented OpenAPI spec.', 'Software Support', 'software', 'P4', 'closed', 'bob.user@lumina.test', 'Compare staging vs production env vars.', '{"source":"seed"}'),
    ('License activation stuck', 'Activation spinner never completes for a desktop tool.', 'Software Support', 'software', 'P3', 'assigned', 'carol.user@lumina.test', 'Click activate after entering key.', '{"source":"seed","routing":{"source":"seed","reasoning":"Routed to Lumina AI for routing trace review."}}'),
    ('Mobile UI overlaps buttons', 'Action buttons overlap on iPhone Safari.', 'Bug Reports', 'bug', 'P3', 'in_progress', 'dan.user@lumina.test', 'Open settings on iPhone 14.', '{"source":"seed"}'),
    ('Webhook delivery retry backlog', 'Partner webhooks are queuing and not delivering within SLA.', 'Software Support', 'software', 'P4', 'assigned', 'eve.user@lumina.test', 'Inspect webhook worker logs and queue depth.', '{"source":"seed","pending_lumina_routing":true}')
) AS seed(title, description, category_name, type, priority, status, submitter_email, replication_steps, metadata)
JOIN categories c ON lower(c.name) = lower(seed.category_name)
JOIN users u ON u.email = lower(seed.submitter_email)
WHERE NOT EXISTS (SELECT 1 FROM tickets);

-- Stage every seeded ticket with Lumina AI first (mirrors live create → route pipeline).
INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assigned_at)
SELECT
  t.id,
  lumina.id,
  approver.id,
  TRUE,
  t.created_at
FROM tickets t
JOIN users lumina ON lumina.email = lower('lumina.ai@lumina.test')
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
WHERE NOT EXISTS (SELECT 1 FROM ticket_assignment);

-- Lumina AI routes staged tickets to real admins (by type, category, and submitter department).
WITH lumina_user AS (
  SELECT id FROM users WHERE email = lower('lumina.ai@lumina.test')
),
real_admin_targets AS (
  SELECT
    t.id AS ticket_id,
    assignee.id AS assignee_id
  FROM ticket_assignment ta
  JOIN lumina_user lumina ON lumina.id = ta.assigned_to
  JOIN tickets t ON t.id = ta.ticket_id
  JOIN categories c ON c.id = t.category_id
  JOIN users submitter ON submitter.id = t.submitted_by
  JOIN users assignee ON assignee.email = lower(
    CASE
      WHEN submitter.department = 'QA' THEN 'manager.priya@lumina.test'
      WHEN submitter.department = 'Developers' THEN 'manager.ian@lumina.test'
      WHEN submitter.department = 'Managers' THEN 'manager.priya@lumina.test'
      ELSE 'manager.ian@lumina.test'
    END
  )
  WHERE ta.is_active = TRUE
)
UPDATE ticket_assignment ta
SET assigned_to = real_admin_targets.assignee_id,
    assigned_by = (SELECT id FROM users WHERE email = lower('lumina.ai@lumina.test'))
FROM real_admin_targets
WHERE ta.ticket_id = real_admin_targets.ticket_id
  AND ta.is_active = TRUE;

UPDATE tickets
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{routing}',
  jsonb_build_object(
    'source', 'lumina_ai',
    'assigned_admin_id', assignee.id::text,
    'reasoning', 'Lumina AI routed this ticket from staging to the best-fit active admin.',
    'staging', jsonb_build_object('assigned_to_lumina', true),
    'decision', jsonb_build_object(
      'assigned_admin_id', assignee.id::text,
      'assignee_name', CONCAT(assignee.first_name, ' ', assignee.last_name),
      'source', 'lumina_ai',
      'confidence', 0.85,
      'steps', jsonb_build_array(
        jsonb_build_object('phase', 'thinking', 'summary', 'Classified priority, category, and submitter department.'),
        jsonb_build_object('phase', 'read', 'summary', 'Compared active admin workloads.'),
        jsonb_build_object('phase', 'assign', 'summary', CONCAT('Routed to ', assignee.first_name, ' ', assignee.last_name, '.'))
      ),
      'ticket_note', jsonb_build_object(
        'summary', CONCAT('Route to ', assignee.first_name, ' ', assignee.last_name, '.'),
        'rationale', 'Lumina AI pipeline assignment based on support area and load.',
        'next_step', 'Assignee reviews and starts work.'
      )
    )
  ),
  true
),
status = CASE
  WHEN tickets.status = 'pending_routing'::ticket_status THEN 'assigned'::ticket_status
  ELSE tickets.status
END
FROM ticket_assignment ta
JOIN users assignee ON assignee.id = ta.assigned_to
WHERE ta.ticket_id = tickets.id
  AND ta.is_active = TRUE
  AND lower(assignee.email) <> lower('lumina.ai@lumina.test');

-- Additional QA / Developer tickets (idempotent by title; for existing databases).
INSERT INTO tickets (
  title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata
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
  seed.metadata::jsonb
FROM (
  VALUES
    ('Regression suite fails on checkout', 'Playwright suite fails on payment step after UI refresh.', 'Bug Reports', 'bug', 'P2', 'assigned', 'bob.user@lumina.test', 'Run npm run test:e2e on staging.', '{"source":"seed","pending_lumina_routing":true}'),
    ('Accessibility contrast audit findings', 'WCAG contrast failures on primary buttons in dark mode.', 'Bug Reports', 'bug', 'P3', 'in_progress', 'carol.user@lumina.test', 'Run axe scan on settings page.', '{"source":"seed","pending_lumina_routing":true}'),
    ('Load test spike on auth service', 'Auth service p99 doubled during load test window.', 'Platform & Infrastructure', 'incident', 'P2', 'assigned', 'alice.user@lumina.test', 'Re-run k6 profile with 500 RPS.', '{"source":"seed","pending_lumina_routing":true}'),
    ('Database migration lock timeout', 'Deploy migration 018 hangs on users table lock.', 'Platform & Infrastructure', 'incident', 'P1', 'assigned', 'dan.user@lumina.test', 'Check pg_locks during migration.', '{"source":"seed","pending_lumina_routing":true}'),
    ('Design tokens out of sync', 'Figma tokens differ from CSS variables in main branch.', 'Software Support', 'software', 'P3', 'assigned', 'bob.user@lumina.test', 'Compare tokens.json vs theme.css.', '{"source":"seed","pending_lumina_routing":true}'),
    ('API pagination returns duplicates', 'Page 2 of /tickets returns overlapping records.', 'Bug Reports', 'bug', 'P2', 'assigned', 'alice.user@lumina.test', 'Call GET /tickets?page=2.', '{"source":"seed","pending_lumina_routing":true}'),
    ('CI pipeline flaky on lint step', 'ESLint step fails intermittently on feature branches.', 'Software Support', 'software', 'P4', 'assigned', 'dan.user@lumina.test', 'Re-run failed GitHub Action twice.', '{"source":"seed","pending_lumina_routing":true}'),
    ('Pen test medium finding on exports', 'CSV export endpoint missing rate limit per user.', 'Bug Reports', 'bug', 'P2', 'in_progress', 'carol.user@lumina.test', 'Attempt 50 exports in one minute.', '{"source":"seed","pending_lumina_routing":true}')
) AS seed(title, description, category_name, type, priority, status, submitter_email, replication_steps, metadata)
JOIN categories c ON lower(c.name) = lower(seed.category_name)
JOIN users u ON u.email = lower(seed.submitter_email)
WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.title = seed.title);

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
WHERE t.title IN (
  'Regression suite fails on checkout',
  'Accessibility contrast audit findings',
  'Load test spike on auth service',
  'Database migration lock timeout',
  'Design tokens out of sync',
  'API pagination returns duplicates',
  'CI pipeline flaky on lint step',
  'Pen test medium finding on exports'
)
AND NOT EXISTS (
  SELECT 1 FROM ticket_assignment ta WHERE ta.ticket_id = t.id AND ta.is_active = TRUE
);

WITH lumina_user AS (
  SELECT id FROM users WHERE email = lower('lumina.ai@lumina.test')
),
extra_admin_targets AS (
  SELECT
    t.id AS ticket_id,
    assignee.id AS assignee_id
  FROM ticket_assignment ta
  JOIN lumina_user lumina ON lumina.id = ta.assigned_to
  JOIN tickets t ON t.id = ta.ticket_id
  JOIN categories c ON c.id = t.category_id
  JOIN users submitter ON submitter.id = t.submitted_by
  JOIN users assignee ON assignee.email = lower(
    CASE
      WHEN submitter.department = 'QA' THEN 'manager.priya@lumina.test'
      WHEN submitter.department = 'Developers' THEN 'manager.ian@lumina.test'
      WHEN submitter.department = 'Managers' THEN 'manager.priya@lumina.test'
      ELSE 'manager.ian@lumina.test'
    END
  )
  WHERE ta.is_active = TRUE
    AND t.title IN (
      'Regression suite fails on checkout',
      'Accessibility contrast audit findings',
      'Load test spike on auth service',
      'Database migration lock timeout',
      'Design tokens out of sync',
      'API pagination returns duplicates',
      'CI pipeline flaky on lint step',
      'Pen test medium finding on exports'
    )
)
UPDATE ticket_assignment ta
SET assigned_to = extra_admin_targets.assignee_id,
    assigned_by = (SELECT id FROM users WHERE email = lower('lumina.ai@lumina.test'))
FROM extra_admin_targets
WHERE ta.ticket_id = extra_admin_targets.ticket_id
  AND ta.is_active = TRUE;

UPDATE tickets
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{routing}',
  jsonb_build_object(
    'source', 'lumina_ai',
    'assigned_admin_id', assignee.id::text,
    'reasoning', 'Lumina AI routed this ticket from staging to the best-fit active admin.',
    'staging', jsonb_build_object('assigned_to_lumina', true),
    'decision', jsonb_build_object(
      'assigned_admin_id', assignee.id::text,
      'assignee_name', CONCAT(assignee.first_name, ' ', assignee.last_name),
      'source', 'lumina_ai',
      'confidence', 0.85,
      'steps', jsonb_build_array(
        jsonb_build_object('phase', 'thinking', 'summary', 'Classified priority, category, and submitter department.'),
        jsonb_build_object('phase', 'read', 'summary', 'Compared active admin workloads.'),
        jsonb_build_object('phase', 'assign', 'summary', CONCAT('Routed to ', assignee.first_name, ' ', assignee.last_name, '.'))
      ),
      'ticket_note', jsonb_build_object(
        'summary', CONCAT('Route to ', assignee.first_name, ' ', assignee.last_name, '.'),
        'rationale', 'Lumina AI pipeline assignment based on support area and load.',
        'next_step', 'Assignee reviews and starts work.'
      )
    )
  ),
  true
)
FROM ticket_assignment ta
JOIN users assignee ON assignee.id = ta.assigned_to
WHERE ta.ticket_id = tickets.id
  AND ta.is_active = TRUE
  AND lower(assignee.email) <> lower('lumina.ai@lumina.test')
  AND tickets.title IN (
    'Regression suite fails on checkout',
    'Accessibility contrast audit findings',
    'Load test spike on auth service',
    'Database migration lock timeout',
    'Design tokens out of sync',
    'API pagination returns duplicates',
    'CI pipeline flaky on lint step',
    'Pen test medium finding on exports'
  );

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
WHERE NOT EXISTS (SELECT 1 FROM audit_logs);

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
