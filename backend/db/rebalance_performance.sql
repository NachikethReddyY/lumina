-- Rebalance historical performance for HR reports.
-- Safe to re-run in development environments.

-- 1) Keep one active assignment per historical ticket.
UPDATE ticket_assignment ta
SET is_active = FALSE
FROM tickets t
WHERE ta.ticket_id = t.id
  AND t.metadata->>'seed_batch' = 'historical_six_months_600';

-- 2) Ensure every historical ticket has a deterministic active assignee.
WITH generated AS (
  SELECT
    t.id AS ticket_id,
    ((right(t.id::text, 12))::int) AS n,
    t.created_at,
    ROW_NUMBER() OVER (ORDER BY t.created_at, t.id) AS rn,
    EXTRACT(MONTH FROM (t.created_at + INTERVAL '8 hours'))::int AS local_month
  FROM tickets t
  WHERE t.metadata->>'seed_batch' = 'historical_six_months_600'
),
target AS (
  SELECT
    ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid AS id,
    ticket_id,
    CASE
      -- May strongest
      WHEN local_month = 5 AND rn % 7 = 0 THEN '00000000-0000-0000-0000-000000000012'::uuid -- Alex
      WHEN local_month = 5 AND rn % 7 = 1 THEN '00000000-0000-0000-0000-000000000013'::uuid -- Maria
      WHEN local_month = 5 AND rn % 7 = 2 THEN '00000000-0000-0000-0000-000000000014'::uuid -- James
      WHEN local_month = 5 AND rn % 7 = 3 THEN '00000000-0000-0000-0000-000000000023'::uuid -- Liam
      WHEN local_month = 5 AND rn % 7 = 4 THEN '00000000-0000-0000-0000-000000000015'::uuid -- Priya
      WHEN local_month = 5 AND rn % 7 = 5 THEN '00000000-0000-0000-0000-000000000025'::uuid -- Nina
      WHEN local_month = 5 THEN '00000000-0000-0000-0000-000000000027'::uuid -- Grace
      -- Other months balanced
      WHEN rn % 2 = 0 AND rn % 4 = 0 THEN '00000000-0000-0000-0000-000000000015'::uuid
      WHEN rn % 2 = 0 THEN '00000000-0000-0000-0000-000000000016'::uuid
      WHEN rn % 6 = 1 THEN '00000000-0000-0000-0000-000000000012'::uuid
      WHEN rn % 6 = 3 THEN '00000000-0000-0000-0000-000000000013'::uuid
      WHEN rn % 6 = 5 THEN '00000000-0000-0000-0000-000000000014'::uuid
      ELSE '00000000-0000-0000-0000-000000000023'::uuid
    END AS assigned_to,
    CASE
      WHEN local_month = 5 AND rn % 7 IN (4, 5, 6) THEN 'qa'::assignment_role
      WHEN rn % 2 = 0 THEN 'qa'::assignment_role
      ELSE 'developer'::assignment_role
    END AS assignment_role,
    created_at + (((n % 9) + 1) * INTERVAL '20 minutes') AS assigned_at
  FROM generated
),
actor AS (
  SELECT id AS assigned_by
  FROM users
  WHERE role = 'admin'::user_role
  ORDER BY
    CASE WHEN email = 'ynrdevs@gmail.com' THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1
)
INSERT INTO ticket_assignment (id, ticket_id, assigned_to, assigned_by, is_active, assignment_role, assigned_at)
SELECT
  target.id,
  target.ticket_id,
  target.assigned_to,
  actor.assigned_by,
  TRUE,
  target.assignment_role,
  target.assigned_at
FROM target
CROSS JOIN actor
ON CONFLICT (id) DO UPDATE
SET assigned_to = EXCLUDED.assigned_to,
    assigned_by = EXCLUDED.assigned_by,
    is_active = EXCLUDED.is_active,
    assignment_role = EXCLUDED.assignment_role,
    assigned_at = EXCLUDED.assigned_at;

-- 3) Make May closures fast (strongest month) and earlier months realistic.
WITH shaped AS (
  SELECT
    t.id,
    ((right(t.id::text, 12))::int) AS n,
    EXTRACT(MONTH FROM (t.created_at + INTERVAL '8 hours'))::int AS local_month
  FROM tickets t
  WHERE t.metadata->>'seed_batch' = 'historical_six_months_600'
    AND t.status IN ('resolved', 'abandoned')
)
UPDATE tickets t
SET closed_at = LEAST(
  t.created_at + CASE
    WHEN shaped.local_month = 5 THEN CASE (shaped.n % 6)
      WHEN 0 THEN INTERVAL '6 hours'
      WHEN 1 THEN INTERVAL '10 hours'
      WHEN 2 THEN INTERVAL '16 hours'
      WHEN 3 THEN INTERVAL '22 hours'
      WHEN 4 THEN INTERVAL '30 hours'
      ELSE INTERVAL '40 hours'
    END
    ELSE CASE (shaped.n % 8)
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
FROM shaped
WHERE t.id = shaped.id;
