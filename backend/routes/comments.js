const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding } = require('../middleware/auth');
const { canCommentOnTicket, canDeleteComment, canViewTicket } = require('../lib/ticketPermissions');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireOnboarding);

/** Load ticket row needed for permission checks on this thread. */
async function loadTicketForComments(ticketId) {
  const result = await db.query(
    `SELECT t.id, t.submitted_by, t.status,
            qa.id AS qa_assignee_id,
            dev.id AS dev_assignee_id,
            COALESCE(qa.id, dev.id) AS assigned_to_id
     FROM tickets t
     LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
     LEFT JOIN users qa ON qa.id = ta_qa.assigned_to
     LEFT JOIN ticket_assignment ta_dev ON ta_dev.ticket_id = t.id AND ta_dev.is_active = TRUE AND ta_dev.assignment_role = 'developer'
     LEFT JOIN users dev ON dev.id = ta_dev.assigned_to
     WHERE t.id = $1`,
    [ticketId]
  );
  return result.rows[0] || null;
}

/** Shape one comment row for the API (active or tombstone). */
function mapCommentRow(row) {
  const authorName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email;
  const isDeleted = Boolean(row.deleted_at);

  let body = row.body;
  let tombstoneMessage = null;

  if (isDeleted) {
    body = null;
    if (row.deletion_type === 'admin' && row.deleted_by_first_name) {
      const moderator = `${row.deleted_by_first_name} ${row.deleted_by_last_name || ''}`.trim();
      tombstoneMessage = `This comment was removed by ${moderator}.`;
    } else {
      tombstoneMessage = 'This comment was deleted.';
    }
  }

  return {
    id: row.id,
    ticket_id: row.ticket_id,
    body,
    created_at: row.created_at,
    author_id: row.author_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    avatar_url: row.avatar_url,
    role: row.role,
    is_deleted: isDeleted,
    deletion_type: row.deletion_type || null,
    deleted_at: row.deleted_at || null,
    deleted_by_name: isDeleted && row.deletion_type === 'admin'
      ? `${row.deleted_by_first_name || ''} ${row.deleted_by_last_name || ''}`.trim() || null
      : null,
    tombstone_message: tombstoneMessage,
    author_name: authorName,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const ticket = await loadTicketForComments(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    // Security fix (preflight): must verify ticket access before listing comments.
    if (!canViewTicket(req.user, { ...ticket, submitted_by_id: ticket.submitted_by })) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT c.id, c.ticket_id, c.body, c.created_at, c.deleted_at, c.deletion_type,
              u.id AS author_id, u.first_name, u.last_name, u.email, u.avatar_url, u.role,
              db.first_name AS deleted_by_first_name, db.last_name AS deleted_by_last_name
       FROM ticket_comments c
       JOIN users u ON u.id = c.author_id
       LEFT JOIN users db ON db.id = c.deleted_by
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.ticketId]
    );

    res.json(result.rows.map(mapCommentRow));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const body = String(req.body?.body ?? '').trim();
  if (!body) {
    return res.status(400).json({ error: 'Comment body is required' });
  }

  try {
    const ticket = await loadTicketForComments(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canCommentOnTicket(req.user, { ...ticket, submitted_by_id: ticket.submitted_by })) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `INSERT INTO ticket_comments (ticket_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, ticket_id, body, created_at`,
      [req.params.ticketId, req.user.id, body]
    );
    const comment = result.rows[0];

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_comment_added', $2::jsonb)`,
      [req.user.id, JSON.stringify({ ticket_id: req.params.ticketId, comment_id: comment.id })]
    );

    res.status(201).json({
      ...mapCommentRow({
        ...comment,
        author_id: req.user.id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email,
        avatar_url: req.user.avatar_url,
        role: req.user.role,
        deleted_at: null,
        deletion_type: null,
        deleted_by_first_name: null,
        deleted_by_last_name: null,
      }),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:commentId', async (req, res, next) => {
  try {
    const ticket = await loadTicketForComments(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (!canViewTicket(req.user, { ...ticket, submitted_by_id: ticket.submitted_by })) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const commentResult = await db.query(
      `SELECT c.id, c.ticket_id, c.author_id, c.deleted_at, c.body,
              u.first_name, u.last_name, u.email, u.avatar_url, u.role
       FROM ticket_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.id = $1 AND c.ticket_id = $2`,
      [req.params.commentId, req.params.ticketId]
    );

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (comment.deleted_at) {
      return res.status(410).json({ error: 'Comment already deleted' });
    }

    if (!canDeleteComment(req.user, comment)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isAdmin = req.user.role === 'admin' && comment.author_id !== req.user.id;
    const deletionType = isAdmin ? 'admin' : 'author';

    const updated = await db.query(
      `UPDATE ticket_comments
       SET deleted_at = NOW(),
           deleted_by = $3,
           deletion_type = $4,
           body = ''
       WHERE id = $1 AND ticket_id = $2
       RETURNING id, ticket_id, created_at, deleted_at, deletion_type`,
      [req.params.commentId, req.params.ticketId, req.user.id, deletionType]
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_comment_deleted', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.ticketId,
          comment_id: req.params.commentId,
          deletion_type: deletionType,
        }),
      ]
    );

    const row = {
      ...updated.rows[0],
      body: null,
      author_id: comment.author_id,
      first_name: comment.first_name,
      last_name: comment.last_name,
      email: comment.email,
      avatar_url: comment.avatar_url,
      role: comment.role,
      deleted_by_first_name: isAdmin ? req.user.first_name : null,
      deleted_by_last_name: isAdmin ? req.user.last_name : null,
    };

    res.json(mapCommentRow(row));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
