-- =============================================================================
-- SEED: Ticket closure analytics (Jan–May 2026)
-- =============================================================================
-- Purpose:
--   • Powers "Amount of time to resolve issues" dashboard chart
--   • Assigns work to Developers and QA (see ticket_assignment block below)
-- Idempotent: title-based dedupe on insert; NOT EXISTS on assignments/ratings
-- Run after: backend/db/DDL.sql
-- =============================================================================

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;
  
INSERT INTO tickets (
  title,
  description,
  category_id,
  type,
  priority,
  status,
  submitted_by,
  replication_steps,
  metadata,
  created_at,
  closed_at
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
  seed.created_at::timestamptz,
  seed.closed_at::timestamptz
FROM (
  VALUES
    -- February 2026 (15 tickets)
    ('Database connection pool exhaustion', 'Connection pool reaches max under peak load', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'engineer.maya@lumina.test', 'Monitor connections during load test', '{"source":"seed","month":"january"}', '2026-01-02 08:15:00', '2026-01-03 14:30:00'),
    ('Cache invalidation bug', 'Stale cache causes incorrect user permissions', 'Bug Reports', 'bug', 'P1', 'closed', 'engineer.alex@lumina.test', 'Clear cache and re-login', '{"source":"seed","month":"january"}', '2026-01-05 10:20:00', '2026-01-06 16:45:00'),
    ('API rate limiting misconfiguration', 'Rate limit headers return incorrect values', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'qa.michael@lumina.test', 'Make rapid API calls', '{"source":"seed","month":"january"}', '2026-01-08 09:00:00', '2026-01-10 17:00:00'),
    ('Email template rendering issue', 'HTML tags appear as text in emails', 'Software Support', 'bug', 'P2', 'closed', 'qa.lisa@lumina.test', 'Trigger email from settings', '{"source":"seed","month":"january"}', '2026-01-12 14:30:00', '2026-01-14 11:20:00'),
    ('Search indexing delay', 'New records not appearing in search for 5 minutes', 'Bug Reports', 'software', 'P3', 'closed', 'test.brandon@lumina.test', 'Create record and search immediately', '{"source":"seed","month":"january"}', '2026-01-15 11:00:00', '2026-01-18 13:45:00'),
    ('Mobile responsive layout broken', 'Content overlaps on tablet view', 'Bug Reports', 'bug', 'P2', 'closed', 'automation.victor@lumina.test', 'Open on iPad in portrait mode', '{"source":"seed","month":"january"}', '2026-01-18 16:20:00', '2026-01-20 10:15:00'),
    ('PDF export memory leak', 'Large exports cause out of memory error', 'Software Support', 'incident', 'P1', 'closed', 'engineer.james@lumina.test', 'Export 10000 record dataset', '{"source":"seed","month":"january"}', '2026-01-20 09:30:00', '2026-01-22 15:45:00'),
    ('Authentication session timeout inconsistent', 'Timeout varies between 15 and 30 minutes', 'Software Support', 'bug', 'P2', 'closed', 'qa.emma@lumina.test', 'Monitor session activity logs', '{"source":"seed","month":"january"}', '2026-01-22 13:15:00', '2026-01-25 09:20:00'),
    ('Dashboard widget load order randomized', 'Widgets load in random order on page refresh', 'Bug Reports', 'bug', 'P3', 'closed', 'automation.samantha@lumina.test', 'Refresh dashboard repeatedly', '{"source":"seed","month":"january"}', '2026-01-25 10:45:00', '2026-01-28 14:30:00'),
    ('File upload progress indicator stuck', 'Progress bar gets stuck at 99%', 'Bug Reports', 'bug', 'P2', 'closed', 'test.sarah@lumina.test', 'Upload large file via UI', '{"source":"seed","month":"january"}', '2026-01-28 15:00:00', '2026-01-31 16:20:00'),
    ('Notification duplicate messages', 'Users receive same notification twice', 'Software Support', 'software', 'P2', 'closed', 'engineer.sophia@lumina.test', 'Check notification queue logs', '{"source":"seed","month":"january"}', '2026-01-03 11:30:00', '2026-01-05 17:45:00'),
    ('API documentation outdated', 'Docs show deprecated endpoints', 'Software Support', 'software', 'P4', 'closed', 'qa.christopher@lumina.test', 'Compare API response vs docs', '{"source":"seed","month":"january"}', '2026-01-10 14:00:00', '2026-01-16 10:30:00'),
    ('Database backup incomplete', 'Backup process terminates early', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'platform.marcus@lumina.test', 'Check backup logs', '{"source":"seed","month":"january"}', '2026-01-13 22:00:00', '2026-01-14 08:30:00'),
    ('Third party API integration timeout', 'Calls to payment provider timeout after 5s', 'Software Support', 'software', 'P1', 'closed', 'platform.elena@lumina.test', 'Process payment in test mode', '{"source":"seed","month":"january"}', '2026-01-17 09:15:00', '2026-01-19 14:00:00'),
    ('Data export formatting issues', 'CSV export has misaligned columns', 'Bug Reports', 'bug', 'P3', 'closed', 'automation.daniel@lumina.test', 'Export data to CSV', '{"source":"seed","month":"january"}', '2026-01-23 10:20:00', '2026-01-27 11:45:00'),

    -- February 2025 (16 tickets)
    ('Concurrent user session conflicts', 'Two sessions from same user cause conflicts', 'Software Support', 'bug', 'P1', 'closed', 'engineer.maya@lumina.test', 'Login on two devices simultaneously', '{"source":"seed","month":"february"}', '2026-02-01 08:00:00', '2026-02-03 16:30:00'),
    ('Search filter performance degradation', 'Filter takes 10 seconds with 100k records', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'engineer.alex@lumina.test', 'Apply filter on large dataset', '{"source":"seed","month":"february"}', '2026-02-04 11:20:00', '2026-02-07 13:00:00'),
    ('Report scheduling timezone issue', 'Scheduled reports run at wrong time', 'Software Support', 'bug', 'P2', 'closed', 'qa.michael@lumina.test', 'Schedule report for different timezone', '{"source":"seed","month":"february"}', '2026-02-06 14:45:00', '2026-02-09 10:15:00'),
    ('User avatar upload fails silently', 'Avatar doesn''t upload but no error shown', 'Bug Reports', 'bug', 'P3', 'closed', 'qa.lisa@lumina.test', 'Upload avatar image', '{"source":"seed","month":"february"}', '2026-02-08 09:30:00', '2026-02-12 14:20:00'),
    ('Webhook event retry logic broken', 'Failed webhooks never retry', 'Software Support', 'incident', 'P1', 'closed', 'test.brandon@lumina.test', 'Trigger webhook and check logs', '{"source":"seed","month":"february"}', '2026-02-10 16:00:00', '2026-02-11 13:45:00'),
    ('Export to Excel file corruption', 'Large exports produce corrupt .xlsx files', 'Bug Reports', 'bug', 'P1', 'closed', 'automation.victor@lumina.test', 'Export 50000 rows to Excel', '{"source":"seed","month":"february"}', '2026-02-12 10:15:00', '2026-02-14 15:30:00'),
    ('User preference not persisting', 'Theme preference resets on logout', 'Software Support', 'bug', 'P2', 'closed', 'engineer.james@lumina.test', 'Change theme and logout', '{"source":"seed","month":"february"}', '2026-02-14 13:20:00', '2026-02-17 09:45:00'),
    ('Bulk action timeout for 10k+ records', 'Bulk operations fail with timeout', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'qa.emma@lumina.test', 'Perform bulk action on large dataset', '{"source":"seed","month":"february"}', '2026-02-16 11:00:00', '2026-02-19 14:30:00'),
    ('Comment character limit not enforced', 'Users can post comments exceeding limit', 'Bug Reports', 'bug', 'P3', 'closed', 'automation.samantha@lumina.test', 'Post very long comment', '{"source":"seed","month":"february"}', '2026-02-18 15:30:00', '2026-02-22 10:20:00'),
    ('Audit log events missing', 'Some user actions not recorded in audit log', 'Software Support', 'software', 'P2', 'closed', 'test.sarah@lumina.test', 'Perform action and check audit log', '{"source":"seed","month":"february"}', '2026-02-20 09:45:00', '2026-02-24 13:15:00'),
    ('Two-factor authentication reset flow broken', '2FA reset doesn''t validate properly', 'Software Support', 'bug', 'P1', 'closed', 'engineer.sophia@lumina.test', 'Reset 2FA and re-authenticate', '{"source":"seed","month":"february"}', '2026-02-22 14:00:00', '2026-02-24 16:45:00'),
    ('Data migration script incomplete', 'Not all legacy data migrated correctly', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'qa.christopher@lumina.test', 'Verify migration logs', '{"source":"seed","month":"february"}', '2026-02-05 22:30:00', '2026-02-06 10:00:00'),
    ('Image resize quality degradation', 'Resized images appear blurry', 'Bug Reports', 'bug', 'P2', 'closed', 'platform.marcus@lumina.test', 'Upload and resize image', '{"source":"seed","month":"february"}', '2026-02-07 10:00:00', '2026-02-11 15:20:00'),
    ('Integration test flakiness', 'Tests randomly fail without code changes', 'Software Support', 'software', 'P2', 'closed', 'platform.elena@lumina.test', 'Run integration test suite 10 times', '{"source":"seed","month":"february"}', '2026-02-09 16:30:00', '2026-02-13 11:00:00'),
    ('Email notification unsubscribe not working', 'Users cannot unsubscribe from emails', 'Software Support', 'bug', 'P2', 'closed', 'automation.daniel@lumina.test', 'Click unsubscribe link in email', '{"source":"seed","month":"february"}', '2026-02-15 12:15:00', '2026-02-18 14:45:00'),
    ('Scheduled maintenance window not communicated', 'Users unaware of planned downtime', 'Software Support', 'software', 'P3', 'closed', 'test.nathan@lumina.test', 'Check maintenance notifications', '{"source":"seed","month":"february"}', '2026-02-25 10:00:00', '2026-02-28 09:30:00'),

    -- March 2025 (14 tickets)
    ('Memory leak in background worker', 'Worker memory increases 100MB/hour', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'engineer.maya@lumina.test', 'Monitor worker memory usage', '{"source":"seed","month":"march"}', '2026-03-01 09:00:00', '2026-03-02 15:45:00'),
    ('Form submission validation bypass', 'Invalid data passes client-side validation', 'Bug Reports', 'bug', 'P1', 'closed', 'engineer.alex@lumina.test', 'Submit form with invalid data', '{"source":"seed","month":"march"}', '2026-03-03 14:20:00', '2026-03-05 11:30:00'),
    ('Database query slow on specific records', 'Single query takes 30+ seconds', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'qa.michael@lumina.test', 'Query specific record set', '{"source":"seed","month":"march"}', '2026-03-05 10:15:00', '2026-03-08 14:00:00'),
    ('Customizable dashboard loses settings', 'Dashboard layout resets unpredictably', 'Software Support', 'bug', 'P2', 'closed', 'qa.lisa@lumina.test', 'Configure dashboard and wait', '{"source":"seed","month":"march"}', '2026-03-07 11:45:00', '2026-03-10 16:20:00'),
    ('CSV import character encoding issue', 'Non-ASCII characters become garbled', 'Bug Reports', 'bug', 'P2', 'closed', 'test.brandon@lumina.test', 'Import CSV with special characters', '{"source":"seed","month":"march"}', '2026-03-09 13:30:00', '2026-03-12 10:45:00'),
    ('Real-time data sync delay', 'Live data updates show 2-3 minute delay', 'Software Support', 'software', 'P2', 'closed', 'automation.victor@lumina.test', 'Monitor real-time data feed', '{"source":"seed","month":"march"}', '2026-03-11 15:00:00', '2026-03-15 11:15:00'),
    ('API response includes sensitive data', 'Accidentally exposing internal IDs', 'Software Support', 'bug', 'P1', 'closed', 'engineer.james@lumina.test', 'Inspect API response payload', '{"source":"seed","month":"march"}', '2026-03-13 09:20:00', '2026-03-14 14:30:00'),
    ('Pagination cursor becomes invalid', 'Cannot navigate past page 5 in results', 'Bug Reports', 'bug', 'P2', 'closed', 'qa.emma@lumina.test', 'Navigate through paginated results', '{"source":"seed","month":"march"}', '2026-03-15 10:00:00', '2026-03-18 13:45:00'),
    ('Role-based access control inconsistency', 'Permissions check varies across endpoints', 'Software Support', 'software', 'P1', 'closed', 'automation.samantha@lumina.test', 'Test access with different roles', '{"source":"seed","month":"march"}', '2026-03-17 14:15:00', '2026-03-19 16:00:00'),
    ('Message queue processing halted', 'Queue processor crashes silently', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'test.sarah@lumina.test', 'Check message queue logs', '{"source":"seed","month":"march"}', '2026-03-19 23:00:00', '2026-03-20 08:30:00'),
    ('Rate limit not applying to specific IPs', 'Bulk requests from single IP not throttled', 'Software Support', 'bug', 'P2', 'closed', 'engineer.sophia@lumina.test', 'Send bulk requests from one IP', '{"source":"seed","month":"march"}', '2026-03-21 11:30:00', '2026-03-24 15:45:00'),
    ('Language localization incomplete', 'Some UI text not translated', 'Software Support', 'software', 'P3', 'closed', 'qa.christopher@lumina.test', 'Switch to non-English language', '{"source":"seed","month":"march"}', '2026-03-23 10:45:00', '2026-03-27 11:20:00'),
    ('Database replication lag increasing', 'Replica 5 minutes behind primary', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'platform.marcus@lumina.test', 'Monitor replication status', '{"source":"seed","month":"march"}', '2026-03-25 16:00:00', '2026-03-28 14:30:00'),
    ('Backup restore process fails silently', 'Restore doesn''t complete or report errors', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'platform.elena@lumina.test', 'Attempt restore from backup', '{"source":"seed","month":"march"}', '2026-03-27 10:00:00', '2026-03-28 09:15:00'),

    -- April 2025 (12 tickets)
    ('Load balancer connection timeout', 'Requests timeout after 30 seconds', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'engineer.maya@lumina.test', 'Send long-running request', '{"source":"seed","month":"april"}', '2026-04-01 08:30:00', '2026-04-02 12:45:00'),
    ('User bulk export memory issue', 'Exporting all users causes out of memory', 'Software Support', 'bug', 'P2', 'closed', 'engineer.alex@lumina.test', 'Export all users', '{"source":"seed","month":"april"}', '2026-04-03 11:00:00', '2026-04-05 15:20:00'),
    ('Notification email subject line truncated', 'Subject line cuts off after 50 chars', 'Bug Reports', 'bug', 'P3', 'closed', 'qa.michael@lumina.test', 'Check email subject in inbox', '{"source":"seed","month":"april"}', '2026-04-05 14:30:00', '2026-04-08 11:45:00'),
    ('API batch request endpoint bug', 'Batch requests fail partially without error', 'Software Support', 'software', 'P1', 'closed', 'qa.lisa@lumina.test', 'Send batch API request', '{"source":"seed","month":"april"}', '2026-04-07 09:15:00', '2026-04-09 14:00:00'),
    ('Dashboard chart rendering lag', 'Charts take 5+ seconds to render', 'Bug Reports', 'bug', 'P2', 'closed', 'test.brandon@lumina.test', 'Load dashboard with many charts', '{"source":"seed","month":"april"}', '2026-04-09 13:45:00', '2026-04-12 10:30:00'),
    ('File size validation incorrect', 'Can upload files larger than limit', 'Software Support', 'bug', 'P2', 'closed', 'automation.victor@lumina.test', 'Upload oversized file', '{"source":"seed","month":"april"}', '2026-04-11 10:20:00', '2026-04-14 16:15:00'),
    ('Sidebar navigation links broken', 'Some navigation links return 404', 'Bug Reports', 'bug', 'P2', 'closed', 'engineer.james@lumina.test', 'Click navigation links', '{"source":"seed","month":"april"}', '2026-04-13 15:00:00', '2026-04-16 11:45:00'),
    ('User deletion cascading issue', 'Deleting user leaves orphaned records', 'Software Support', 'software', 'P1', 'closed', 'qa.emma@lumina.test', 'Delete user and check references', '{"source":"seed","month":"april"}', '2026-04-15 09:30:00', '2026-04-17 14:20:00'),
    ('Timezone conversion in reports', 'Report times show in wrong timezone', 'Software Support', 'bug', 'P2', 'closed', 'automation.samantha@lumina.test', 'Generate report from different timezone', '{"source":"seed","month":"april"}', '2026-04-17 11:15:00', '2026-04-20 13:45:00'),
    ('Cache TTL not respected', 'Cached data persists longer than TTL', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'test.sarah@lumina.test', 'Monitor cache expiration', '{"source":"seed","month":"april"}', '2026-04-19 14:00:00', '2026-04-22 16:30:00'),
    ('User token refresh race condition', 'Token refresh sometimes fails under load', 'Software Support', 'bug', 'P1', 'closed', 'engineer.sophia@lumina.test', 'Refresh token under concurrent load', '{"source":"seed","month":"april"}', '2026-04-21 10:45:00', '2026-04-23 15:00:00'),
    ('Mobile app version check error', 'Version check endpoint returns wrong data', 'Bug Reports', 'bug', 'P2', 'closed', 'qa.christopher@lumina.test', 'Check app version on mobile', '{"source":"seed","month":"april"}', '2026-04-23 13:20:00', '2026-04-26 10:15:00'),

    -- May 2025 (10 tickets)
    ('Database index fragmentation', 'Query performance degrading due to fragmentation', 'Platform & Infrastructure', 'software', 'P2', 'closed', 'engineer.maya@lumina.test', 'Check index fragmentation levels', '{"source":"seed","month":"may"}', '2026-05-01 09:00:00', '2026-05-03 14:30:00'),
    ('Search autocomplete performance', 'Autocomplete takes 2+ seconds', 'Software Support', 'bug', 'P2', 'closed', 'engineer.alex@lumina.test', 'Type in search autocomplete', '{"source":"seed","month":"may"}', '2026-05-03 11:20:00', '2026-05-06 15:45:00'),
    ('Export schedule missing timezone', 'Scheduled exports run at wrong UTC offset', 'Bug Reports', 'bug', 'P2', 'closed', 'qa.michael@lumina.test', 'Schedule export at specific time', '{"source":"seed","month":"may"}', '2026-05-05 14:15:00', '2026-05-08 11:30:00'),
    ('Widget update not reflected', 'Widget changes don''t appear in UI', 'Software Support', 'bug', 'P2', 'closed', 'qa.lisa@lumina.test', 'Update widget and refresh page', '{"source":"seed","month":"may"}', '2026-05-07 10:45:00', '2026-05-10 16:20:00'),
    ('Concurrent table updates conflict', 'Two updates to same table interfere', 'Software Support', 'software', 'P1', 'closed', 'test.brandon@lumina.test', 'Update same record simultaneously', '{"source":"seed","month":"may"}', '2026-05-09 13:30:00', '2026-05-11 14:45:00'),
    ('Attachment metadata loss', 'File metadata not preserved on upload', 'Bug Reports', 'bug', 'P2', 'closed', 'automation.victor@lumina.test', 'Upload file and check metadata', '{"source":"seed","month":"may"}', '2026-05-11 15:00:00', '2026-05-14 11:15:00'),
    ('Notification batch processing slow', 'Sending bulk notifications times out', 'Software Support', 'software', 'P2', 'closed', 'engineer.james@lumina.test', 'Send batch notifications', '{"source":"seed","month":"may"}', '2026-05-13 09:20:00', '2026-05-16 14:30:00'),
    ('Data consistency check failures', 'Database consistency check reports anomalies', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'qa.emma@lumina.test', 'Run data consistency check', '{"source":"seed","month":"may"}', '2026-05-15 10:00:00', '2026-05-16 13:45:00'),
    ('Color scheme accessibility issue', 'Color contrast fails WCAG 2.0 standards', 'Software Support', 'bug', 'P2', 'closed', 'automation.samantha@lumina.test', 'Check color contrast ratio', '{"source":"seed","month":"may"}', '2026-05-17 14:15:00', '2026-05-20 16:00:00'),
    ('User session data corruption', 'Session data becomes invalid after reload', 'Software Support', 'bug', 'P1', 'closed', 'test.sarah@lumina.test', 'Reload page mid-session', '{"source":"seed","month":"may"}', '2026-05-19 11:30:00', '2026-05-21 15:45:00')
) AS seed(
  title,
  description,
  category_name,
  type,
  priority,
  status,
  submitter_email,
  replication_steps,
  metadata,
  created_at,
  closed_at
)
JOIN categories c ON lower(c.name) = lower(seed.category_name)
JOIN users u ON u.email = lower(seed.submitter_email)
WHERE NOT EXISTS (
  SELECT 1
  FROM tickets
  WHERE title IN (
    SELECT title
    FROM (
      VALUES
        ('Database connection pool exhaustion'),
        ('Cache invalidation bug'),
        ('API rate limiting misconfiguration'),
        ('Email template rendering issue'),
        ('Search indexing delay'),
        ('Mobile responsive layout broken'),
        ('PDF export memory leak'),
        ('Authentication session timeout inconsistent'),
        ('Dashboard widget load order randomized'),
        ('File upload progress indicator stuck'),
        ('Notification duplicate messages'),
        ('API documentation outdated'),
        ('Database backup incomplete'),
        ('Third party API integration timeout'),
        ('Data export formatting issues'),
        ('Concurrent user session conflicts'),
        ('Search filter performance degradation'),
        ('Report scheduling timezone issue'),
        ('User avatar upload fails silently'),
        ('Webhook event retry logic broken'),
        ('Export to Excel file corruption'),
        ('User preference not persisting'),
        ('Bulk action timeout for 10k+ records'),
        ('Comment character limit not enforced'),
        ('Audit log events missing'),
        ('Two-factor authentication reset flow broken'),
        ('Data migration script incomplete'),
        ('Image resize quality degradation'),
        ('Integration test flakiness'),
        ('Email notification unsubscribe not working'),
        ('Scheduled maintenance window not communicated'),
        ('Memory leak in background worker'),
        ('Form submission validation bypass'),
        ('Database query slow on specific records'),
        ('Customizable dashboard loses settings'),
        ('CSV import character encoding issue'),
        ('Real-time data sync delay'),
        ('API response includes sensitive data'),
        ('Pagination cursor becomes invalid'),
        ('Role-based access control inconsistency'),
        ('Message queue processing halted'),
        ('Rate limit not applying to specific IPs'),
        ('Language localization incomplete'),
        ('Database replication lag increasing'),
        ('Backup restore process fails silently'),
        ('Load balancer connection timeout'),
        ('User bulk export memory issue'),
        ('Notification email subject line truncated'),
        ('API batch request endpoint bug'),
        ('Dashboard chart rendering lag'),
        ('File size validation incorrect'),
        ('Sidebar navigation links broken'),
        ('User deletion cascading issue'),
        ('Timezone conversion in reports'),
        ('Cache TTL not respected'),
        ('User token refresh race condition'),
        ('Mobile app version check error'),
        ('Database index fragmentation'),
        ('Search autocomplete performance'),
        ('Export schedule missing timezone'),
        ('Widget update not reflected'),
        ('Concurrent table updates conflict'),
        ('Attachment metadata loss'),
        ('Notification batch processing slow'),
        ('Data consistency check failures'),
        ('Color scheme accessibility issue'),
        ('User session data corruption')
    ) AS t(title)
  )
);

-- Assign each seeded ticket to Developers or QA (roughly 50/50) for org visibility demos.
WITH seeded AS (
  SELECT
    t.id,
    t.created_at,
    ROW_NUMBER() OVER (ORDER BY t.created_at) AS rn
  FROM tickets t
  WHERE t.metadata->>'source' = 'seed'
    AND t.metadata->>'month' IN ('january', 'february', 'march', 'april', 'may')
    AND t.status IN ('closed', 'resolved')
),
assignee_pool AS (
  SELECT
    s.id AS ticket_id,
    s.created_at,
    CASE WHEN s.rn % 2 = 0 THEN 'qa'::assignment_role ELSE 'developer'::assignment_role END AS assignment_role,
    CASE
      WHEN s.rn % 2 = 0 THEN (
        ARRAY[
          lower('qa.michael@lumina.test'),
          lower('qa.lisa@lumina.test'),
          lower('automation.victor@lumina.test'),
          lower('test.brandon@lumina.test')
        ]
      )[1 + (s.rn % 4)]
      ELSE (
        ARRAY[
          lower('engineer.maya@lumina.test'),
          lower('engineer.alex@lumina.test'),
          lower('platform.marcus@lumina.test'),
          lower('architect.priya@lumina.test')
        ]
      )[1 + (s.rn % 4)]
    END AS assignee_email
  FROM seeded s
)
INSERT INTO ticket_assignment (
  ticket_id,
  assigned_to,
  assigned_by,
  is_active,
  assignment_role,
  assigned_at
)
SELECT
  pool.ticket_id,
  assignee.id,
  approver.id,
  TRUE,
  pool.assignment_role,
  pool.created_at + interval '30 minutes'
FROM assignee_pool pool
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
JOIN users assignee ON assignee.email = pool.assignee_email
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_assignment ta
  WHERE ta.ticket_id = pool.ticket_id AND ta.is_active = TRUE
);

-- One satisfaction rating per seeded ticket (unique on ticket_id — no CROSS JOIN).
INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
SELECT
  t.id,
  u.id,
  (ARRAY[5, 4, 5, 3, 5, 4, 5, 4])[1 + (abs(hashtext(t.id::text)) % 8)],
  (ARRAY[
    'Issue resolved quickly and professionally.',
    'Good resolution but took longer than expected.',
    'Excellent support and communication.',
    'Adequate resolution but could have been faster.',
    'Outstanding work on this ticket.',
    'Good fix, clear explanation provided.',
    'Resolved within SLA, very satisfied.',
    'Acceptable solution though some concerns remain.'
  ])[1 + (abs(hashtext(t.id::text)) % 8)]
FROM tickets t
JOIN users u ON u.id = t.submitted_by
WHERE t.metadata->>'source' = 'seed'
  AND t.metadata->>'month' IN ('january', 'february', 'march', 'april', 'may')
  AND t.status IN ('closed', 'resolved')
  AND EXTRACT(DAY FROM t.created_at)::int % 3 = 0
  AND NOT EXISTS (
    SELECT 1 FROM satisfaction_ratings sr WHERE sr.ticket_id = t.id
  );
