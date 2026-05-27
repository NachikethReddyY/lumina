-- =============================================================================
-- Lumina seed data (development only)
-- =============================================================================
-- Load AFTER backend/db/DDL.sql:
--   psql "$DATABASE_URL" -f backend/db/DDL.sql -f backend/db/seed.sql
--
-- All passwords are set to: Password1!
-- =============================================================================

-- =============================================================================
-- USERS
-- =============================================================================
-- System / special accounts
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'lumina.ai@lumina.test', NULL,
   'Lumina', 'AI', 'user', 'suspended', TRUE, FALSE, NULL, NULL, NULL, FALSE, NULL, NULL),

  ('00000000-0000-0000-0000-000000000002', 'pending.user@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Pending', 'User', 'user', 'pending', FALSE, FALSE, NULL, NULL, NULL, FALSE, NULL, NULL);

-- HR & Management
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'sarah.chen@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Sarah', 'Chen', 'admin', 'active', TRUE, TRUE, 'HR Director', 'HR', NULL, TRUE, NULL, NULL),

  ('00000000-0000-0000-0000-000000000011', 'david.kim@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'David', 'Kim', 'admin', 'active', TRUE, TRUE, 'IT Service Delivery Manager', 'Managers', NULL, TRUE, NULL, NULL);

-- Developers
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at)
VALUES
  ('00000000-0000-0000-0000-000000000012', 'alex.johnson@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Alex', 'Johnson', 'admin', 'active', TRUE, TRUE, 'Senior Software Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '60 days'),

  ('00000000-0000-0000-0000-000000000013', 'maria.garcia@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Maria', 'Garcia', 'admin', 'active', TRUE, TRUE, 'Software Engineer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '45 days'),

  ('00000000-0000-0000-0000-000000000014', 'james.wilson@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'James', 'Wilson', 'admin', 'active', TRUE, TRUE, 'Full Stack Developer', 'Developers', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '30 days');

-- QA
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at)
VALUES
  ('00000000-0000-0000-0000-000000000015', 'priya.sharma@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Priya', 'Sharma', 'admin', 'active', TRUE, TRUE, 'QA Lead', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '50 days'),

  ('00000000-0000-0000-0000-000000000016', 'tom.brown@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Tom', 'Brown', 'admin', 'active', TRUE, TRUE, 'QA Engineer', 'QA', NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '20 days');

-- Regular users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_is_verified, name_set, job_title, department, avatar_url, onboarding_completed, approved_by, approved_at)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'emily.davis@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Emily', 'Davis', 'user', 'active', TRUE, TRUE, 'Product Designer', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '40 days'),

  ('00000000-0000-0000-0000-000000000021', 'michael.lee@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Michael', 'Lee', 'user', 'active', TRUE, TRUE, 'Marketing Coordinator', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '35 days'),

  ('00000000-0000-0000-0000-000000000022', 'jane.doe@lumina.test',
   crypt('Password1!', gen_salt('bf')),
   'Jane', 'Doe', 'user', 'suspended', TRUE, TRUE, 'former employee', NULL, NULL, TRUE, '00000000-0000-0000-0000-000000000010', NOW() - INTERVAL '90 days');

-- =============================================================================
-- CATEGORIES
-- =============================================================================
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
   '00000000-0000-0000-0000-000000000011', TRUE);

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

-- Ticket 5: P3 software — pending routing (fresh)
('20000000-0000-0000-0000-000000000005',
 'Jira integration: automatic ticket creation from support emails',
 'We would like to set up an automated workflow where support emails sent to helpdesk@lumina.com automatically create a Jira issue in the ITSM project. This is a request to evaluate and implement the integration.',
 '10000000-0000-0000-0000-000000000002', 'software', 'P3', 'pending_routing',
 '00000000-0000-0000-0000-000000000021',
 '1. Configure inbound email handler\n2. Map email fields to Jira fields\n3. Set up bi-directional status sync\n4. Test with sample tickets',
 NOW() - INTERVAL '2 hours', NULL,
 '{}'),

-- Ticket 6: P4 hardware — closed
('20000000-0000-0000-0000-000000000006',
 'Keyboard replacement request — Dell KB216 (Emily Davis)',
 'My Dell KB216 keyboard has a stuck "E" key that registers double presses intermittently. Requesting a replacement under the hardware warranty. Asset tag: LUM-DESK-0421.',
 '10000000-0000-0000-0000-000000000001', 'software', 'P4', 'closed',
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
 '{"routing": {"source": "lumina_ai", "assigned_admin_id": "00000000-0000-0000-0000-000000000012", "reasoning": "Printer hardware issue matched to Alex Johnson who previously resolved a similar sensor calibration ticket.", "decision": {"assigned_admin_id": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "confidence": 0.71}}}');

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

  -- Ticket 6: closed — James Wilson (dev, historical)
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
   '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', TRUE, 'developer', NOW() - INTERVAL '1 day');

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
   NOW() - INTERVAL '12 hours');

-- =============================================================================
-- AUDIT LOGS
-- =============================================================================
INSERT INTO audit_logs (id, actor_id, action, metadata, created_at)
VALUES
  -- Ticket 1 lifecycle
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000001", "title": "Production payment gateway returning 503 errors", "type": "incident", "priority": "P1", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
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
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "title": "User profile image upload fails for images > 2MB", "type": "bug", "priority": "P2", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '5 days'),

  ('50000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "assigned_to": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '5 days'),

  ('50000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000013', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000002", "old_status": "assigned", "new_status": "in_progress"}',
   NOW() - INTERVAL '4 days'),

  -- Ticket 3 lifecycle
  ('50000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000003", "title": "Request: Install Figma on marketing team machines", "type": "software", "priority": "P3", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000003", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '3 days'),

  -- Ticket 4 (open, no assignments)
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000004", "title": "Dark mode toggle does not persist across page navigation", "type": "bug", "priority": "P2", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '1 day'),

  -- Ticket 5 (pending routing, no assignments)
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000005", "title": "Jira integration: automatic ticket creation from support emails", "type": "software", "priority": "P3", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '2 hours'),

  -- Ticket 6 lifecycle
  ('50000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "title": "Keyboard replacement request", "type": "software", "priority": "P4", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '20 days'),

  ('50000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '20 days'),

  ('50000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000014', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000006", "old_status": "assigned", "new_status": "resolved"}',
   NOW() - INTERVAL '18 days'),

  -- Ticket 7 lifecycle
  ('50000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000022', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "title": "Suspicious login attempts detected", "type": "incident", "priority": "P1", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000022"}',
   NOW() - INTERVAL '7 days'),

  ('50000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "assigned_to": "00000000-0000-0000-0000-000000000011", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '7 days'),

  ('50000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000007", "old_status": "assigned", "new_status": "on_hold"}',
   NOW() - INTERVAL '6 days'),

  -- Ticket 8 lifecycle (routed from dev to QA)
  ('50000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "title": "VPN drops connection every ~15 minutes on macOS Sequoia", "type": "bug", "priority": "P3", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '6 days'),

  ('50000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "assigned_to": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '6 days'),

  ('50000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000012', 'ticket_routed_to_qa',
   '{"ticket_id": "20000000-0000-0000-0000-000000000008", "assigned_to": "00000000-0000-0000-0000-000000000015", "assignment_mode": "qa_routing", "routing_source": "rules_fallback"}',
   NOW() - INTERVAL '4 days'),

  -- Ticket 9 lifecycle
  ('50000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "title": "Outbound email to external domains delayed by 30+ minutes", "type": "incident", "priority": "P2", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '2 days'),

  ('50000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "assigned_to": "00000000-0000-0000-0000-000000000013", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '2 days'),

  ('50000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000013', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000009", "old_status": "assigned", "new_status": "in_progress"}',
   NOW() - INTERVAL '1 day'),

  -- Ticket 10 lifecycle
  ('50000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "title": "New hire onboarding: account provisioning for John Smith", "type": "software", "priority": "P4", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '10 days'),

  ('50000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '10 days'),

  ('50000000-0000-0000-0000-00000000001a', '00000000-0000-0000-0000-000000000014', 'ticket_status_changed',
   '{"ticket_id": "20000000-0000-0000-0000-000000000010", "old_status": "assigned", "new_status": "resolved"}',
   NOW() - INTERVAL '8 days'),

  -- Ticket 11 lifecycle
  ('50000000-0000-0000-0000-00000000001b', '00000000-0000-0000-0000-000000000020', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "title": "Company iPhone 15 Pro not receiving push notifications from Outlook", "type": "bug", "priority": "P3", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000020"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-00000000001c', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "assigned_to": "00000000-0000-0000-0000-000000000014", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '3 days'),

  ('50000000-0000-0000-0000-00000000001d', '00000000-0000-0000-0000-000000000014', 'ticket_routed_to_qa',
   '{"ticket_id": "20000000-0000-0000-0000-000000000011", "assigned_to": "00000000-0000-0000-0000-000000000016", "assignment_mode": "dev_routing", "routing_source": "lumina_ai"}',
   NOW() - INTERVAL '2 days'),

  -- Ticket 12 lifecycle
  ('50000000-0000-0000-0000-00000000001e', '00000000-0000-0000-0000-000000000021', 'ticket_created',
   '{"ticket_id": "20000000-0000-0000-0000-000000000012", "title": "Network printer LUM-PR-003 showing toner low but cartridge is new", "type": "software", "priority": "P2", "initial_status": "pending_routing", "submitted_by": "00000000-0000-0000-0000-000000000021"}',
   NOW() - INTERVAL '1 day'),

  ('50000000-0000-0000-0000-00000000001f', '00000000-0000-0000-0000-000000000011', 'ticket_assigned',
   '{"ticket_id": "20000000-0000-0000-0000-000000000012", "assigned_to": "00000000-0000-0000-0000-000000000012", "source": "lumina_ai", "assignment_mode": "lumina_ai_pipeline"}',
   NOW() - INTERVAL '1 day');

-- =============================================================================
-- CHAT CONVERSATIONS & MESSAGES
-- =============================================================================
INSERT INTO chat_conversations (id, user_id, status, created_at, last_message_at)
VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 'open',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

INSERT INTO chat_messages (id, conversation_id, sender_id, body, is_read, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'Hi there! I''m having trouble with my laptop docking station. The USB ports stop working after about an hour.', TRUE,
   NOW() - INTERVAL '2 days'),

  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000014',
   'Hi Emily, sorry to hear that. Which dock model are you using? Is it the Dell WD22TB4?', TRUE,
   NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),

  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'Yes, the WD22TB4. It started after the last firmware update IT pushed last week.', TRUE,
   NOW() - INTERVAL '2 days' + INTERVAL '8 minutes'),

  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000014',
   'Got it. There''s a known issue with that firmware version. I''ll create a ticket and we can get you a replacement dock in the meantime. Let me check inventory.', FALSE,
   NOW() - INTERVAL '1 day');

-- =============================================================================
-- OAUTH ACCOUNTS
-- =============================================================================
INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, created_at)
VALUES
  ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020',
   'google', 'google-oauth2|117894567890123456789',
   NOW() - INTERVAL '40 days');
