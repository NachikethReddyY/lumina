-- Bulk ticket seed: 300 tickets with named Developer/QA assignees and active queue items.
-- Idempotent via metadata.seed_bulk_id. Run after DDL + seed.sql (or db:refresh).
\set ON_ERROR_STOP on

\echo '==> Bulk seed: 300 tickets (active + historical)...'

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

WITH bounds AS (
  SELECT COUNT(*)::int AS existing
  FROM tickets
  WHERE metadata->>'source' = 'seed_bulk'
),
numbered AS (
  SELECT generate_series(1, 300) AS n
),
submitter_pool AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (ORDER BY u.email) - 1 AS idx,
    COUNT(*) OVER ()::int AS total
  FROM users u
  WHERE u.status = 'active'
    AND u.email LIKE '%@lumina.test'
    AND lower(u.email) <> lower('lumina.ai@lumina.test')
),
assignee_pool AS (
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.department,
    u.job_title,
    ROW_NUMBER() OVER (ORDER BY u.last_name, u.first_name) - 1 AS idx,
    COUNT(*) OVER ()::int AS total
  FROM users u
  WHERE u.status = 'active'
    AND u.department IN ('Developers', 'QA')
),
category_pool AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY name) - 1 AS idx, COUNT(*) OVER ()::int AS total
  FROM categories
  WHERE is_active = TRUE
),
planned AS (
  SELECT
    n.n,
    CASE
      WHEN n.n <= 180 THEN 'closed'::ticket_status
      WHEN n.n <= 240 THEN 'resolved'::ticket_status
      WHEN n.n <= 270 THEN 'in_progress'::ticket_status
      WHEN n.n <= 285 THEN 'assigned'::ticket_status
      WHEN n.n <= 292 THEN 'open'::ticket_status
      WHEN n.n <= 297 THEN 'on_hold'::ticket_status
      ELSE 'open'::ticket_status
    END AS status,
    CASE (n.n % 4)
      WHEN 0 THEN 'P1'::ticket_priority
      WHEN 1 THEN 'P2'::ticket_priority
      WHEN 2 THEN 'P3'::ticket_priority
      ELSE 'P4'::ticket_priority
    END AS priority,
    CASE (n.n % 3)
      WHEN 0 THEN 'incident'::ticket_type
      WHEN 1 THEN 'bug'::ticket_type
      ELSE 'software'::ticket_type
    END AS ticket_type,
    CASE (n.n % 4)
      WHEN 0 THEN 'Platform & Infrastructure'
      WHEN 1 THEN 'Bug Reports'
      WHEN 2 THEN 'Software Support'
      ELSE 'Manager'
    END AS category_name,
    CASE
      WHEN n.n <= 240 THEN TIMESTAMP '2026-01-01' + ((n.n % 150) || ' days')::interval + ((n.n % 24) || ' hours')::interval
      ELSE NOW() - ((n.n % 28) || ' days')::interval - ((n.n % 12) || ' hours')::interval
    END AS created_at
  FROM numbered n
  CROSS JOIN bounds b
  WHERE b.existing < 300
),
inserted AS (
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
    format(
      '[%s] %s — ticket %s',
      CASE p.status
        WHEN 'in_progress' THEN 'In progress'
        WHEN 'assigned' THEN 'Assigned'
        WHEN 'open' THEN 'Open'
        WHEN 'on_hold' THEN 'On hold'
        WHEN 'pending_routing' THEN 'Routing'
        ELSE 'Closed'
      END,
      CASE (p.n % 12)
        WHEN 0 THEN 'API latency regression'
        WHEN 1 THEN 'Login failure spike'
        WHEN 2 THEN 'Export timeout'
        WHEN 3 THEN 'Mobile layout defect'
        WHEN 4 THEN 'Cache invalidation gap'
        WHEN 5 THEN 'Webhook retry backlog'
        WHEN 6 THEN 'Search index lag'
        WHEN 7 THEN 'Permission sync drift'
        WHEN 8 THEN 'Deploy rollback needed'
        WHEN 9 THEN 'Dashboard widget error'
        WHEN 10 THEN 'SSO metadata stale'
        ELSE 'Attachment upload failure'
      END,
      lpad(p.n::text, 3, '0')
    ),
    format(
      'Bulk seed ticket %s. Assigned to rotating Developers and QA for queue and dashboard demos.',
      p.n
    ),
    c.id,
    p.ticket_type,
    p.priority,
    p.status,
    s.id,
    format('Reproduce bulk seed ticket %s using standard runbook steps.', p.n),
    jsonb_build_object(
      'source', 'seed_bulk',
      'seed_bulk_id', p.n::text,
      'assignee_hint', format('%s %s', a.first_name, a.last_name)
    ),
    p.created_at,
    CASE
      WHEN p.status IN ('closed', 'resolved') THEN p.created_at + ((1 + (p.n % 72)) || ' hours')::interval
      ELSE NULL
    END
  FROM planned p
  JOIN category_pool c ON c.idx = (p.n % c.total)
  JOIN submitter_pool s ON s.idx = (p.n % s.total)
  JOIN assignee_pool a ON a.idx = (p.n % a.total)
  WHERE NOT EXISTS (
    SELECT 1 FROM tickets t WHERE t.metadata->>'seed_bulk_id' = p.n::text
  )
  RETURNING id, status, created_at, metadata
),
assignee_for_ticket AS (
  SELECT
    i.id AS ticket_id,
    i.status,
    i.created_at,
    (i.metadata->>'seed_bulk_id')::int AS n,
    ap.id AS assignee_id,
    ap.first_name,
    ap.last_name,
    ap.department,
    ap.job_title,
    CASE
      WHEN ap.department = 'QA' OR ap.job_title ILIKE '%QA%' OR ap.job_title ILIKE '%Test%' OR ap.job_title ILIKE '%Automation%'
        THEN 'qa'::assignment_role
      ELSE 'developer'::assignment_role
    END AS assignment_role
  FROM inserted i
  JOIN assignee_pool ap ON ap.idx = ((i.metadata->>'seed_bulk_id')::int % ap.total)
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
  aft.ticket_id,
  aft.assignee_id,
  approver.id,
  TRUE,
  aft.assignment_role,
  aft.created_at + interval '45 minutes'
FROM assignee_for_ticket aft
JOIN users approver ON approver.email = lower('ynrdevs@gmail.com')
WHERE aft.status IN ('open', 'assigned', 'in_progress', 'on_hold', 'pending_routing', 'resolved', 'closed')
  AND NOT EXISTS (
    SELECT 1 FROM ticket_assignment ta
    WHERE ta.ticket_id = aft.ticket_id AND ta.is_active = TRUE
  );

-- Routing metadata so assignee names appear in UI and AI log.
UPDATE tickets t
SET metadata = jsonb_set(
  COALESCE(t.metadata, '{}'::jsonb),
  '{routing}',
  jsonb_build_object(
    'source', 'seed_bulk',
    'assigned_admin_id', ta.assigned_to::text,
    'reasoning', 'Bulk seed assignment for demo workload.',
    'decision', jsonb_build_object(
      'assigned_admin_id', u.id::text,
      'assignee_name', CONCAT(u.first_name, ' ', u.last_name),
      'assignee_job_title', NULLIF(TRIM(u.job_title), ''),
      'source', 'seed_bulk',
      'confidence', 0.88,
      'ticket_note', jsonb_build_object(
        'summary', format('Route to %s %s.', u.first_name, u.last_name),
        'rationale', format('%s owns this %s queue item.', u.first_name, COALESCE(u.department, 'team')),
        'next_step', CASE
          WHEN t.status IN ('resolved', 'closed') THEN 'Ticket complete.'
          WHEN t.status = 'in_progress' THEN 'Continue active work.'
          ELSE 'Review and start work.'
        END
      )
    )
  ),
  true
)
FROM ticket_assignment ta
JOIN users u ON u.id = ta.assigned_to
WHERE ta.ticket_id = t.id
  AND ta.is_active = TRUE
  AND t.metadata->>'source' = 'seed_bulk'
  AND lower(u.email) <> lower('lumina.ai@lumina.test');

\echo ''
\echo '==> Bulk seed summary:'
SELECT status, COUNT(*)::int AS count
FROM tickets
WHERE metadata->>'source' = 'seed_bulk'
GROUP BY status
ORDER BY status;

SELECT 'active queue (open/assigned/in_progress/on_hold/pending_routing)' AS item,
       COUNT(*)::text AS count
FROM tickets
WHERE metadata->>'source' = 'seed_bulk'
  AND status IN ('open', 'assigned', 'in_progress', 'on_hold', 'pending_routing');

SELECT 'total tickets (all sources)' AS item, COUNT(*)::text AS count FROM tickets;
