-- Lumina database seed - run: pnpm db:seed
-- Requires pnpm db:init first (schema + users). Idempotent: skips rows that already exist.
-- For a full wipe + reseed use: pnpm db:refresh
\set ON_ERROR_STOP on

\echo '==> Seeding demo tickets (Jan–May 2026)...'

-- -----------------------------------------------------------------------------
-- Section 1: Jan–May 2026 closed tickets, assignments, satisfaction ratings
-- -----------------------------------------------------------------------------

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
  seed.created_at,
  seed.closed_at
FROM (
  VALUES
    ('Database connection pool exhaustion', 'Production API exhausts DB pool under peak traffic.', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'engineer.alex@lumina.test', 'Reproduce: Database connection pool exhaustion — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-02 01:00:00', TIMESTAMP '2026-01-02 19:00:00'),
    ('Cache invalidation bug', 'Stale permissions after role change until hard refresh.', 'Bug Reports', 'bug', 'P2', 'resolved', 'engineer.james@lumina.test', 'Reproduce: Cache invalidation bug — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-04 02:00:00', TIMESTAMP '2026-01-05 14:00:00'),
    ('API rate limiting misconfiguration', 'Partner integrations hit 429 after gateway change.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'engineer.sophia@lumina.test', 'Reproduce: API rate limiting misconfiguration — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-06 03:00:00', TIMESTAMP '2026-01-07 03:00:00'),
    ('Memory leak in background worker', 'Worker RSS grows unbounded during nightly batch jobs.', 'Bug Reports', 'bug', 'P1', 'resolved', 'platform.marcus@lumina.test', 'Reproduce: Memory leak in background worker — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-08 04:00:00', TIMESTAMP '2026-01-10 04:00:00'),
    ('OAuth token refresh failure', 'Mobile clients cannot refresh tokens after session expiry.', 'Software Support', 'software', 'P2', 'closed', 'platform.elena@lumina.test', 'Reproduce: OAuth token refresh failure — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-10 05:00:00', TIMESTAMP '2026-01-10 17:00:00'),
    ('SSL certificate expiry alert', 'Staging load balancer served expired cert for 2 hours.', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'platform.david@lumina.test', 'Reproduce: SSL certificate expiry alert — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-12 06:00:00', TIMESTAMP '2026-01-12 12:00:00'),
    ('Login MFA loop on mobile', 'Users stuck in MFA verification loop on iOS app.', 'Software Support', 'software', 'P1', 'resolved', 'platform.isabella@lumina.test', 'Reproduce: Login MFA loop on mobile — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-14 07:00:00', TIMESTAMP '2026-01-15 03:00:00'),
    ('Search index lag after bulk import', 'New records missing from search for up to 4 hours.', 'Bug Reports', 'bug', 'P3', 'closed', 'sre.arjun@lumina.test', 'Reproduce: Search index lag after bulk import — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-16 00:00:00', TIMESTAMP '2026-01-19 00:00:00'),
    ('Webhook signature validation errors', 'Inbound webhooks rejected after secret rotation.', 'Software Support', 'software', 'P2', 'resolved', 'sre.natalie@lumina.test', 'Reproduce: Webhook signature validation errors — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-18 01:00:00', TIMESTAMP '2026-01-18 17:00:00'),
    ('Kubernetes HPA not scaling', 'Checkout pods did not scale during flash sale test.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'sre.kevin@lumina.test', 'Reproduce: Kubernetes HPA not scaling — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-20 02:00:00', TIMESTAMP '2026-01-21 08:00:00'),
    ('CSV export column mismatch', 'Finance export missing tax column since release.', 'Bug Reports', 'bug', 'P3', 'closed', 'sre.jessica@lumina.test', 'Reproduce: CSV export column mismatch — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-22 03:00:00', TIMESTAMP '2026-01-23 19:00:00'),
    ('Session timeout too aggressive', 'Users logged out every 10 minutes during long forms.', 'Software Support', 'software', 'P3', 'resolved', 'architect.robert@lumina.test', 'Reproduce: Session timeout too aggressive — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-24 04:00:00', TIMESTAMP '2026-01-25 08:00:00'),
    ('GraphQL N+1 query regression', 'Dashboard load time regressed after schema change.', 'Bug Reports', 'bug', 'P2', 'closed', 'architect.priya@lumina.test', 'Reproduce: GraphQL N+1 query regression — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-26 05:00:00', TIMESTAMP '2026-01-28 13:00:00'),
    ('S3 presigned URL expiry', 'Attachment downloads fail with AccessDenied intermittently.', 'Platform & Infrastructure', 'software', 'P3', 'resolved', 'architect.andres@lumina.test', 'Reproduce: S3 presigned URL expiry — follow standard runbook.', '{"source": "seed", "month": "january"}', TIMESTAMP '2026-01-28 06:00:00', TIMESTAMP '2026-01-29 04:00:00'),
    ('Feature flag stuck enabled', 'Beta checkout flag enabled for all tenants by mistake.', 'Software Support', 'software', 'P2', 'closed', 'architect.rachel@lumina.test', 'Reproduce: Feature flag stuck enabled — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-03 07:00:00', TIMESTAMP '2026-02-03 15:00:00'),
    ('Database migration lock timeout', 'Deploy blocked by long-running migration lock.', 'Platform & Infrastructure', 'incident', 'P1', 'resolved', 'qa.michael@lumina.test', 'Reproduce: Database migration lock timeout — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-05 00:00:00', TIMESTAMP '2026-02-05 14:00:00'),
    ('API pagination returns duplicates', 'Page 2 of tickets API returns overlapping IDs.', 'Bug Reports', 'bug', 'P2', 'closed', 'qa.lisa@lumina.test', 'Reproduce: API pagination returns duplicates — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-07 01:00:00', TIMESTAMP '2026-02-08 09:00:00'),
    ('Email template rendering broken', 'Notification emails show raw mustache tags.', 'Software Support', 'software', 'P3', 'closed', 'qa.christopher@lumina.test', 'Reproduce: Email template rendering broken — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-09 02:00:00', TIMESTAMP '2026-02-09 20:00:00'),
    ('Redis pub/sub message loss', 'Realtime updates drop under reconnect storms.', 'Platform & Infrastructure', 'incident', 'P2', 'resolved', 'qa.emma@lumina.test', 'Reproduce: Redis pub/sub message loss — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-11 03:00:00', TIMESTAMP '2026-02-12 23:00:00'),
    ('Accessibility contrast audit findings', 'WCAG AA failures on primary buttons.', 'Bug Reports', 'bug', 'P4', 'closed', 'automation.victor@lumina.test', 'Reproduce: Accessibility contrast audit findings — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-13 04:00:00', TIMESTAMP '2026-02-17 04:00:00'),
    ('Load test spike on auth service', 'Auth latency P99 exceeded SLO during load test.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'automation.samantha@lumina.test', 'Reproduce: Load test spike on auth service — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-15 05:00:00', TIMESTAMP '2026-02-16 07:00:00'),
    ('Pen test medium finding on exports', 'Export endpoint allowed unscoped ID enumeration.', 'Software Support', 'software', 'P2', 'resolved', 'automation.daniel@lumina.test', 'Reproduce: Pen test medium finding on exports — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-17 06:00:00', TIMESTAMP '2026-02-19 18:00:00'),
    ('CI pipeline flaky on lint step', 'Main branch builds fail intermittently on eslint.', 'Platform & Infrastructure', 'software', 'P4', 'closed', 'automation.olivia@lumina.test', 'Reproduce: CI pipeline flaky on lint step — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-19 07:00:00', TIMESTAMP '2026-02-22 15:00:00'),
    ('Design tokens out of sync', 'UI components use outdated spacing tokens.', 'Bug Reports', 'bug', 'P4', 'resolved', 'test.brandon@lumina.test', 'Reproduce: Design tokens out of sync — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-21 00:00:00', TIMESTAMP '2026-02-26 00:00:00'),
    ('Regression suite fails on checkout', 'E2E checkout test fails on staging nightly.', 'Bug Reports', 'bug', 'P2', 'closed', 'test.sarah@lumina.test', 'Reproduce: Regression suite fails on checkout — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-23 01:00:00', TIMESTAMP '2026-02-24 15:00:00'),
    ('DNS failover drill gap', 'Failover runbook missing secondary region steps.', 'Platform & Infrastructure', 'incident', 'P3', 'closed', 'test.nathan@lumina.test', 'Reproduce: DNS failover drill gap — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-25 02:00:00', TIMESTAMP '2026-02-27 06:00:00'),
    ('Blob storage quota exceeded', 'Attachment uploads fail when tenant quota hit.', 'Software Support', 'software', 'P3', 'resolved', 'test.megan@lumina.test', 'Reproduce: Blob storage quota exceeded — follow standard runbook.', '{"source": "seed", "month": "february"}', TIMESTAMP '2026-02-27 03:00:00', TIMESTAMP '2026-02-28 03:00:00'),
    ('Audit log ingestion delay', 'Security audit events lag by 30+ minutes.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'engineer.maya@lumina.test', 'Reproduce: Audit log ingestion delay — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-02 04:00:00', TIMESTAMP '2026-03-03 14:00:00'),
    ('Timezone bug in scheduled reports', 'Reports shift dates for APAC users.', 'Bug Reports', 'bug', 'P3', 'closed', 'engineer.alex@lumina.test', 'Reproduce: Timezone bug in scheduled reports — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-04 05:00:00', TIMESTAMP '2026-03-06 05:00:00'),
    ('IdP metadata sync failure', 'SSO metadata refresh fails silently weekly.', 'Software Support', 'software', 'P2', 'resolved', 'engineer.james@lumina.test', 'Reproduce: IdP metadata sync failure — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-06 06:00:00', TIMESTAMP '2026-03-07 10:00:00'),
    ('Container image pull rate limit', 'Deploys fail pulling base images from registry.', 'Platform & Infrastructure', 'incident', 'P3', 'closed', 'engineer.sophia@lumina.test', 'Reproduce: Container image pull rate limit — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-08 07:00:00', TIMESTAMP '2026-03-08 23:00:00'),
    ('Duplicate invoice generation', 'Billing job created duplicate invoices for 3 accounts.', 'Bug Reports', 'bug', 'P1', 'resolved', 'platform.marcus@lumina.test', 'Reproduce: Duplicate invoice generation — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-10 00:00:00', TIMESTAMP '2026-03-10 20:00:00'),
    ('CORS preflight blocked on admin', 'Admin UI API calls blocked after domain change.', 'Software Support', 'software', 'P2', 'closed', 'platform.elena@lumina.test', 'Reproduce: CORS preflight blocked on admin — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-12 01:00:00', TIMESTAMP '2026-03-12 11:00:00'),
    ('Log aggregation gap in EU region', 'EU tenant logs missing from central index.', 'Platform & Infrastructure', 'incident', 'P2', 'resolved', 'platform.david@lumina.test', 'Reproduce: Log aggregation gap in EU region — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-14 02:00:00', TIMESTAMP '2026-03-15 20:00:00'),
    ('Mobile push notification delay', 'Push notifications arrive 10+ minutes late.', 'Software Support', 'software', 'P3', 'closed', 'platform.isabella@lumina.test', 'Reproduce: Mobile push notification delay — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-16 03:00:00', TIMESTAMP '2026-03-17 15:00:00'),
    ('SQL slow query on ticket list', 'Ticket list endpoint exceeds 3s for large orgs.', 'Bug Reports', 'bug', 'P2', 'resolved', 'sre.arjun@lumina.test', 'Reproduce: SQL slow query on ticket list — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-18 04:00:00', TIMESTAMP '2026-03-20 20:00:00'),
    ('Secrets manager rotation drift', 'App still using old DB password after rotation.', 'Platform & Infrastructure', 'incident', 'P1', 'closed', 'sre.natalie@lumina.test', 'Reproduce: Secrets manager rotation drift — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-20 05:00:00', TIMESTAMP '2026-03-20 17:00:00'),
    ('Kanban board filter reset', 'Saved filters clear on browser refresh.', 'Bug Reports', 'bug', 'P4', 'closed', 'sre.kevin@lumina.test', 'Reproduce: Kanban board filter reset — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-22 06:00:00', TIMESTAMP '2026-03-25 22:00:00'),
    ('Partner API schema mismatch', 'v2 schema missing required field for partners.', 'Software Support', 'software', 'P2', 'resolved', 'sre.jessica@lumina.test', 'Reproduce: Partner API schema mismatch — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-24 07:00:00', TIMESTAMP '2026-03-25 13:00:00'),
    ('WAF false positive on uploads', 'Legitimate PDF uploads blocked by WAF rule.', 'Platform & Infrastructure', 'incident', 'P3', 'closed', 'architect.robert@lumina.test', 'Reproduce: WAF false positive on uploads — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-26 00:00:00', TIMESTAMP '2026-03-26 22:00:00'),
    ('On-call paging storm', 'Alert rules fired duplicate pages for same incident.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'architect.priya@lumina.test', 'Reproduce: On-call paging storm — follow standard runbook.', '{"source": "seed", "month": "march"}', TIMESTAMP '2026-03-28 01:00:00', TIMESTAMP '2026-03-28 15:00:00'),
    ('User avatar upload 413 error', 'Profile photo upload fails for images over 1MB.', 'Bug Reports', 'bug', 'P4', 'resolved', 'architect.andres@lumina.test', 'Reproduce: User avatar upload 413 error — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-02 02:00:00', TIMESTAMP '2026-04-05 02:00:00'),
    ('Stale CDN cache on static assets', 'Users see old JS bundle after deploy.', 'Platform & Infrastructure', 'software', 'P3', 'closed', 'architect.rachel@lumina.test', 'Reproduce: Stale CDN cache on static assets — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-04 03:00:00', TIMESTAMP '2026-04-04 11:00:00'),
    ('Role permission cache poisoned', 'Admin sees wrong menu items until re-login.', 'Software Support', 'software', 'P2', 'resolved', 'qa.michael@lumina.test', 'Reproduce: Role permission cache poisoned — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-06 04:00:00', TIMESTAMP '2026-04-06 22:00:00'),
    ('Backup restore validation failed', 'Monthly restore test could not mount snapshot.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'qa.lisa@lumina.test', 'Reproduce: Backup restore validation failed — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-08 05:00:00', TIMESTAMP '2026-04-10 07:00:00'),
    ('Ticket merge duplicates assignees', 'Merging tickets leaves duplicate active assignments.', 'Bug Reports', 'bug', 'P3', 'closed', 'qa.christopher@lumina.test', 'Reproduce: Ticket merge duplicates assignees — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-10 06:00:00', TIMESTAMP '2026-04-12 02:00:00'),
    ('Invoice PDF font rendering', 'PDF exports show missing glyphs for accented names.', 'Software Support', 'software', 'P4', 'resolved', 'qa.emma@lumina.test', 'Reproduce: Invoice PDF font rendering — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-12 07:00:00', TIMESTAMP '2026-04-16 07:00:00'),
    ('Queue consumer lag alert', 'Background queue depth exceeded threshold for 2h.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'automation.victor@lumina.test', 'Reproduce: Queue consumer lag alert — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-14 00:00:00', TIMESTAMP '2026-04-15 02:00:00'),
    ('Safari date picker off by one', 'Due dates save as previous day in Safari.', 'Bug Reports', 'bug', 'P3', 'closed', 'automation.samantha@lumina.test', 'Reproduce: Safari date picker off by one — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-16 01:00:00', TIMESTAMP '2026-04-17 17:00:00'),
    ('Terraform state lock stuck', 'Infra pipeline blocked on stale state lock.', 'Platform & Infrastructure', 'incident', 'P2', 'resolved', 'automation.daniel@lumina.test', 'Reproduce: Terraform state lock stuck — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-18 02:00:00', TIMESTAMP '2026-04-18 18:00:00'),
    ('HR export missing department', 'HR CSV export omits department column.', 'Software Support', 'software', 'P3', 'closed', 'automation.olivia@lumina.test', 'Reproduce: HR export missing department — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-20 03:00:00', TIMESTAMP '2026-04-21 11:00:00'),
    ('Grafana dashboard panel empty', 'SLO dashboard shows no data after migration.', 'Platform & Infrastructure', 'software', 'P4', 'resolved', 'test.brandon@lumina.test', 'Reproduce: Grafana dashboard panel empty — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-22 04:00:00', TIMESTAMP '2026-04-25 00:00:00'),
    ('Chat widget z-index overlap', 'Support chat hides primary action buttons.', 'Bug Reports', 'bug', 'P4', 'closed', 'test.sarah@lumina.test', 'Reproduce: Chat widget z-index overlap — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-24 05:00:00', TIMESTAMP '2026-04-26 13:00:00'),
    ('LDAP group sync partial failure', 'Half of AD groups not synced overnight.', 'Software Support', 'software', 'P2', 'resolved', 'test.nathan@lumina.test', 'Reproduce: LDAP group sync partial failure — follow standard runbook.', '{"source": "seed", "month": "april"}', TIMESTAMP '2026-04-26 06:00:00', TIMESTAMP '2026-04-27 06:00:00'),
    ('TLS cipher mismatch on legacy client', 'Old integration clients cannot handshake.', 'Platform & Infrastructure', 'incident', 'P3', 'closed', 'test.megan@lumina.test', 'Reproduce: TLS cipher mismatch on legacy client — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-02 07:00:00', TIMESTAMP '2026-05-03 19:00:00'),
    ('Satisfaction survey not sent', 'Closed tickets never trigger survey email.', 'Bug Reports', 'bug', 'P3', 'closed', 'engineer.maya@lumina.test', 'Reproduce: Satisfaction survey not sent — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-04 00:00:00', TIMESTAMP '2026-05-06 00:00:00'),
    ('Rate limit bypass in internal API', 'Internal routes missing auth middleware.', 'Software Support', 'software', 'P1', 'resolved', 'engineer.alex@lumina.test', 'Reproduce: Rate limit bypass in internal API — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-06 01:00:00', TIMESTAMP '2026-05-06 11:00:00'),
    ('Pod OOM during PDF generation', 'Report worker killed generating large PDFs.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'engineer.james@lumina.test', 'Reproduce: Pod OOM during PDF generation — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-08 02:00:00', TIMESTAMP '2026-05-09 06:00:00'),
    ('Dark mode flash on navigation', 'Brief dark flash when navigating between pages.', 'Bug Reports', 'bug', 'P4', 'resolved', 'engineer.sophia@lumina.test', 'Reproduce: Dark mode flash on navigation — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-10 03:00:00', TIMESTAMP '2026-05-14 11:00:00'),
    ('Snowflake connector timeout', 'Analytics sync jobs timeout after 15 minutes.', 'Software Support', 'software', 'P3', 'closed', 'platform.marcus@lumina.test', 'Reproduce: Snowflake connector timeout — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-12 04:00:00', TIMESTAMP '2026-05-14 08:00:00'),
    ('IP allowlist blocks VPN users', 'Remote staff cannot reach admin after IP change.', 'Platform & Infrastructure', 'incident', 'P2', 'resolved', 'platform.elena@lumina.test', 'Reproduce: IP allowlist blocks VPN users — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-14 05:00:00', TIMESTAMP '2026-05-14 19:00:00'),
    ('Bulk user import validation', 'CSV import rejects valid rows with unicode names.', 'Software Support', 'software', 'P3', 'closed', 'platform.david@lumina.test', 'Reproduce: Bulk user import validation — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-16 06:00:00', TIMESTAMP '2026-05-17 20:00:00'),
    ('Metrics cardinality explosion', 'Prometheus scrape fails from label explosion.', 'Platform & Infrastructure', 'incident', 'P2', 'closed', 'platform.isabella@lumina.test', 'Reproduce: Metrics cardinality explosion — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-18 07:00:00', TIMESTAMP '2026-05-19 13:00:00'),
    ('Comment mention notifications broken', '@mentions do not notify assignees.', 'Bug Reports', 'bug', 'P3', 'resolved', 'sre.arjun@lumina.test', 'Reproduce: Comment mention notifications broken — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-20 00:00:00', TIMESTAMP '2026-05-21 18:00:00'),
    ('Release notes link 404', 'In-app release notes point to removed page.', 'Software Support', 'software', 'P4', 'closed', 'sre.natalie@lumina.test', 'Reproduce: Release notes link 404 — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-22 01:00:00', TIMESTAMP '2026-05-22 21:00:00'),
    ('Staging data refresh incomplete', 'Staging missing last week of ticket samples.', 'Platform & Infrastructure', 'software', 'P3', 'resolved', 'sre.kevin@lumina.test', 'Reproduce: Staging data refresh incomplete — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-24 02:00:00', TIMESTAMP '2026-05-26 14:00:00'),
    ('Incident postmortem template missing', 'Postmortem doc not linked from closed incidents.', 'Manager', 'software', 'P4', 'closed', 'sre.jessica@lumina.test', 'Reproduce: Incident postmortem template missing — follow standard runbook.', '{"source": "seed", "month": "may"}', TIMESTAMP '2026-05-26 03:00:00', TIMESTAMP '2026-05-29 03:00:00')
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
WHERE u.department IN ('Developers', 'QA')
  AND NOT EXISTS (
    SELECT 1 FROM tickets t WHERE lower(t.title) = lower(seed.title)
  );

\echo '==> Assigning tickets to Developers / QA...'

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

\echo '==> Adding satisfaction ratings...'

-- One satisfaction rating per seeded ticket (unique on ticket_id).
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
  AND NOT EXISTS (
    SELECT 1 FROM satisfaction_ratings sr WHERE sr.ticket_id = t.id
  );

\echo '==> Seeding sample comments...'

-- -----------------------------------------------------------------------------
-- Section 2: Sample ticket comments (idempotent)
-- -----------------------------------------------------------------------------

INSERT INTO ticket_comments (ticket_id, author_id, body)
SELECT
  t.id,
  author.id,
  seed.body
FROM tickets t
JOIN (
  VALUES
    ('Database connection pool exhaustion', 'engineer.maya@lumina.test', 'Reproduced under load test — pooling config looks too small.'),
    ('Database connection pool exhaustion', 'qa.michael@lumina.test', 'Verified fix in staging. Recommend monitoring connection count.'),
    ('Cache invalidation bug', 'qa.lisa@lumina.test', 'Permissions still stale after cache clear on first attempt.'),
    ('API rate limiting misconfiguration', 'engineer.alex@lumina.test', 'Headers now match OpenAPI spec after deploy.'),
    ('Memory leak in background worker', 'platform.marcus@lumina.test', 'Worker restart scheduled; heap stable after patch.')
) AS seed(title, author_email, body)
  ON lower(t.title) = lower(seed.title)
JOIN users author ON author.email = lower(seed.author_email)
WHERE t.metadata->>'source' = 'seed'
  AND NOT EXISTS (
    SELECT 1 FROM ticket_comments c
    WHERE c.ticket_id = t.id AND c.author_id = author.id AND c.body = seed.body
  );

\echo ''
\echo '==> Seed summary (current database):'
SELECT 'seed tickets' AS item, COUNT(*)::text AS count
FROM tickets WHERE metadata->>'source' = 'seed'
UNION ALL
SELECT 'active assignments on seed tickets', COUNT(DISTINCT ta.ticket_id)::text
FROM ticket_assignment ta
JOIN tickets t ON t.id = ta.ticket_id AND t.metadata->>'source' = 'seed' AND ta.is_active
UNION ALL
SELECT 'seed comments', COUNT(*)::text
FROM ticket_comments c
JOIN tickets t ON t.id = c.ticket_id AND t.metadata->>'source' = 'seed';

\echo ''
\echo 'Note: INSERT 0 0 means that step had nothing new to add (already seeded).'
\echo 'To wipe and reload everything, run: pnpm db:refresh'
\echo ''
