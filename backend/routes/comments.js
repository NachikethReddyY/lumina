const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(requireAuth, requireOnboarding);

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.body, c.created_at,
              u.id AS author_id, u.first_name, u.last_name, u.email, u.avatar_url, u.role
       FROM ticket_comments c
       JOIN users u ON u.id = c.author_id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.ticketId]
    );
    res.json(result.rows);
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
    const ticket = await db.query(
      `SELECT id, submitted_by FROM tickets WHERE id = $1`,
      [req.params.ticketId]
    );
    if (!ticket.rows[0]) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const isAdmin = req.user.role === 'admin';
    const isOwner = ticket.rows[0].submitted_by === req.user.id;
    if (!isAdmin && !isOwner) {
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
      ...comment,
      author_id: req.user.id,
      first_name: req.user.first_name,
      last_name: req.user.last_name,
      email: req.user.email,
      avatar_url: req.user.avatar_url,
      role: req.user.role,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:commentId', async (req, res, next) => {
  try {
    const commentResult = await db.query(
      `SELECT c.id, c.ticket_id, c.author_id, t.submitted_by
       FROM ticket_comments c
       JOIN tickets t ON t.id = c.ticket_id
       WHERE c.id = $1 AND c.ticket_id = $2`,
      [req.params.commentId, req.params.ticketId]
    );

    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAuthor = comment.author_id === req.user.id;
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query(`DELETE FROM ticket_comments WHERE id = $1`, [req.params.commentId]);
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'ticket_comment_deleted', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          ticket_id: req.params.ticketId,
          comment_id: req.params.commentId,
        }),
      ]
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
