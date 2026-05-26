const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding, requireRole } = require('../middleware/auth');
const {
  validateRatingBody,
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
const { isTeamManager, isHrAdmin, isOrgViewer, TEAM_MEMBER_DEPARTMENTS } = require('../lib/teamScope');
const { canMutateTicket, canViewTicket, canRerouteTicket, canEditTicketDetails, canSendToQa, isAssignedToQa } = require('../lib/ticketPermissions');

const router = express.Router();

router.use(requireAuth, requireOnboarding);

function assignedToUserSql(paramIndex) {
  return `EXISTS (
    SELECT 1
    FROM ticket_assignment ta
    WHERE ta.ticket_id = t.id AND ta.assigned_to = $${paramIndex} AND ta.is_active = TRUE
  )`;
}

function userDisplayName(user) {
  return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || null;
}

function buildRoutingMetadata(routing) {
  return {
    source: routing.source,
    assigned_admin_id: routing.assignedAdminId,
    reasoning: routing.reasoning,
    decision: routing.decision || null,
  };
}

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

router.get('/', async (req, res, next) => {
  try {
    const values = [];
    const clauses = [];

    const scope = String(req.query.scope || '').trim();

    // Org-wide transparency: default list shows every ticket unless a narrower scope is requested.
    if (scope === 'submitted') {
      values.push(req.user.id);
      clauses.push(`t.submitted_by = $${values.length}`);
    } else if (scope === 'assigned') {
      values.push(req.user.id);
      clauses.push(assignedToUserSql(values.length));
    } else if (scope === 'team') {
      values.push(TEAM_MEMBER_DEPARTMENTS);
      clauses.push(`submitter.department = ANY($${values.length}::text[])`);
    } else if (scope === 'org' || scope === '' || !scope) {
      /* All active users: full organization queue (read-only in UI for non-assignees). */
    } else if (req.user.role === 'user') {
      values.push(req.user.id);
      const userParam = `$${values.length}`;
      clauses.push(`(t.submitted_by = ${userParam} OR ${assignedToUserSql(values.length)})`);
    }

    if (req.query.status) {
      values.push(String(req.query.status));
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
              CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name) AS qa_assignee_name,
              qa_assignee.job_title AS qa_assignee_job_title,
              dev_assignee.id AS dev_assignee_id,
              dev_assignee.avatar_url AS dev_assignee_avatar_url,
              CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name) AS dev_assignee_name,
              dev_assignee.job_title AS dev_assignee_job_title,
              COALESCE(qa_assignee.id, dev_assignee.id) AS assigned_to_id,
              COALESCE(qa_assignee.avatar_url, dev_assignee.avatar_url) AS assigned_to_avatar_url,
              COALESCE(CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name), CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name)) AS assigned_to_name,
              COALESCE(qa_assignee.job_title, dev_assignee.job_title) AS assigned_to_job_title
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
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/workload', requireRole('admin'), async (_req, res, next) => {
  try {
    const data = await getAdminWorkloads();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/stats/solved-by-assignee', async (req, res, next) => {
  try {
    const period = String(req.query.period || '30d').trim();
    let intervalDays = 30;
    if (period === '7d') intervalDays = 7;
    else if (period === '90d') intervalDays = 90;

    const result = await db.query(
      `SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.department,
        COUNT(DISTINCT t.id) AS count
      FROM tickets t
      JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
      JOIN users u ON u.id = ta.assigned_to
      WHERE t.status IN ('resolved', 'closed')
        AND t.created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY u.id, u.first_name, u.last_name, u.department
      ORDER BY count DESC`,
      [intervalDays]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

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
       JOIN users u ON u.id = a.actor_id
       WHERE a.metadata->>'ticket_id' = $1
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    // Satisfaction rating if exists
    const ratingResult = await db.query(
      `SELECT sr.rating, sr.comment, sr.ticket_id,
              u.first_name, u.last_name, u.email, u.avatar_url
       FROM satisfaction_ratings sr
       JOIN users u ON u.id = sr.rated_by
       WHERE sr.ticket_id = $1`,
      [req.params.id]
    );

    res.json({
      events: auditResult.rows,
      rating: ratingResult.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.closed_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              qa_assignee.id AS qa_assignee_id,
              qa_assignee.avatar_url AS qa_assignee_avatar_url,
              CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name) AS qa_assignee_name,
              qa_assignee.job_title AS qa_assignee_job_title,
              dev_assignee.id AS dev_assignee_id,
              dev_assignee.avatar_url AS dev_assignee_avatar_url,
              CONCAT(dev_assignee.first_name, ' ', dev_assignee.last_name) AS dev_assignee_name,
              dev_assignee.job_title AS dev_assignee_job_title,
              qa_assignee.id AS assigned_to_id,
              qa_assignee.avatar_url AS assigned_to_avatar_url,
              CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name) AS assigned_to_name,
              qa_assignee.job_title AS assigned_to_job_title
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
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

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
    res.status(201).json({
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
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

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

router.patch('/:id/status', async (req, res, next) => {
  const parsed = validateTicketStatusBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, t.status, ta.assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
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
    const updated = await db.query(
      `UPDATE tickets
       SET status = $2::ticket_status,
           closed_at = CASE
             WHEN $2::text IN ('resolved', 'closed') AND closed_at IS NULL THEN NOW()
             ELSE closed_at
           END
       WHERE id = $1
       RETURNING id, status, closed_at`,
      [req.params.id, parsed.value.status]
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
    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/priority', async (req, res, next) => {
  const parsed = validateTicketPriorityBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.priority, ta.assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
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

router.post('/:id/rating', async (req, res, next) => {
  const parsed = validateRatingBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const ticket = await db.query(`SELECT id, submitted_by, status FROM tickets WHERE id = $1`, [req.params.id]);
    const row = ticket.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (row.submitted_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the ticket owner can leave a rating' });
    }
    if (!['resolved', 'closed'].includes(row.status)) {
      return res.status(400).json({ error: 'You can rate only resolved or closed tickets' });
    }

    const result = await db.query(
      `INSERT INTO satisfaction_ratings (ticket_id, rated_by, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ticket_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, rated_by = EXCLUDED.rated_by
       RETURNING id, ticket_id, rated_by, rating, comment`,
      [req.params.id, req.user.id, parsed.value.rating, parsed.value.comment]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_rated', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.id,
          rating: parsed.value.rating,
        }),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/details', async (req, res, next) => {
  const { title, description, replicationSteps } = req.body || {};
  if (!title && !description && replicationSteps === undefined) {
    return res.status(400).json({ error: 'Provide at least one field: title, description, or replicationSteps' });
  }

  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, ta.assigned_to
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canEditTicketDetails(req.user, ticket)) {
      return res.status(403).json({ error: 'You do not have permission to edit this ticket' });
    }

    const sets = [];
    const params = [req.params.id];
    let idx = 2;
    if (title !== undefined) { sets.push(`title = $${idx}`); params.push(title); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); params.push(description); idx++; }
    if (replicationSteps !== undefined) { sets.push(`replication_steps = $${idx}`); params.push(replicationSteps); idx++; }

    const updated = await db.query(
      `UPDATE tickets SET ${sets.join(', ')} WHERE id = $1 RETURNING id, title, description, replication_steps`,
      params
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_details_updated', $2::jsonb)`,
      [req.user.id, JSON.stringify({ ticket_id: req.params.id, ...req.body })]
    );

    res.json(updated.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/route-to-developer', async (req, res, next) => {
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
    if (req.user.department !== 'QA') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only QA users can route to developer' });
    }

    const admins = await getAdminWorkloads(client);
    const devAdmins = admins.filter((admin) => admin.department && admin.department !== 'QA' && admin.department !== 'HR');
    const pool = devAdmins.length ? devAdmins : admins;

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
    if (req.user.department !== 'QA') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only QA users can reroute to another QA' });
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

router.post('/:id/route-to-qa', async (req, res, next) => {
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
    if (req.user.department === 'QA') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'QA users cannot route to QA' });
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

router.post('/:id/qa-verify', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.id, t.submitted_by, t.status, ta.assigned_to,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
              assignee.department AS assigned_to_department
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
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
