const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  validateRatingBody,
  validateTicketAssignmentBody,
  validateTicketCreateBody,
  validateTicketPriorityBody,
  validateTicketStatusBody,
  validationError,
} = require('../lib/ticketValidation');
const { chooseAssignee, getAdminWorkloads, isLuminaAIUser } = require('../lib/ticketRouting');

const router = express.Router();

router.use(requireAuth);

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

async function applyRoutingAssignment(client, { ticket, routing, actorId, auditAction, assignmentMode, requestedAssignee = null }) {
  if (!routing.assignedAdminId) {
    throw Object.assign(new Error('No admins are available for routing'), { status: 409 });
  }

  const routingMetadata = buildRoutingMetadata(routing);
  const assignedResult = await client.query(
    `SELECT id, first_name, last_name, email FROM users WHERE id = $1`,
    [routing.assignedAdminId]
  );
  const assignedUser = assignedResult.rows[0] || null;
  if (!assignedUser || isLuminaAIUser(assignedUser)) {
    throw Object.assign(new Error('Lumina AI routes tickets to real admins and cannot own tickets'), { status: 409 });
  }
  const assignedToName = userDisplayName(assignedUser);

  await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE`, [
    ticket.id,
  ]);
  await client.query(
    `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
     VALUES ($1, $2, $3, TRUE)`,
    [ticket.id, routing.assignedAdminId, actorId]
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

    if (req.user.role === 'user') {
      values.push(req.user.id);
      clauses.push(`t.submitted_by = $${values.length}`);
    } else if (req.query.scope === 'assigned') {
      values.push(req.user.id);
      clauses.push(
        `EXISTS (
          SELECT 1
          FROM ticket_assignment ta
          WHERE ta.ticket_id = t.id AND ta.assigned_to = $${values.length} AND ta.is_active = TRUE
        )`
      );
    }

    if (req.query.status) {
      values.push(String(req.query.status));
      clauses.push(`t.status = $${values.length}::ticket_status`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              assignee.id AS assigned_to_id,
              assignee.avatar_url AS assigned_to_avatar_url,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       ${where}
       ORDER BY t.created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/admin/workload', requireRole('admin', 'super_admin'), async (_req, res, next) => {
  try {
    const data = await getAdminWorkloads();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/activity', async (req, res, next) => {
  try {
    const ticketCheck = await db.query(
      `SELECT id, submitted_by FROM tickets WHERE id = $1`,
      [req.params.id]
    );
    const ticket = ticketCheck.rows[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (req.user.role === 'user' && ticket.submitted_by !== req.user.id) {
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
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.created_at, t.replication_steps,
              t.metadata, c.id AS category_id, c.name AS category_name,
              submitter.id AS submitted_by_id, submitter.email AS submitted_by_email,
              submitter.avatar_url AS submitted_by_avatar_url,
              assignee.id AS assigned_to_id,
              assignee.avatar_url AS assigned_to_avatar_url,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name
       FROM tickets t
       JOIN categories c ON c.id = t.category_id
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users assignee ON assignee.id = ta.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.user.role === 'user' && ticket.submitted_by_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this ticket' });
    }
    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
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

    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticket, admins);
    const routingMetadata = {
      source: routing.source,
      assigned_admin_id: routing.assignedAdminId,
      reasoning: routing.reasoning,
      decision: routing.decision || null,
    };

    let assignedUser = null;
    if (routing.assignedAdminId) {
      await client.query(
        `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [ticket.id, routing.assignedAdminId, req.user.id]
      );
      await client.query(
        `UPDATE tickets
         SET status = 'assigned'::ticket_status,
             metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{routing}',
               $2::jsonb,
               true
             )
         WHERE id = $1`,
        [
          ticket.id,
          JSON.stringify(routingMetadata),
        ]
      );
      const assignedResult = await client.query(
        `SELECT id, first_name, last_name, email, avatar_url FROM users WHERE id = $1`,
        [routing.assignedAdminId]
      );
      assignedUser = assignedResult.rows[0] || null;

      await client.query(
        `INSERT INTO audit_logs (actor_id, action, metadata)
         VALUES ($1, 'ticket_assigned', $2::jsonb)`,
        [
          req.user.id,
          JSON.stringify({
            ticket_id: ticket.id,
            assigned_to: routing.assignedAdminId,
            assigned_to_name: assignedUser
              ? `${assignedUser.first_name} ${assignedUser.last_name}`
              : null,
            source: routing.source,
            routing_source: routing.source,
            routing_reasoning: routing.reasoning,
            routing_decision: routing.decision || null,
            old_status: 'pending_routing',
            new_status: 'assigned',
            assignment_mode: 'ai_routing',
          }),
        ]
      );
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
      routing,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/assign', requireRole('admin', 'super_admin'), async (req, res, next) => {
  const parsed = validateTicketAssignmentBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const ticket = await client.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.status, t.metadata,
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

    const assignee = await client.query(
      `SELECT id, email, first_name, last_name FROM users
       WHERE id = $1 AND role IN ('admin', 'super_admin') AND status = 'active'`,
      [parsed.value.assignedTo]
    );
    if (!assignee.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Assignee must be an active admin user' });
    }

    const ticketRow = ticket.rows[0];
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

    await client.query(`UPDATE ticket_assignment SET is_active = FALSE WHERE ticket_id = $1 AND is_active = TRUE`, [
      req.params.id,
    ]);
    await client.query(
      `INSERT INTO ticket_assignment (ticket_id, assigned_to, assigned_by, is_active)
       VALUES ($1, $2, $3, TRUE)`,
      [req.params.id, parsed.value.assignedTo, req.user.id]
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

router.post('/:id/route', requireRole('admin', 'super_admin'), async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT t.id, t.title, t.description, t.type, t.priority, t.metadata,
              ta.assigned_to AS old_assigned_to,
              CONCAT(old_assignee.first_name, ' ', old_assignee.last_name) AS old_assigned_to_name
       FROM tickets t
       LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
       LEFT JOIN users old_assignee ON old_assignee.id = ta.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const admins = await getAdminWorkloads(client);
    const routing = await chooseAssignee(ticket, admins);
    const applied = await applyRoutingAssignment(client, {
      ticket,
      routing,
      actorId: req.user.id,
      auditAction: 'ticket_rerouted',
      assignmentMode: 'ai_routing',
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

    const canAdmin = ['admin', 'super_admin'].includes(req.user.role);
    const canAssignee = ticket.assigned_to === req.user.id;
    if (!canAdmin && !canAssignee) {
      return res.status(403).json({ error: 'You cannot change this ticket status' });
    }

    const updated = await db.query(
      `UPDATE tickets
       SET status = $2::ticket_status
       WHERE id = $1
       RETURNING id, status`,
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

router.patch('/:id/priority', requireRole('admin', 'super_admin'), async (req, res, next) => {
  const parsed = validateTicketPriorityBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `SELECT id, priority
       FROM tickets
       WHERE id = $1`,
      [req.params.id]
    );
    const ticket = result.rows[0];
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
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

module.exports = router;
