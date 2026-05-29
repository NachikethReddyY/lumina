const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding } = require('../middleware/auth');

const router = express.Router();

// Compact profile popover endpoint for UserProfileCard. It exposes enough user
// and ticket-count context for hover/detail UI without granting full directory
// access to every authenticated user.
router.get('/:id/summary', requireAuth, requireOnboarding, async (req, res, next) => {
  try {
    const targetId = req.params.id;
    const requesterId = req.user.id;

    if (targetId !== requesterId) {
      const sameOrg = req.user.department
        ? await db.query(
            `SELECT 1 FROM users WHERE id = $1 AND department = $2 LIMIT 1`,
            [targetId, req.user.department]
          )
        : { rows: [] };

      const shareContext = sameOrg.rows.length
        ? { rows: [1] }
        : await db.query(
            `SELECT 1 FROM tickets t
             WHERE (
               t.submitted_by = $1
               OR EXISTS (SELECT 1 FROM ticket_assignment ta WHERE ta.ticket_id = t.id AND ta.assigned_to = $1 AND ta.is_active = TRUE)
             )
             AND (
               t.submitted_by = $2
               OR EXISTS (SELECT 1 FROM ticket_assignment ta WHERE ta.ticket_id = t.id AND ta.assigned_to = $2 AND ta.is_active = TRUE)
             )
             LIMIT 1`,
            [requesterId, targetId]
          );

      if (!sameOrg.rows.length && !shareContext.rows.length) {
        return res.status(403).json({ error: 'You do not have permission to view this user' });
      }
    }

    const result = await db.query(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.avatar_url,
         u.job_title,
         u.department,
         COALESCE((
           SELECT COUNT(*) FROM ticket_assignment ta
           JOIN tickets t ON t.id = ta.ticket_id
           WHERE ta.assigned_to = u.id
             AND ta.is_active = TRUE
             AND t.status IN ('todo', 'assigned', 'in_progress', 'on_hold', 'pending_routing')
         ), 0)::int AS open_ticket_count,
         COALESCE((
           SELECT COUNT(*) FROM ticket_assignment ta
           JOIN tickets t ON t.id = ta.ticket_id
           WHERE ta.assigned_to = u.id
             AND ta.is_active = TRUE
             AND t.status IN ('resolved', 'closed')
             AND t.created_at >= NOW() - INTERVAL '30 days'
         ), 0)::int AS recently_resolved_count
       FROM users u
       WHERE u.id = $1`,
      [targetId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
