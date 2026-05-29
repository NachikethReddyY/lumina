-- =============================================================================
-- Lumina ticket seed data (development only)
-- =============================================================================
-- Load AFTER backend/db/DDL.sql:
--   psql "$DATABASE_URL" -f backend/db/DDL.sql -f backend/db/seed.sql
--
-- Base users, categories, and OAuth samples live in DDL.sql.
-- This file only inserts ticket-domain data.
-- =============================================================================

-- =============================================================================
-- ADDITIVE USER FIXTURES (safe to run on existing data)
-- =============================================================================
-- Keeps seed idempotent and adds missing staffing coverage without truncating tables.
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  -- Managers (extra)
  ('00000000-0000-0000-0000-000000000017', 'rachel.adams@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Rachel', 'Adams', 'admin', 'active', TRUE, TRUE, 'Product Manager', 'Managers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '40 days', NOW() - INTERVAL '112 days', NOW() - INTERVAL '7 hours'),
  ('00000000-0000-0000-0000-000000000018', 'andrew.chen@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Andrew', 'Chen', 'admin', 'active', TRUE, TRUE, 'Project Manager', 'Managers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '38 days', NOW() - INTERVAL '109 days', NOW() - INTERVAL '9 hours'),

  -- Developers (extra)
  ('00000000-0000-0000-0000-000000000023', 'liam.patel@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Liam', 'Patel', 'admin', 'active', TRUE, TRUE, 'Backend Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '26 days', NOW() - INTERVAL '102 days', NOW() - INTERVAL '12 hours'),
  ('00000000-0000-0000-0000-000000000024', 'sofia.martinez@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Sofia', 'Martinez', 'admin', 'active', TRUE, TRUE, 'Frontend Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '24 days', NOW() - INTERVAL '99 days', NOW() - INTERVAL '14 hours'),

  -- QA (extra)
  ('00000000-0000-0000-0000-000000000025', 'nina.rao@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Nina', 'Rao', 'admin', 'active', TRUE, TRUE, 'QA Analyst', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '18 days', NOW() - INTERVAL '93 days', NOW() - INTERVAL '11 hours'),
  ('00000000-0000-0000-0000-000000000026', 'omar.hassan@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Omar', 'Hassan', 'admin', 'active', TRUE, TRUE, 'Senior QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '16 days', NOW() - INTERVAL '91 days', NOW() - INTERVAL '13 hours'),
  ('00000000-0000-0000-0000-000000000027', 'grace.park@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Grace', 'Park', 'admin', 'active', TRUE, TRUE, 'Automation QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '14 days', NOW() - INTERVAL '89 days', NOW() - INTERVAL '15 hours')
ON CONFLICT DO NOTHING;

-- Additional regular users to bring total demo population to 30.
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000028', 'aarav.mehta@lumina.test', crypt('Password1!', gen_salt('bf')), 'Aarav', 'Mehta', 'user', 'active', TRUE, TRUE, 'Business Analyst', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days', NULL),
  ('00000000-0000-0000-0000-000000000029', 'chloe.nguyen@lumina.test', crypt('Password1!', gen_salt('bf')), 'Chloe', 'Nguyen', 'user', 'active', TRUE, TRUE, 'Operations Specialist', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '58 days', NOW() - INTERVAL '3 days', NULL),
  ('00000000-0000-0000-0000-000000000030', 'ethan.clark@lumina.test', crypt('Password1!', gen_salt('bf')), 'Ethan', 'Clark', 'user', 'active', TRUE, TRUE, 'Support Coordinator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '56 days', NOW() - INTERVAL '5 days', NULL),
  ('00000000-0000-0000-0000-000000000031', 'mia.rodriguez@lumina.test', crypt('Password1!', gen_salt('bf')), 'Mia', 'Rodriguez', 'user', 'active', TRUE, TRUE, 'Customer Success Manager', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '54 days', NOW() - INTERVAL '7 days', NULL),
  ('00000000-0000-0000-0000-000000000032', 'noah.turner@lumina.test', crypt('Password1!', gen_salt('bf')), 'Noah', 'Turner', 'user', 'active', TRUE, TRUE, 'IT Support Specialist', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '52 days', NOW() - INTERVAL '9 days', NULL),
  ('00000000-0000-0000-0000-000000000033', 'ava.moore@lumina.test', crypt('Password1!', gen_salt('bf')), 'Ava', 'Moore', 'user', 'active', TRUE, TRUE, 'Procurement Analyst', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '50 days', NOW() - INTERVAL '11 days', NULL),
  ('00000000-0000-0000-0000-000000000034', 'liam.singh@lumina.test', crypt('Password1!', gen_salt('bf')), 'Liam', 'Singh', 'user', 'active', TRUE, TRUE, 'Finance Associate', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '48 days', NOW() - INTERVAL '13 days', NULL),
  ('00000000-0000-0000-0000-000000000035', 'isabella.flores@lumina.test', crypt('Password1!', gen_salt('bf')), 'Isabella', 'Flores', 'user', 'active', TRUE, TRUE, 'Marketing Specialist', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '46 days', NOW() - INTERVAL '15 days', NULL),
  ('00000000-0000-0000-0000-000000000036', 'jack.wright@lumina.test', crypt('Password1!', gen_salt('bf')), 'Jack', 'Wright', 'user', 'active', TRUE, TRUE, 'Sales Operations Analyst', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '44 days', NOW() - INTERVAL '17 days', NULL),
  ('00000000-0000-0000-0000-000000000037', 'amelia.hill@lumina.test', crypt('Password1!', gen_salt('bf')), 'Amelia', 'Hill', 'user', 'active', TRUE, TRUE, 'People Operations Coordinator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '42 days', NOW() - INTERVAL '19 days', NULL),
  ('00000000-0000-0000-0000-000000000038', 'henry.scott@lumina.test', crypt('Password1!', gen_salt('bf')), 'Henry', 'Scott', 'user', 'active', TRUE, TRUE, 'Data Analyst', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '40 days', NOW() - INTERVAL '21 days', NULL),
  ('00000000-0000-0000-0000-000000000039', 'harper.green@lumina.test', crypt('Password1!', gen_salt('bf')), 'Harper', 'Green', 'user', 'active', TRUE, TRUE, 'Legal Operations Associate', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '38 days', NOW() - INTERVAL '23 days', NULL),
  ('00000000-0000-0000-0000-000000000040', 'daniel.baker@lumina.test', crypt('Password1!', gen_salt('bf')), 'Daniel', 'Baker', 'user', 'active', TRUE, TRUE, 'Facilities Coordinator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '36 days', NOW() - INTERVAL '25 days', NULL),
  ('00000000-0000-0000-0000-000000000041', 'ella.rivera@lumina.test', crypt('Password1!', gen_salt('bf')), 'Ella', 'Rivera', 'user', 'active', TRUE, TRUE, 'Executive Assistant', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '34 days', NOW() - INTERVAL '27 days', NULL),
  ('00000000-0000-0000-0000-000000000042', 'mason.cooper@lumina.test', crypt('Password1!', gen_salt('bf')), 'Mason', 'Cooper', 'user', 'active', TRUE, TRUE, 'Revenue Operations Analyst', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '32 days', NOW() - INTERVAL '29 days', NULL),
  ('00000000-0000-0000-0000-000000000043', 'luna.edwards@lumina.test', crypt('Password1!', gen_salt('bf')), 'Luna', 'Edwards', 'user', 'active', TRUE, TRUE, 'Office Administrator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '30 days', NOW() - INTERVAL '31 days', NULL),
  ('00000000-0000-0000-0000-000000000044', 'logan.collins@lumina.test', crypt('Password1!', gen_salt('bf')), 'Logan', 'Collins', 'user', 'active', TRUE, TRUE, 'Business Operations Associate', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '28 days', NOW() - INTERVAL '33 days', NULL)
ON CONFLICT DO NOTHING;

-- Additional technical staff so key job titles can be paired (2 people per title).
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at, created_at, last_login_at)
VALUES
  ('00000000-0000-0000-0000-000000000045', 'nora.hayes@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Nora', 'Hayes', 'admin', 'active', TRUE, TRUE, 'Full Stack Developer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '22 days', NOW() - INTERVAL '16 hours', NULL),
  ('00000000-0000-0000-0000-000000000046', 'kavin.nair@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Kavin', 'Nair', 'admin', 'active', TRUE, TRUE, 'QA Lead', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '21 days', NOW() - INTERVAL '18 hours', NULL),
  ('00000000-0000-0000-0000-000000000047', 'meera.iyer@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Meera', 'Iyer', 'admin', 'active', TRUE, TRUE, 'IT Service Delivery Manager', 'Managers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 hours', NULL)
ON CONFLICT DO NOTHING;

-- Normalize core technical/managerial job titles to appear in pairs.
UPDATE users
SET job_title = CASE id
  WHEN '00000000-0000-0000-0000-000000000012' THEN 'Senior Software Engineer'
  WHEN '00000000-0000-0000-0000-000000000023' THEN 'Senior Software Engineer'
  WHEN '00000000-0000-0000-0000-000000000013' THEN 'Software Engineer'
  WHEN '00000000-0000-0000-0000-000000000024' THEN 'Software Engineer'
  WHEN '00000000-0000-0000-0000-000000000014' THEN 'Full Stack Developer'
  WHEN '00000000-0000-0000-0000-000000000045' THEN 'Full Stack Developer'
  WHEN '00000000-0000-0000-0000-000000000016' THEN 'QA Engineer'
  WHEN '00000000-0000-0000-0000-000000000025' THEN 'QA Engineer'
  WHEN '00000000-0000-0000-0000-000000000026' THEN 'Automation QA Engineer'
  WHEN '00000000-0000-0000-0000-000000000027' THEN 'Automation QA Engineer'
  WHEN '00000000-0000-0000-0000-000000000015' THEN 'QA Lead'
  WHEN '00000000-0000-0000-0000-000000000046' THEN 'QA Lead'
  WHEN '00000000-0000-0000-0000-000000000017' THEN 'Product Manager'
  WHEN '00000000-0000-0000-0000-000000000018' THEN 'Product Manager'
  WHEN '00000000-0000-0000-0000-000000000011' THEN 'IT Service Delivery Manager'
  WHEN '00000000-0000-0000-0000-000000000047' THEN 'IT Service Delivery Manager'
  ELSE job_title
END
WHERE id IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000018',
  '00000000-0000-0000-0000-000000000023',
  '00000000-0000-0000-0000-000000000024',
  '00000000-0000-0000-0000-000000000025',
  '00000000-0000-0000-0000-000000000026',
  '00000000-0000-0000-0000-000000000027',
  '00000000-0000-0000-0000-000000000045',
  '00000000-0000-0000-0000-000000000046',
  '00000000-0000-0000-0000-000000000047'
);

-- =============================================================================
-- TICKETS
-- =============================================================================
INSERT INTO tickets (id, title, description, category_id, type, priority, status, submitted_by, replication_steps, created_at, closed_at, metadata)
VALUES
-- Ticket 1: P1 production incident — resolved
('20000000-0000-0000-0000-000000000001',
 'Production payment gateway returning 503 errors',
 'The payment gateway endpoint /api/v2/charges is returning HTTP 503 for approximately 30% of requests since 09:15 UTC. Customer transactions are failing with "service unavailable". Need immediate investigation.',
 '10000000-0000-0000-0000-000000000003', 'incident', 'P1', 'resolved',
 '00000000-0000-0000-0000-000000000020',
 '1. Attempt to checkout with any product\n2. Observe intermittent 503 on payment submit\n3. Check gateway logs for upstream timeout',
 NOW() - INTERVAL '14 days', NOW() - INTERVAL '12 days',
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000012", "reasoning": "Production incident matched to Senior Software Engineer Alex Johnson — best fit for payment gateway expertise.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "confidence": 0.92}}}'),

-- Ticket 2: P2 bug — in progress
('20000000-0000-0000-0000-000000000002',
 'User profile image upload fails for images > 2MB',
 'Uploading a profile avatar through /users/me/avatar consistently fails when the image exceeds 2MB. The UI shows a generic "upload failed" toast with no detail. Works fine under 2MB.',
 '10000000-0000-0000-0000-000000000002', 'bug', 'P2', 'in_progress',
 '00000000-0000-0000-0000-000000000021',
 '1. Go to Settings → Profile\n2. Select an image file larger than 2MB (e.g. a 4MB JPEG)\n3. Click Upload\n4. Observe "Upload failed" toast after ~3 seconds',
 NOW() - INTERVAL '5 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000013", "reasoning": "Bug ticket matched to Software Engineer Maria Garcia based on recent UI upload work.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "confidence": 0.85}}}'),

-- Ticket 3: P3 software request — assigned
('20000000-0000-0000-0000-000000000003',
 'Request: Install Figma on marketing team machines',
 'The marketing team needs Figma installed on 5 machines (Michael Lee, Jessica Park, Ryan O Brien, Lisa Chen, Derek Wu). All machines are MacBook Pro M3 running macOS Sequoia. Admin rights are not available to users.',
 '10000000-0000-0000-0000-000000000002', 'software', 'P3', 'assigned',
 '00000000-0000-0000-0000-000000000021', NULL,
 NOW() - INTERVAL '3 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000014", "reasoning": "Software installation request matched to Full Stack Developer James Wilson who handles end-user software provisioning.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "confidence": 0.78}}}'),

-- Ticket 4: P2 bug — open (unassigned)
('20000000-0000-0000-0000-000000000004',
 'Dark mode toggle does not persist across page navigation',
 'When a user toggles dark mode in Settings → Appearance, the theme switches correctly. However, navigating to any other page (or doing a full page reload) reverts to light mode. The preference is not being persisted to localStorage or the backend.',
 '10000000-0000-0000-0000-000000000002', 'bug', 'P2', 'open',
 '00000000-0000-0000-0000-000000000020',
 '1. Go to Settings → Appearance\n2. Toggle dark mode ON → theme switches correctly\n3. Click any nav link (Dashboard, Tickets, etc.)\n4. Observe: theme reverts to light mode',
 NOW() - INTERVAL '1 day', NULL,
 '{}'),

-- Ticket 5: P3 software — assigned
('20000000-0000-0000-0000-000000000005',
 'Jira integration: automatic ticket creation from support emails',
 'We would like to set up an automated workflow where support emails sent to helpdesk@lumina.com automatically create a Jira issue in the ITSM project. This is a request to evaluate and implement the integration.',
 '10000000-0000-0000-0000-000000000002', 'software', 'P3', 'assigned',
 '00000000-0000-0000-0000-000000000021',
 '1. Configure inbound email handler\n2. Map email fields to Jira fields\n3. Set up bi-directional status sync\n4. Test with sample tickets',
 NOW() - INTERVAL '2 hours', NULL,
 '{}'),

-- Ticket 6: P4 hardware — abandoned
('20000000-0000-0000-0000-000000000006',
 'Keyboard replacement request — Dell KB216 (Emily Davis)',
 'My Dell KB216 keyboard has a stuck "E" key that registers double presses intermittently. Requesting a replacement under the hardware warranty. Asset tag: LUM-DESK-0421.',
 '10000000-0000-0000-0000-000000000001', 'software', 'P4', 'abandoned',
 '00000000-0000-0000-0000-000000000020', NULL,
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days',
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000014", "reasoning": "Hardware replacement routed to James Wilson who handles desktop hardware provisioning.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "confidence": 0.72}}}'),

-- Ticket 7: P1 security incident — on hold
('20000000-0000-0000-0000-000000000007',
 'Suspicious login attempts detected — user jane.doe',
 'Jane Doe reported receiving multiple "new device login" email notifications over the past 48 hours originating from IPs in Russia and Brazil. Account has been temporarily suspended pending investigation.',
 '10000000-0000-0000-0000-000000000004', 'incident', 'P1', 'on_hold',
 '00000000-0000-0000-0000-000000000022',
 '1. Check auth audit logs for IP origins\n2. Verify no unauthorized data access\n3. Force password reset\n4. Enable MFA\n5. Monitor for 72 hours',
 NOW() - INTERVAL '7 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000011", "reasoning": "Security incident routed to IT Service Delivery Manager David Kim for cross-team escalation and coordination.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000011", "source": "lumina_ai", "confidence": 0.88}}}'),

-- Ticket 8: P3 network — assigned (QA)
('20000000-0000-0000-0000-000000000008',
 'VPN drops connection every ~15 minutes on macOS Sequoia',
 'Since upgrading to macOS Sequoia 15.1, the corporate WireGuard VPN drops the connection approximately every 15 minutes. Reconnecting works immediately but the drop interrupts ongoing work. Happens on both office and home networks.',
 '10000000-0000-0000-0000-000000000003', 'bug', 'P3', 'assigned',
 '00000000-0000-0000-0000-000000000020',
 '1. Connect to corporate VPN via WireGuard\n2. Work normally for ~15 minutes\n3. Observe: tunnel drops silently\n4. Manual reconnect works\n5. Cycle repeats',
 NOW() - INTERVAL '4 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000015", "reasoning": "VPN connectivity issue matched to QA Lead Priya Sharma as the ticket originator requested QA validation of the VPN client update.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000015", "source": "lumina_ai", "confidence": 0.81}}}'),

-- Ticket 9: P2 email — in progress (developer)
('20000000-0000-0000-0000-000000000009',
 'Outbound email to external domains delayed by 30+ minutes',
 'Emails sent from @lumina.test to external domains (gmail.com, outlook.com) are experiencing 30-60 minute delivery delays. Internal @lumina.test to @lumina.test delivery is instantaneous. Suspect SPF/DKIM configuration issue or upstream relay throttling.',
 '10000000-0000-0000-0000-000000000005', 'incident', 'P2', 'in_progress',
 '00000000-0000-0000-0000-000000000021',
 '1. Send test email from Outlook to personal Gmail\n2. Check message trace in admin console\n3. Observe "queued" status for 30+ min\n4. Check SPF, DKIM, DMARC DNS records',
 NOW() - INTERVAL '2 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000013", "reasoning": "Email infrastructure issue matched to Maria Garcia who manages the email relay service.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "confidence": 0.84}}}'),

-- Ticket 10: P4 account — resolved
('20000000-0000-0000-0000-000000000010',
 'New hire onboarding: account provisioning for John Smith',
 'John Smith starts on Monday as a Junior Data Analyst in the Analytics team. He needs: AD account, email, Slack, Jira access (Analytics project), GitHub read-only, and a company laptop (MacBook Pro). Onboarding ticket to track provisioning progress.',
 '10000000-0000-0000-0000-000000000006', 'software', 'P4', 'resolved',
 '00000000-0000-0000-0000-000000000021', NULL,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days',
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000014", "reasoning": "New hire provisioning routed to James Wilson who manages the account provisioning workflow.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "confidence": 0.76}}}'),

-- Ticket 11: P3 mobile — assigned (QA)
('20000000-0000-0000-0000-000000000011',
 'Company iPhone 15 Pro not receiving push notifications from Outlook',
 'After the iOS 18.2 update, push notifications from the company Outlook app stopped working. Background App Refresh is enabled, notifications are allowed, and the app is up to date. Battery optimization is off. Notifications work for other apps (Slack, Teams).',
 '10000000-0000-0000-0000-000000000007', 'bug', 'P3', 'assigned',
 '00000000-0000-0000-0000-000000000020',
 '1. iPhone 15 Pro, iOS 18.2, Outlook v4.2503\n2. Settings → Notifications → Outlook: All enabled\n3. Settings → General → Background App Refresh: ON\n4. Send test email from another account\n5. No notification appears on lock screen',
 NOW() - INTERVAL '2 days', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000016", "reasoning": "Mobile device issue matched to QA Engineer Tom Brown who is testing iOS 18.2 compatibility.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000016", "source": "lumina_ai", "confidence": 0.79}}}'),

-- Ticket 12: P2 printer — assigned
('20000000-0000-0000-0000-000000000012',
 'Network printer LUM-PR-003 (floor 3) showing "toner low" but cartridge is new',
 'The HP LaserJet Pro on floor 3 (LUM-PR-003) displays "Toner Low — Order Supplies" on the control panel. The toner cartridge was replaced yesterday with a genuine HP 58A cartridge. The printer has been power-cycled twice but the warning persists.',
 '10000000-0000-0000-0000-000000000008', 'software', 'P2', 'assigned',
 '00000000-0000-0000-0000-000000000021',
 '1. Check toner sensor status from printer web UI\n2. Confirm cartridge is genuine HP 58A (not third-party)\n3. Try reseating the cartridge\n4. Check firmware version — update if available\n5. Consider sensor calibration',
 NOW() - INTERVAL '1 day', NULL,
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000012", "reasoning": "Printer hardware issue matched to Alex Johnson who previously resolved a similar sensor calibration ticket.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "confidence": 0.71}}}')
ON CONFLICT (id) DO NOTHING;

-- Historical reporting tickets: 600 rows spread across December 1, 2025-May 28, 2026.
INSERT INTO tickets (id, title, description, category_id, type, priority, status, submitted_by, replication_steps, created_at, closed_at, metadata)
WITH source_rows AS (
  SELECT
    gs AS n,
    DATE '2025-12-01' + (((gs - 1) * 178) / 599)::int AS created_day,
    TIME '08:00:00' + (((gs * 37) % 540) * INTERVAL '1 minute') AS created_time
  FROM generate_series(1, 600) AS gs
),
ticket_shape AS (
  SELECT
    n,
    created_day + created_time AS created_at,
    EXTRACT(MONTH FROM (created_day + created_time + INTERVAL '8 hours'))::int AS local_month,
    CASE ((n - 1) % 8)
      WHEN 0 THEN '10000000-0000-0000-0000-000000000001'
      WHEN 1 THEN '10000000-0000-0000-0000-000000000002'
      WHEN 2 THEN '10000000-0000-0000-0000-000000000003'
      WHEN 3 THEN '10000000-0000-0000-0000-000000000004'
      WHEN 4 THEN '10000000-0000-0000-0000-000000000005'
      WHEN 5 THEN '10000000-0000-0000-0000-000000000006'
      WHEN 6 THEN '10000000-0000-0000-0000-000000000007'
      ELSE '10000000-0000-0000-0000-000000000008'
    END::uuid AS category_id,
    CASE ((n - 1) % 3)
      WHEN 0 THEN 'software'
      WHEN 1 THEN 'bug'
      ELSE 'incident'
    END::ticket_type AS type,
    CASE
      WHEN n % 23 = 0 THEN 'P1'
      WHEN n % 7 = 0 THEN 'P2'
      WHEN n % 3 = 0 THEN 'P3'
      ELSE 'P4'
    END::ticket_priority AS priority,
    CASE
      WHEN n > 588 AND n % 4 = 0 THEN 'open'
      WHEN n > 588 AND n % 4 = 1 THEN 'assigned'
      WHEN n > 588 AND n % 4 = 2 THEN 'in_progress'
      WHEN n > 588 THEN 'on_hold'
      WHEN n % 20 = 0 THEN 'abandoned'
      ELSE 'resolved'
    END::ticket_status AS status,
    CASE
      WHEN n % 10 = 0 THEN '00000000-0000-0000-0000-000000000010'
      WHEN n % 3 = 0 THEN '00000000-0000-0000-0000-000000000020'
      WHEN n % 3 = 1 THEN '00000000-0000-0000-0000-000000000021'
      ELSE '00000000-0000-0000-0000-000000000022'
    END::uuid AS submitted_by
  FROM source_rows
),
ticket_templates AS (
  SELECT *
  FROM (VALUES
    (0, 'Laptop dock intermittently disconnects USB devices', 'Users reported intermittent USB disconnects from workstation docks during normal office use.', '1. Connect laptop to dock\n2. Use keyboard, mouse, and webcam for one hour\n3. Observe USB devices disconnect briefly'),
    (1, 'Business app license request for project team', 'A team member requested access to a licensed business application needed for an active project.', NULL),
    (2, 'VPN connection unstable during video calls', 'Remote users reported VPN drops and reconnects while on video calls or transferring large files.', '1. Connect to VPN\n2. Join a video call\n3. Share screen or transfer a large file\n4. Observe VPN reconnect'),
    (3, 'MFA prompt loop after password reset', 'After a password reset, the user is repeatedly prompted for MFA and cannot complete sign-in.', '1. Reset password\n2. Sign in with new password\n3. Complete MFA challenge\n4. Observe repeated MFA prompt'),
    (4, 'Shared mailbox delivery delay', 'Messages sent to a shared mailbox arrived later than expected and delayed team response.', '1. Send email to shared mailbox\n2. Check delivery timestamp\n3. Compare against sender timestamp'),
    (5, 'New hire account provisioning request', 'A new employee requires standard access, collaboration tools, and device preparation before their start date.', NULL),
    (6, 'Mobile device cannot sync company calendar', 'A company mobile device stopped syncing calendar events after an operating system update.', '1. Open calendar app\n2. Pull to refresh\n3. Observe missing recent events'),
    (7, 'Printer queue stuck with pending jobs', 'A network printer queue stopped processing jobs and multiple users reported stuck print requests.', '1. Submit a print job\n2. Open printer queue\n3. Observe job remains pending')
  ) AS t(template_index, title, description, replication_steps)
)
SELECT
  ('21000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
  title || ' #' || n AS title,
  description || ' Seeded historical ticket for reporting coverage across the six-month window ending May 28, 2026.' AS description,
  category_id,
  type,
  priority,
  status,
  submitted_by,
  replication_steps,
  created_at,
  CASE
    WHEN status IN ('resolved', 'abandoned') THEN LEAST(
      created_at + CASE
        -- May should look strongest in HR monthly reports
        WHEN local_month = 5 THEN CASE (n % 6)
          WHEN 0 THEN INTERVAL '6 hours'
          WHEN 1 THEN INTERVAL '10 hours'
          WHEN 2 THEN INTERVAL '16 hours'
          WHEN 3 THEN INTERVAL '22 hours'
          WHEN 4 THEN INTERVAL '30 hours'
          ELSE INTERVAL '40 hours'
        END
        -- Other months remain good but less aggressive
        ELSE CASE (n % 8)
          WHEN 0 THEN INTERVAL '10 hours'
          WHEN 1 THEN INTERVAL '18 hours'
          WHEN 2 THEN INTERVAL '30 hours'
          WHEN 3 THEN INTERVAL '2 days'
          WHEN 4 THEN INTERVAL '4 days'
          WHEN 5 THEN INTERVAL '6 days'
          WHEN 6 THEN INTERVAL '9 days'
          ELSE INTERVAL '12 days'
        END
      END,
      TIMESTAMP '2026-05-28 17:30:00'
    )
    ELSE NULL
  END AS closed_at,
  jsonb_build_object(
    'seed_batch', 'historical_six_months_600',
    'sequence', n,
    'reporting_month', to_char(created_at, 'YYYY-MM'),
    'routing', jsonb_build_object(
      'source', 'seed_generator',
      'assigned_admin_id',
      CASE
        WHEN n % 10 = 0 THEN '00000000-0000-0000-0000-000000000010'
        WHEN n % 10 = 5 THEN '00000000-0000-0000-0000-000000000011'
        WHEN n % 2 = 0 AND n % 4 = 0 THEN '00000000-0000-0000-0000-000000000015'
        WHEN n % 2 = 0 THEN '00000000-0000-0000-0000-000000000016'
        WHEN n % 6 = 1 THEN '00000000-0000-0000-0000-000000000012'
        WHEN n % 6 = 3 THEN '00000000-0000-0000-0000-000000000013'
        ELSE '00000000-0000-0000-0000-000000000014'
      END,
      'confidence', round((0.68 + ((n % 23)::numeric / 100)), 2)
    )
  ) AS metadata
FROM ticket_shape
JOIN ticket_templates ON ticket_templates.template_index = ((ticket_shape.n - 1) % 8)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TICKET ASSIGNMENTS
-- =============================================================================
INSERT INTO ticket_assignment (id, ticket_id, assigned_to, assigned_by, is_active, assignment_role, assigned_at)
VALUES
  -- Ticket 1: resolved — Alex Johnson (dev)
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', FALSE, 'developer', NOW() - INTERVAL '14 days'),

  -- Ticket 2: in_progress — Maria Garcia (dev)
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '5 days'),

  -- Ticket 3: assigned — James Wilson (dev)
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '3 days'),

  -- Ticket 5: assigned — James Wilson (dev)
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '2 hours'),

  -- Ticket 6: abandoned — James Wilson (dev, historical)
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', FALSE, 'developer', NOW() - INTERVAL '20 days'),

  -- Ticket 7: on_hold — David Kim (manager)
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000010', TRUE, 'developer', NOW() - INTERVAL '7 days'),

  -- Ticket 8: assigned — Priya Sharma (QA)
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000011', TRUE, 'qa', NOW() - INTERVAL '4 days'),

  -- Also a dev assignment on ticket 8 (previous)
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', FALSE, 'developer', NOW() - INTERVAL '6 days'),

  -- Ticket 9: in_progress — Maria Garcia (dev)
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '2 days'),

  -- Ticket 10: resolved — James Wilson (dev)
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', FALSE, 'developer', NOW() - INTERVAL '10 days'),

  -- Ticket 11: assigned — Tom Brown (QA)
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000011', TRUE, 'qa', NOW() - INTERVAL '2 days'),

  -- Ticket 11: previous dev assignment
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000011', FALSE, 'developer', NOW() - INTERVAL '3 days'),

  -- Ticket 12: assigned — Alex Johnson (dev)
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Historical reporting assignments: spread across HR, Managers, Developers, and QA.
INSERT INTO ticket_assignment (id, ticket_id, assigned_to, assigned_by, is_active, assignment_role, assigned_at)
WITH generated_tickets AS (
  SELECT
    ((right(t.id::text, 12))::int) AS n,
    t.id AS ticket_id,
    t.status,
    t.created_at,
    EXTRACT(MONTH FROM (t.created_at + INTERVAL '8 hours'))::int AS local_month,
    ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS assignment_n
  FROM tickets t
  WHERE t.metadata->>'seed_batch' = 'historical_six_months_600'
)
SELECT
  ('31000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
  ticket_id,
  CASE
    -- May distribution favors high-performing Dev+QA contributors
    WHEN local_month = 5 AND assignment_n % 7 = 0 THEN '00000000-0000-0000-0000-000000000012' -- Alex Johnson
    WHEN local_month = 5 AND assignment_n % 7 = 1 THEN '00000000-0000-0000-0000-000000000013' -- Maria Garcia
    WHEN local_month = 5 AND assignment_n % 7 = 2 THEN '00000000-0000-0000-0000-000000000014' -- James Wilson
    WHEN local_month = 5 AND assignment_n % 7 = 3 THEN '00000000-0000-0000-0000-000000000023' -- Liam Patel
    WHEN local_month = 5 AND assignment_n % 7 = 4 THEN '00000000-0000-0000-0000-000000000015' -- Priya Sharma
    WHEN local_month = 5 AND assignment_n % 7 = 5 THEN '00000000-0000-0000-0000-000000000025' -- Nina Rao
    WHEN local_month = 5 THEN '00000000-0000-0000-0000-000000000027' -- Grace Park
    -- Other months keep broader realistic spread
    WHEN assignment_n % 2 = 0 AND assignment_n % 4 = 0 THEN '00000000-0000-0000-0000-000000000015'
    WHEN assignment_n % 2 = 0 THEN '00000000-0000-0000-0000-000000000016'
    WHEN assignment_n % 6 = 1 THEN '00000000-0000-0000-0000-000000000012'
    WHEN assignment_n % 6 = 3 THEN '00000000-0000-0000-0000-000000000013'
    WHEN assignment_n % 6 = 5 THEN '00000000-0000-0000-0000-000000000014'
    ELSE '00000000-0000-0000-0000-000000000023'
  END::uuid AS assigned_to,
  '00000000-0000-0000-0000-000000000011'::uuid AS assigned_by,
  TRUE AS is_active,
  CASE
    WHEN local_month = 5 AND assignment_n % 7 IN (4, 5, 6) THEN 'qa'
    WHEN assignment_n % 2 = 0 THEN 'qa'
    ELSE 'developer'
  END::assignment_role AS assignment_role,
  created_at + (((n % 9) + 1) * INTERVAL '20 minutes') AS assigned_at
FROM generated_tickets
ON CONFLICT (id) DO NOTHING;

-- Developer-owned historical tickets also get a QA partner.
-- This adds QA alongside the existing developer assignment; it does not replace ownership.
INSERT INTO ticket_assignment (id, ticket_id, assigned_to, assigned_by, is_active, assignment_role, assigned_at)
WITH developer_tickets AS (
  SELECT
    ((right(t.id::text, 12))::int) AS n,
    t.id AS ticket_id,
    t.created_at,
    ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS qa_n
  FROM tickets t
  JOIN ticket_assignment dev_assignment
    ON dev_assignment.ticket_id = t.id
   AND dev_assignment.is_active = TRUE
   AND dev_assignment.assignment_role = 'developer'
  JOIN users dev_user ON dev_user.id = dev_assignment.assigned_to
  WHERE t.metadata->>'seed_batch' = 'historical_six_months_600'
    AND dev_user.department = 'Developers'
    AND NOT EXISTS (
      SELECT 1
      FROM ticket_assignment existing_qa
      WHERE existing_qa.ticket_id = t.id
        AND existing_qa.is_active = TRUE
        AND existing_qa.assignment_role = 'qa'
    )
)
SELECT
  ('32000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
  ticket_id,
  CASE WHEN qa_n % 2 = 0
    THEN '00000000-0000-0000-0000-000000000015'
    ELSE '00000000-0000-0000-0000-000000000016'
  END::uuid AS assigned_to,
  '00000000-0000-0000-0000-000000000011'::uuid AS assigned_by,
  TRUE AS is_active,
  'qa'::assignment_role AS assignment_role,
  created_at + (((n % 9) + 2) * INTERVAL '30 minutes') AS assigned_at
FROM developer_tickets
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- TICKET COMMENTS
-- =============================================================================
INSERT INTO ticket_comments (id, ticket_id, author_id, body, created_at)
VALUES
  -- Ticket 1: Alex Johnson investigating payment incident
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000012',
   'Investigated the payment gateway. The upstream Stripe API returned 503 during a regional outage (us-east-1). Automatic retry logic was not handling the backoff correctly. Fixed by implementing exponential backoff with jitter. Gateway healthy since 14:30 UTC.',
   NOW() - INTERVAL '13 days'),

  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000012',
   'Added monitoring alerts for payment gateway error rate > 1%. PagerDuty integration configured. Postmortem to follow.',
   NOW() - INTERVAL '12 days'),

  -- Ticket 2: Maria Garcia investigating upload bug
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000013',
   'Reproduced the issue. The file upload middleware (multer) has a 2MB limit that returns a non-descript error. The frontend toast handler doesn''t distinguish LIMIT_FILE_SIZE from other errors. Working on a fix.',
   NOW() - INTERVAL '4 days'),

  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000013',
   'PR submitted: increased limit to 10MB, added proper error messages per file size and file type, and improved the frontend error toast to show the specific reason.',
   NOW() - INTERVAL '3 days'),

  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000015',
   'Reviewed the PR. Looks good overall. Requesting one change: the error message for LIMIT_FILE_SIZE should include the actual limit in human-readable format (e.g. "Max file size is 10MB").',
   NOW() - INTERVAL '2 days'),

  -- Ticket 6: James Wilson closing hardware ticket
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000014',
   'Replaced keyboard with new Dell KB216. Old unit returned to IT inventory for inspection.',
   NOW() - INTERVAL '18 days'),

  -- Ticket 7: David Kim on security incident
  ('40000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000011',
   'Reviewed auth logs. The login attempts were blocked by MFA challenge. No successful unauthorized access detected. Waiting for Jane to complete the account recovery process before closing.',
   NOW() - INTERVAL '6 days'),

  ('40000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000007',
   '00000000-0000-0000-0000-000000000011',
   'Account recovery completed. New MFA enrolled. geoblocking enabled for countries outside our operating regions. Monitoring for another 48 hours before closing.',
   NOW() - INTERVAL '5 days'),

  -- Ticket 8: Priya Sharma on VPN issue
  ('40000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000015',
   'Testing the WireGuard macOS Sequoia compatibility. Confirmed the 15-minute drop cycle. This appears to be a known macOS Sequoia issue with kernel extensions. Recommending upgrade to WireGuard 1.2.x which uses the new Network Extension framework instead of the kext.',
   NOW() - INTERVAL '3 days'),

  -- Ticket 9: Maria Garcia on email delay
  ('40000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000013',
   'Confirmed SPF and DKIM are correctly configured. The issue is with our outgoing relay — the SMTP relay (sendgrid) has a free tier rate limit that was hit. Need to upgrade to paid plan or verify the domain for higher limits.',
   NOW() - INTERVAL '1 day'),

  -- Ticket 12: Alex Johnson on printer issue
  ('40000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000012',
   'The toner level sensor is reporting a false positive. This is a known firmware bug in the HP LaserJet Pro series (firmware v2024.09). HP released a fix in firmware v2025.01. Will schedule the firmware update for tonight.',
   NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
INSERT INTO audit_logs (id, actor_id, action, metadata, created_at)
VALUES
  -- Ticket 1 lifecycle
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000001", "title": "Production payment gateway returning 503 errors", "type": "incident", "priority": "P1", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '14 days'),

  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000001", "assigned_to": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '14 days'),

  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000001", "old_status": "assigned", "new_status": "in_progress"}',
   NOW() - INTERVAL '13 days'),

  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000012', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000001", "old_status": "in_progress", "new_status": "resolved"}',
   NOW() - INTERVAL '12 days'),

  -- Ticket 2 lifecycle
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "title": "User profile image upload fails for images > 2MB", "type": "bug", "priority": "P2", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '5 days'),

  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "assigned_to": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '5 days'),

  ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000013', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "old_status": "assigned", "new_status": "in_progress"}',
   NOW() - INTERVAL '4 days'),

  -- Ticket 3 lifecycle
  ('50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000003", "title": "Request: Install Figma on marketing team machines", "type": "software", "priority": "P3", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000003", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '3 days'),

  -- Ticket 4 (open, no assignments)
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000004", "title": "Dark mode toggle does not persist across page navigation", "type": "bug", "priority": "P2", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '1 day'),

  -- Ticket 5 lifecycle
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000005", "title": "Jira integration: automatic ticket creation from support emails", "type": "software", "priority": "P3", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '2 hours'),

  -- Ticket 6 lifecycle
  ('50000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "title": "Keyboard replacement request", "type": "software", "priority": "P4", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '20 days'),

  ('50000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '20 days'),

  ('50000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000014', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "old_status": "assigned", "new_status": "resolved"}',
   NOW() - INTERVAL '18 days'),

  -- Ticket 7 lifecycle
  ('50000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000022', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "title": "Suspicious login attempts detected", "type": "incident", "priority": "P1", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000022"}',
   NOW() - INTERVAL '7 days'),

  ('50000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "assigned_to": "00000000-0000-0000-0000-000000000011", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '7 days'),

  ('50000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "old_status": "assigned", "new_status": "on_hold"}',
   NOW() - INTERVAL '6 days'),

  -- Ticket 8 lifecycle (routed from dev to QA)
  ('50000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "title": "VPN drops connection every ~15 minutes on macOS Sequoia", "type": "bug", "priority": "P3", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '6 days'),

  ('50000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "assigned_to": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '6 days'),

  ('50000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000012', 'ticket_routed_to_qa',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "assigned_to": "00000000-0000-0000-0000-000000000015", "assignment_mode": "qa_routing", "routing_source": "rules_fallback"}',
   NOW() - INTERVAL '4 days'),

  -- Ticket 9 lifecycle
  ('50000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "title": "Outbound email to external domains delayed by 30+ minutes", "type": "incident", "priority": "P2", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '2 days'),

  ('50000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "assigned_to": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '2 days'),

  ('50000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000013', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "old_status": "assigned", "new_status": "in_progress"}',
   NOW() - INTERVAL '1 day'),

  -- Ticket 10 lifecycle
  ('50000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "title": "New hire onboarding: account provisioning for John Smith", "type": "software", "priority": "P4", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '10 days'),

  ('50000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '10 days'),

  ('50000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000014', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "old_status": "assigned", "new_status": "resolved"}',
   NOW() - INTERVAL '8 days'),

  -- Ticket 11 lifecycle
  ('50000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "title": "Company iPhone 15 Pro not receiving push notifications from Outlook", "type": "bug", "priority": "P3", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-00000000001c', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-00000000001d', '00000000-0000-0000-0000-000000000014', 'ticket_routed_to_qa',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "assigned_to": "00000000-0000-0000-0000-000000000016", "assignment_mode": "dev_routing", "routing_source": "lumina_ai"}',
   NOW() - INTERVAL '2 days'),

  -- Ticket 12 lifecycle
  ('50000000-0000-0000-0000-00000000001e', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000012", "title": "Network printer LUM-PR-003 showing toner low but cartridge is new", "type": "software", "priority": "P2", "initial_status": "open", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '1 day'),

  ('50000000-0000-0000-0000-00000000001f', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000012", "assigned_to": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Historical reporting audit logs for completed generated tickets.
INSERT INTO audit_logs (id, actor_id, action, metadata, created_at)
SELECT
  ('51000000-0000-0000-0000-' || lpad(((right(t.id::text, 12))::int)::text, 12, '0'))::uuid AS id,
  ta.assigned_to AS actor_id,
  'ticket_status_changed' AS action,
  jsonb_build_object(
    'ticket_id', t.id::text,
    'old_status', 'in_progress',
    'new_status', t.status::text,
    'seed_batch', 'historical_six_months_600'
  ) AS metadata,
  t.closed_at AS created_at
FROM tickets t
JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
WHERE t.metadata->>'seed_batch' = 'historical_six_months_600'
  AND t.status IN ('resolved', 'abandoned')
  AND t.closed_at IS NOT NULL
ON CONFLICT (id) DO NOTHING;
