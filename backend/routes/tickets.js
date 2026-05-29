const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding, requireRole } = require('../middleware/auth');
const {
  validateTicketAssignmentBody,
  validateTicketCreateBody,
  validateTicketPriorityBody,
  validateTicketStatusBody,
  validationError,
} = require('../lib/ticketValidation');
const {
  chooseAssignee,
  getAdminWorkloads,
  getLuminaAiUserId,
  isLuminaAIUser,
} = require('../lib/ticketRouting');
const { isTeamManager, isQaManager, isHrAdmin, isOrgViewer, canViewOrgQueue, isDeveloper, TEAM_MEMBER_DEPARTMENTS } = require('../lib/teamScope');
const { canMutateTicket, canViewTicket, canRerouteTicket, canSendToQa, isAssignedToQa } = require('../lib/ticketPermissions');
const { mapTicketRow, mapTicketRows, toDbStatus } = require('../lib/ticketStatus');

const router = express.Router();

// Ticket API backing the main product experience:
// - useTicketList feeds UserDashboard, QAManagerDashboard, RoleDashboardPage,
//   TicketHistoryPage, and the queue/history routes.
// - CreateTicketModal posts new user tickets here.
// - TicketDetailPanel, TicketSideRail, charts, comments, and timeline controls
//   depend on the joined assignee/category fields returned by these queries.
router.use(requireAuth, requireOnboarding);

// Shared SQL fragment: normalize names so the frontend can render null instead
// of empty strings when an assignee profile is incomplete.
function cleanPersonNameSql(expr) {
  return `NULLIF(TRIM(${expr}), '')`;
}

// Reusable visibility predicate for "tickets assigned to current user" scopes.
function assignedToUserSql(paramIndex) {
  return `EXISTS (
    SELECT 1
    FROM ticket_assignment ta
    WHERE ta.ticket_id = t.id AND ta.assigned_to = $${paramIndex} AND ta.is_active = TRUE
  )`;
}

// User-facing names returned to route responses and audit metadata.
function userDisplayName(user) {
  return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || null;
}

// Keep developer routing pools focused on developers even though the database
// uses the broad "admin" role for all staff-like users.
function isDeveloperRoutingCandidate(admin = {}) {
  const department = String(admin.department || '').trim();
  if (department === 'Developers') return true;
  if (['QA', 'HR', 'Managers'].includes(department)) return false;
  return isDeveloper(admin);
}

// Store a compact copy of each AI/manual routing decision on tickets.metadata.
// notificationsApi.aiDecisions reads this JSON for the frontend decision panel.
function buildRoutingMetadata(routing) {
  return {
    source: routing.source,
    assigned_admin_id: routing.assignedAdminId,
    reasoning: routing.reasoning,
    decision: routing.decision || null,
  };
}

// Common assignment transaction used by manual reroute, AI reroute, QA handoff,
// and developer handoff flows. It updates ticket_assignment, ticket status,
// tickets.metadata.routing, and audit_logs together so frontend lists, timelines,
// notifications, and AI decision screens stay consistent after one API call.
async function applyRoutingAssignment(client, { ticket, routing, actorId, auditAction, assignmentMode, assignmentRole = 'developer', requestedAssignee = null }) {
  if (!routing.assignedAdminId) {
    throw Object.assign(new Error('No admins are available for routing'), { status: 409 });
  }

  const routingMetadata = buildRoutingMetadata(routing);
  const assignedResult = await client.query(
    `SELECT id, first_name, last_name, email, job_title FROM users WHERE id = $1`,
    [routing.assignedAdminId]
  );
  const assignedUser = assignedResult.rows[0] || null;
  if (!assignedUser || isLuminaAIUser(assignedUser)) {
    throw Object.assign(new Error('Lumina AI routes tickets to real admins and cannot own tickets'), { status: 409 });
  }
  const assignedToName = userDisplayName(assignedUser);

  await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE AND assignment_role = $2`, [
    ticket.id,
    assignmentRole,
  ]);
  await client.query(
    `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assignment_role)
     VALUES ($1, $2, $3, TRUE, $4::assignment_role)`,
    [ticket.id, routing.assignedAdminId, actorId, assignmentRole]
  );
  await client.query(
    `UPDATE tickets
     SET status = 'assigned'::ticket_status,
         metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{routing}', $2::jsonb, true)
     WHERE id = $1`,
    [ticket.id, JSON.stringify(routingMetadata)]
  );

  const requestedAssigneeName = requestedAssignee ? userDisplayName(requestedAssignee) : null;

  await client.query(
    `INSERT INTO audit_logs (actor_id, action, metadata)
     VALUES ($1, $2, $3::jsonb)`,
    [
      actorId,
      auditAction,
      JSON.stringify({
        ticket_id: ticket.id,
        old_assigned_to: ticket.old_assigned_to || null,
        old_assigned_to_name: ticket.old_assigned_to_name || null,
        requested_assignee: requestedAssignee?.id || null,
        requested_assignee_name: requestedAssigneeName,
        assigned_admin_id: routing.assignedAdminId,
        assigned_to: routing.assignedAdminId,
        assigned_to_name: assignedToName,
        source: routing.source,
        routing_source: routing.source,
        reasoning: routing.reasoning,
        routing_reasoning: routing.reasoning,
        routing_decision: routing.decision || null,
        old_status: ticket.status || null,
        new_status: 'assigned',
        assignment_mode: assignmentMode,
      }),
    ]
  );

  return { assignedUser, assignedToName, routingMetadata };
}

// Ticket list endpoint. Query params map directly to ticketsApi.list({ scope,
// status }) in src/utils/apiClient.ts. The response shape matches ApiTicket and
// includes both QA and developer assignment slots for role-specific UI controls.
router.get('/', async (req, res, next) => {
  try {
    const values = [];
    const clauses = [];

    const scope = String(req.query.scope || '').trim();
    const addSubmittedByCurrentUserClause = () => {
      values.push(req.user.id);
      clauses.push(`t.submitted_by = $${values.length}`);
    };
    const addAssignedToCurrentUserClause = () => {
      values.push(req.user.id);
      clauses.push(assignedToUserSql(values.length));
    };
    const addOwnedByCurrentUserClause = () => {
      values.push(req.user.id);
      const userParam = `$${values.length}`;
      clauses.push(`(t.submitted_by = ${userParam} OR ${assignedToUserSql(values.length)})`);
    };

    if (scope === 'submitted') {
      addSubmittedByCurrentUserClause();
    } else if (scope === 'assigned') {
      addAssignedToCurrentUserClause();
    } else if (scope === 'team' && isOrgViewer(req.user)) {
      values.push(TEAM_MEMBER_DEPARTMENTS);
      clauses.push(`submitter.department = ANY($${values.length}::text[])`);
    } else if (scope === 'org' || scope === '' || !scope) {
      if (!canViewOrgQueue(req.user)) {
        addOwnedByCurrentUserClause();
      }
    } else {
      addOwnedByCurrentUserClause();
    }

    if (req.query.status) {
      values.push(toDbStatus(String(req.query.status)));
      clauses.push(`t.status = $${values.length}::ticket_status`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT DISTINCT ON (t.id)
              t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.closed_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              qa_assignee.id AS qa_assignee_id,
              qa_assignee.avatar_url AS qa_assignee_avatar_url,
              ${cleanPersonNameSql("CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name)")} AS qa_assignee_name,
              NULLIF(TRIM(qa_assignee.job_title), '') AS qa_assignee_job_title,
              NULLIF(TRIM(qa_assignee.department), '') AS qa_assignee_department,
              dev_assignee.id AS dev_assignee_id,
              dev_assignee.avatar_url AS dev_assignee_avatar_url,
              ${cleanPersonNameSql("CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name)")} AS dev_assignee_name,
              NULLIF(TRIM(dev_assignee.job_title), '') AS dev_assignee_job_title,
              NULLIF(TRIM(dev_assignee.department), '') AS dev_assignee_department,
              COALESCE(dev_assignee.id, qa_assignee.id) AS assigned_to_id,
              COALESCE(dev_assignee.avatar_url, qa_assignee.avatar_url) AS assigned_to_avatar_url,
              COALESCE(
                ${cleanPersonNameSql("CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name)")},
                ${cleanPersonNameSql("CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name)")}
              ) AS assigned_to_name,
              COALESCE(NULLIF(TRIM(dev_assignee.job_title), ''), NULLIF(TRIM(qa_assignee.job_title), '')) AS assigned_to_job_title,
              COALESCE(NULLIF(TRIM(dev_assignee.department), ''), NULLIF(TRIM(qa_assignee.department), '')) AS assigned_to_department
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN users qa_assignee ON qa_assignee.id = ta_qa.assigned_to
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       LEFT JOIN users dev_assignee ON dev_assignee.id = ta_dev.assigned_to
       ${where}
       ORDER BY t.id, t.created_at DESC`,
      values
    );
    res.json(mapTicketRows(result.rows));
  } catch (error) {
    next(error);
  }
});

// Workload cards and routing controls use this to show who has capacity before
// or after Lumina makes an assignment.
router.get('/admin/workload', requireRole('admin'), async (_req, res, next) => {
  try {
    const data = await getAdminWorkloads();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// SolvedByAssigneeChart source for team/admin dashboards.
router.get('/stats/solved-by-assignee', async (req, res, next) => {
  try {
    const period = String(req.query.period || '7d').trim();
    let intervalDays = 7;
    if (period === '30d') intervalDays = 30;
    else if (period === '90d') intervalDays = 90;

    const result = await db.query(
      `WITH cutoff AS (
         SELECT NOW() - INTERVAL '1 day' * $1 AS at
       ),
       solved AS (
         SELECT
           u.id,
           CONCAT(u.first_name, ' ', u.last_name) AS name,
           u.department,
           COUNT(DISTINCT t.id)::int AS count
         FROM tickets t
         JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
         JOIN users u ON u.id = ta.assigned_to
         CROSS JOIN cutoff c
          WHERE t.status = 'resolved'
           AND COALESCE(t.closed_at, t.created_at) >= c.at
         GROUP BY u.id, u.first_name, u.last_name, u.department
       ),
       takeovers AS (
         SELECT
           ta.assigned_to AS user_id,
           COUNT(*)::int AS takeovers
         FROM ticket_assignment ta
         CROSS JOIN cutoff c
         WHERE ta.assigned_at >= c.at
           AND EXISTS (
             SELECT 1
             FROM ticket_assignment prev
             WHERE prev.ticket_id = ta.ticket_id
               AND prev.assigned_at < ta.assigned_at
               AND prev.assigned_to <> ta.assigned_to
           )
         GROUP BY ta.assigned_to
       )
       SELECT
         s.name,
         s.department,
         s.count,
         COALESCE(tk.takeovers, 0)::int AS takeovers
       FROM solved s
       LEFT JOIN takeovers tk ON tk.user_id = s.id
       UNION ALL
       SELECT
         CONCAT(u.first_name, ' ', u.last_name) AS name,
         u.department,
         0 AS count,
         tk.takeovers
       FROM takeovers tk
       JOIN users u ON u.id = tk.user_id
       WHERE NOT EXISTS (SELECT 1 FROM solved s WHERE s.id = tk.user_id)
       ORDER BY count DESC, takeovers DESC, name ASC`,
      [intervalDays]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Throughput chart source: created/resolved/rerouted counts for the last week.
router.get('/stats/throughput', requireRole('admin'), async (_req, res, next) => {
  try {
    const result = await db.query(
      `WITH days AS (
         SELECT (CURRENT_DATE - offset_days)::date AS day_date
         FROM generate_series(6, 0, -1) AS offset_days
       ),
       created AS (
         SELECT created_at::date AS day_date, COUNT(*)::int AS count
         FROM tickets
         WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY created_at::date
       ),
       resolved AS (
         SELECT closed_at::date AS day_date, COUNT(*)::int AS count
         FROM tickets
         WHERE status IN ('resolved', 'abandoned')
           AND closed_at IS NOT NULL
           AND closed_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY closed_at::date
       ),
       rerouted AS (
         SELECT created_at::date AS day_date, COUNT(*)::int AS count
         FROM audit_logs
         WHERE action IN ('ticket_rerouted', 'ticket_rerouted_qa')
           AND created_at >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY created_at::date
       )
       SELECT
         to_char(days.day_date, 'Dy') AS day,
         COALESCE(created.count, 0)::int AS created,
         COALESCE(resolved.count, 0)::int AS resolved,
         COALESCE(rerouted.count, 0)::int AS rerouted
       FROM days
       LEFT JOIN created ON created.day_date = days.day_date
       LEFT JOIN resolved ON resolved.day_date = days.day_date
       LEFT JOIN rerouted ON rerouted.day_date = days.day_date
       ORDER BY days.day_date ASC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// TicketTimelinePanel source. It returns audit events for exactly one ticket
// after checking the same visibility rules as the detail view.
router.get('/:id/activity', async (req, res, next) => {
  try {
    const ticketRow = await db.query(
      `SELECT DISTINCT ON (t.id) t.id, t.submitted_by, ta_qa.assigned_to AS qa_assigned_to, ta_dev.assigned_to AS dev_assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       WHERE t.id = $1`,
      [req.params.id]
    );
    const accessTicket = ticketRow.rows[0];
    if (!accessTicket) return res.status(404).json({ error: 'Ticket not found' });
    accessTicket.assigned_to = accessTicket.qa_assigned_to || accessTicket.dev_assigned_to;
    if (!canViewTicket(req.user, accessTicket)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Status-change audit events for this ticket
    const auditResult = await db.query(
      `SELECT a.id, a.action, a.metadata, a.created_at,
              u.id AS actor_id, u.first_name, u.last_name, u.email AS actor_email, u.role AS actor_role, u.avatar_url
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.metadata->>'ticket_id' = $1
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    res.json({
      events: auditResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Ticket detail endpoint used when TicketHistoryPage opens a selected row by ID.
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.closed_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              qa_assignee.id AS qa_assignee_id,
              qa_assignee.avatar_url AS qa_assignee_avatar_url,
              ${cleanPersonNameSql("CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name)")} AS qa_assignee_name,
              NULLIF(TRIM(qa_assignee.job_title), '') AS qa_assignee_job_title,
              NULLIF(TRIM(qa_assignee.department), '') AS qa_assignee_department,
              dev_assignee.id AS dev_assignee_id,
              dev_assignee.avatar_url AS dev_assignee_avatar_url,
              ${cleanPersonNameSql("CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name)")} AS dev_assignee_name,
              NULLIF(TRIM(dev_assignee.job_title), '') AS dev_assignee_job_title,
              NULLIF(TRIM(dev_assignee.department), '') AS dev_assignee_department,
              COALESCE(dev_assignee.id, qa_assignee.id) AS assigned_to_id,
              COALESCE(dev_assignee.avatar_url, qa_assignee.avatar_url) AS assigned_to_avatar_url,
              COALESCE(
                ${cleanPersonNameSql("CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name)")},
                ${cleanPersonNameSql("CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name)")}
              ) AS assigned_to_name,
              COALESCE(NULLIF(TRIM(dev_assignee.job_title), ''), NULLIF(TRIM(qa_assignee.job_title), '')) AS assigned_to_job_title,
              COALESCE(NULLIF(TRIM(dev_assignee.department), ''), NULLIF(TRIM(qa_assignee.department), '')) AS assigned_to_department
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN users qa_assignee ON qa_assignee.id = ta_qa.assigned_to
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       LEFT JOIN users dev_assignee ON dev_assignee.id = ta_dev.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canViewTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'You do not have access to this ticket' });
    }
    res.json(mapTicketRow(ticket));
  } catch (error) {
    next(error);
  }
});

// CreateTicketModal posts here. New tickets start as pending_routing so the
// backend can immediately choose QA or developer ownership before the queue
// displays the ticket as actively assigned.
router.post('/', requireRole('user'), async (req, res, next) => {
  const parsed = validateTicketCreateBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const category = await client.query(
      `SELECT id, name, is_active FROM categories WHERE id = $1`,
      [parsed.value.categoryId]
    );
    if (!category.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected category does not exist' });
    }
    if (!category.rows[0].is_active) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected category is not active' });
    }

    const ticketResult = await client.query(
      `INSERT INTO tickets (title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata)
       VALUES ($1, $2, $3, $4::ticket_type, $5::ticket_priority, 'pending_routing'::ticket_status, $6, $7, $8::jsonb)
       RETURNING id, title, description, category_id, type, priority, status, submitted_by, replication_steps, metadata, created_at`,
      [
        parsed.value.title,
        parsed.value.description,
        parsed.value.categoryId,
        parsed.value.type,
        parsed.value.priority,
        req.user.id,
        parsed.value.replicationSteps,
        JSON.stringify({
          submitted_via: 'api',
          request_id: crypto.randomUUID(),
          ...(parsed.value.requestQaTesting ? { routing_intent: 'qa_testing' } : {}),
        }),
      ]
    );
    const ticket = ticketResult.rows[0];

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_created', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: ticket.id,
          title: ticket.title,
          type: ticket.type,
          priority: ticket.priority,
          category_id: ticket.category_id,
          category_name: category.rows[0].name,
          initial_status: 'pending_routing',
          submitted_by: req.user.id,
          submitted_by_email: req.user.email,
        }),
      ]
    );

    const luminaId = await getLuminaAiUserId(client);
    if (luminaId) {
      await client.query(
        `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [ticket.id, luminaId, req.user.id]
      );
      await client.query(
        `UPDATE tickets
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{routing,staging}',
           $2::jsonb,
           true
         )
         WHERE id = $1`,
        [
          ticket.id,
          JSON.stringify({
            assigned_to_lumina: true,
            lumina_user_id: luminaId,
            at: new Date().toISOString(),
          }),
        ]
      );
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, metadata)
         VALUES ($1, 'ticket_staged_lumina_ai', $2::jsonb)`,
        [
          req.user.id,
          JSON.stringify({
            ticket_id: ticket.id,
            staged_to: luminaId,
            assignment_mode: 'lumina_ai_pipeline',
          }),
        ]
      );
    }

    const ticketForRouting = {
      ...ticket,
      category_name: category.rows[0].name,
      routing_intent: parsed.value.requestQaTesting ? 'qa_testing' : null,
    };
    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticketForRouting, admins);

    let assignedUser = null;
    let routingMetadata = buildRoutingMetadata(routing);

    if (routing.assignedAdminId) {
      const applied = await applyRoutingAssignment(client, {
        ticket: { ...ticket, status: 'pending_routing' },
        routing,
        actorId: luminaId || req.user.id,
        auditAction: 'ticket_assigned',
        assignmentMode: 'lumina_ai_pipeline',
      });
      assignedUser = applied.assignedUser;
      routingMetadata = applied.routingMetadata;
    } else {
      await client.query(
        `UPDATE tickets
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{routing}',
           $2::jsonb,
           true
         )
         WHERE id = $1`,
        [ticket.id, JSON.stringify(routingMetadata)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(
      mapTicketRow({
        ...ticket,
        status: routing.assignedAdminId ? 'assigned' : ticket.status,
        metadata: {
          ...ticket.metadata,
          routing: routingMetadata,
        },
        category_name: category.rows[0].name,
        submitted_by_id: req.user.id,
        submitted_by_email: req.user.email,
        submitted_by_avatar_url: req.user.avatar_url || null,
        assigned_to_id: assignedUser?.id || null,
        assigned_to_avatar_url: assignedUser?.avatar_url || null,
        assigned_to_name: assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : null,
        assigned_to_job_title: assignedUser?.job_title?.trim() || null,
        routing,
      })
    );
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Manual assignment endpoint for admin ticket controls. Selecting the special
// Lumina AI account intentionally delegates to chooseAssignee instead of storing
// that system account as the owner.
router.post('/:id/assign', async (req, res, next) => {
  const parsed = validateTicketAssignmentBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await client.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.metadata,
              ta.assigned_to,
              ta.assigned_to AS old_assigned_to,
              CONCAT(old_assignee.first_name, ' ', old_assignee.last_name) AS old_assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users old_assignee ON old_assignee.id = ta.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!ticket.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticketRow = ticket.rows[0];
    if (!canMutateTicket(req.user, ticketRow)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the active assignee can change ticket assignment' });
    }

    const assignee = await client.query(
      `SELECT id, email, first_name, last_name, department FROM users
       WHERE id = $1 AND status = 'active'`,
      [parsed.value.assignedTo]
    );
    if (!assignee.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Assignee must be an active user' });
    }

    const assigneeRow = assignee.rows[0];

    if (isLuminaAIUser(assigneeRow)) {
      const admins = await getAdminWorkloads(client);
      const routing = await chooseAssignee(ticketRow, admins);
      const applied = await applyRoutingAssignment(client, {
        ticket: ticketRow,
        routing,
        actorId: req.user.id,
        auditAction: 'ticket_assigned',
        assignmentMode: 'lumina_ai_pipeline',
        requestedAssignee: assigneeRow,
      });

      await client.query('COMMIT');
      return res.json({
        ticketId: req.params.id,
        assignedToId: routing.assignedAdminId,
        assignedToName: applied.assignedToName,
        routing,
        routedVia: 'lumina_ai_pipeline',
      });
    }

    const assignmentRole = assigneeRow.department === 'QA' ? 'qa' : 'developer';
    await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE AND assignment_role = $2`, [
      req.params.id,
      assignmentRole,
    ]);
    await client.query(
      `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active, assignment_role)
       VALUES ($1, $2, $3, TRUE, $4::assignment_role)`,
      [req.params.id, parsed.value.assignedTo, req.user.id, assignmentRole]
    );
    await client.query(`UPDATE tickets SET status = 'assigned'::ticket_status WHERE id = $1`, [req.params.id]);
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_assigned', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          assigned_to: parsed.value.assignedTo,
          assigned_to_name: userDisplayName(assigneeRow),
          old_assigned_to: ticketRow.old_assigned_to,
          old_assigned_to_name: ticketRow.old_assigned_to_name,
          old_status: ticketRow.status,
          new_status: 'assigned',
          source: 'manual',
        }),
      ]
    );

    await client.query('COMMIT');
    res.json({
      ticketId: req.params.id,
      assignedToId: parsed.value.assignedTo,
      assignedToName: userDisplayName(assigneeRow),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Reroute the current developer assignment through the routing engine.
router.post('/:id/route', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.metadata,
              ta_dev.assigned_to AS dev_assigned_to,
              ta_dev.assigned_to AS old_assigned_to,
              CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name) AS old_assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       LEFT JOIN users dev_assignee ON dev_assignee.id = ta_dev.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canRerouteTicket(req.user, ticket)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the assignee or a manager can reroute this ticket' });
    }

    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticket, admins);
    const applied = await applyRoutingAssignment(client, {
      ticket,
      routing,
      actorId: req.user.id,
      auditAction: 'ticket_rerouted',
      assignmentMode: 'ai_routing',
      assignmentRole: 'developer',
    });
    await client.query('COMMIT');
    res.json({
      ticketId: ticket.id,
      assignedToId: routing.assignedAdminId,
      assignedToName: applied.assignedToName,
      routing,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Status updates from ticket action buttons. closed_at is stamped here so the
// analytics page reflects real workflow changes, not only seed data.
router.patch('/:id/status', async (req, res, next) => {
  const parsed = validateTicketStatusBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, t.status,
              COALESCE(ta_dev.assigned_to, ta_qa.assigned_to) AS assigned_to,
              ta_qa.assigned_to AS qa_assignee_id,
              ta_dev.assigned_to AS dev_assignee_id
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const canAssignee = canMutateTicket(req.user, ticket);
    if (!canAssignee) {
      return res.status(403).json({ error: 'Only the active assignee can change this ticket status' });
    }

    // Stamp closed_at when resolving so dashboard "time to resolve" charts use live data, not seed-only.
    const dbStatus = toDbStatus(parsed.value.status);
    const updated = await db.query(
      `UPDATE tickets
       SET status = $2::ticket_status,
           closed_at = CASE
             WHEN $2::text IN ('resolved', 'abandoned') AND closed_at IS NULL THEN NOW()
             ELSE closed_at
           END
       WHERE id = $1
       RETURNING id, status, closed_at`,
      [req.params.id, dbStatus]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_status_changed', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          old_status: ticket.status,
          new_status: parsed.value.status,
          status: parsed.value.status,
        }),
      ]
    );
    res.json(mapTicketRow(updated.rows[0]));
  } catch (error) {
    next(error);
  }
});

// Priority edits from assignee controls; audit_logs feeds timeline and sidebar.
router.patch('/:id/priority', async (req, res, next) => {
  const parsed = validateTicketPriorityBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.priority,
              COALESCE(ta_dev.assigned_to, ta_qa.assigned_to) AS assigned_to,
              ta_qa.assigned_to AS qa_assignee_id,
              ta_dev.assigned_to AS dev_assignee_id
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canMutateTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Only the active assignee can change ticket priority' });
    }

    const updated = await db.query(
      `UPDATE tickets
       SET priority = $2::ticket_priority
       WHERE id = $1
       RETURNING id, priority`,
      [req.params.id, parsed.value.priority]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_priority_changed', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          old_priority: ticket.priority,
          new_priority: parsed.value.priority,
          priority: parsed.value.priority,
        }),
      ]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

// QA-to-developer handoff action used by TicketDetailPanel. It either returns to
// the existing paired developer or asks Lumina to pick one from developer staff.
router.post('/:id/route-to-developer', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.metadata,
              ta_qa.assigned_to AS qa_assigned_to,
              ta_dev.assigned_to AS dev_assigned_to,
              CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name) AS dev_assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
       LEFT JOIN users dev_assignee ON dev_assignee.id = ta_dev.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!isTeamManager(req.user) && !isQaManager(req.user) && ticket.qa_assigned_to !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the assigned QA owner or a manager can route to developer' });
    }

    // Paired handoff: if developer is already assigned, skip AI routing and hand back directly.
    if (ticket.dev_assigned_to) {
      await client.query(`UPDATE tickets SET status = 'assigned'::ticket_status WHERE id = $1`, [ticket.id]);
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, metadata)
         VALUES ($1, 'ticket_routed_to_developer', $2::jsonb)`,
        [
          req.user.id,
          JSON.stringify({
            ticket_id: ticket.id,
            assigned_to: ticket.dev_assigned_to,
            assigned_to_name: ticket.dev_assigned_to_name || null,
            source: 'existing_assignee',
            assignment_mode: 'paired_handoff',
            routing_skipped: true,
          }),
        ]
      );
      await client.query('COMMIT');
      return res.json({
        ticketId: ticket.id,
        assignedToId: ticket.dev_assigned_to,
        assignedToName: ticket.dev_assigned_to_name || null,
        routingSkipped: true,
      });
    }

    const admins = await getAdminWorkloads(client);
    const pool = admins.filter(isDeveloperRoutingCandidate);
    if (!pool.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No active developer is available for routing' });
    }

    const routing = await chooseAssignee(ticket, pool);
    const applied = await applyRoutingAssignment(client, {
      ticket,
      routing,
      actorId: req.user.id,
      auditAction: 'ticket_routed_to_developer',
      assignmentMode: 'qa_routing',
      assignmentRole: 'developer',
    });
    await client.query('COMMIT');
    res.json({
      ticketId: ticket.id,
      assignedToId: routing.assignedAdminId,
      assignedToName: applied.assignedToName,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// QA reassignment action for QA owners/managers when testing work needs a new QA
// assignee but should remain in the QA lane.
router.post('/:id/reroute-to-another-qa', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.metadata,
              ta_qa.assigned_to AS qa_assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!isTeamManager(req.user) && !isQaManager(req.user) && ticket.qa_assigned_to !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only the assigned QA owner or a manager can reroute to another QA' });
    }

    const admins = await getAdminWorkloads(client);
    const qaAdmins = admins.filter((admin) => admin.department === 'QA');
    const pool = qaAdmins.length ? qaAdmins : admins;

    const routing = await chooseAssignee(ticket, pool);
    const applied = await applyRoutingAssignment(client, {
      ticket,
      routing,
      actorId: req.user.id,
      auditAction: 'ticket_rerouted_qa',
      assignmentMode: 'qa_routing',
      assignmentRole: 'qa',
    });
    await client.query('COMMIT');
    res.json({
      ticketId: ticket.id,
      assignedToId: routing.assignedAdminId,
      assignedToName: applied.assignedToName,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Developer-to-QA handoff action. The frontend uses this when a developer wants
// QA verification before a ticket can be resolved.
router.post('/:id/route-to-qa', async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.metadata,
              ta_qa.assigned_to AS qa_assigned_to,
              CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name) AS qa_assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN users qa_assignee ON qa_assignee.id = ta_qa.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.user.department === 'QA' && !isTeamManager(req.user) && !isQaManager(req.user)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'QA users cannot route to QA' });
    }

    // Paired handoff: if QA is already assigned, skip AI routing and hand back directly.
    if (ticket.qa_assigned_to) {
      await client.query(`UPDATE tickets SET status = 'assigned'::ticket_status WHERE id = $1`, [ticket.id]);
      await client.query(
        `INSERT INTO audit_logs (actor_id, action, metadata)
         VALUES ($1, 'ticket_routed_to_qa', $2::jsonb)`,
        [
          req.user.id,
          JSON.stringify({
            ticket_id: ticket.id,
            assigned_to: ticket.qa_assigned_to,
            assigned_to_name: ticket.qa_assigned_to_name || null,
            source: 'existing_assignee',
            assignment_mode: 'paired_handoff',
            routing_skipped: true,
          }),
        ]
      );
      await client.query('COMMIT');
      return res.json({
        ticketId: ticket.id,
        assignedToId: ticket.qa_assigned_to,
        assignedToName: ticket.qa_assigned_to_name || null,
        routingSkipped: true,
      });
    }

    const admins = await getAdminWorkloads(client);
    const qaAdmins = admins.filter((admin) => admin.department === 'QA');
    const pool = qaAdmins.length ? qaAdmins : admins;

    const routing = await chooseAssignee(ticket, pool);
    const applied = await applyRoutingAssignment(client, {
      ticket,
      routing,
      actorId: req.user.id,
      auditAction: 'ticket_routed_to_qa',
      assignmentMode: 'dev_routing',
      assignmentRole: 'qa',
    });
    await client.query('COMMIT');
    res.json({
      ticketId: ticket.id,
      assignedToId: routing.assignedAdminId,
      assignedToName: applied.assignedToName,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// QA verification action. Marks the ticket resolved after the active QA assignee
// confirms the fix, then timeline/analytics pick up the audit and status change.
router.post('/:id/qa-verify', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, t.status, ta.assigned_to,
              ta.assigned_to AS qa_assignee_id,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
              assignee.department AS assigned_to_department
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE AND ta.assignment_role = 'qa'
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canMutateTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Only the active assignee can verify this ticket' });
    }
    if (String(ticket.assigned_to_department || '').trim() !== 'QA') {
      return res.status(400).json({ error: 'Only the QA assignee can mark a ticket as verified' });
    }

    const updated = await db.query(
      `UPDATE tickets SET status = 'resolved'::ticket_status WHERE id = $1 RETURNING id, status`,
      [req.params.id]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_qa_verified', $2::jsonb)`,
      [req.user.id, JSON.stringify({ ticket_id: req.params.id })]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
