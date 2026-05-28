const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding } = require('../middleware/auth');
const { isOrgViewer } = require('../lib/teamScope');

const router = express.Router();

// Notification feed for AppSidebar. It derives user-visible events from
// audit_logs instead of maintaining a separate inbox table, so ticket actions,
// routing decisions, comments, and account approvals all use one activity source.
router.use(requireAuth, requireOnboarding);

// Returns recent activity relevant to the current user:
// - for users: events on tickets they submitted
// - for org viewers: all recent system events
// - for admins: events on tickets currently assigned to them plus their own work
router.get('/', async (req, res, next) => {
  try {
    let result;
    if (req.user.role === 'user') {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.metadata->>'ticket_id' IN (
           SELECT id::text FROM tickets WHERE submitted_by = $1
           UNION
           SELECT id::text FROM tickets t
           WHERE EXISTS (
             SELECT 1 FROM ticket_assignment ta
             WHERE ta.ticket_id = t.id AND ta.assigned_to = $1 AND ta.is_active = TRUE
           )
         )
         OR a.actor_id = $1
         ORDER BY a.created_at DESC
         LIMIT 30`,
        [req.user.id]
      );
    } else if (isOrgViewer(req.user)) {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT 50`
      );
    } else if (req.user.role === 'admin') {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.metadata->>'ticket_id' IN (
           SELECT id::text FROM tickets t
           WHERE EXISTS (
             SELECT 1 FROM ticket_assignment ta
             WHERE ta.ticket_id = t.id AND ta.assigned_to = $1 AND ta.is_active = TRUE
           )
         )
         OR a.actor_id = $1
         ORDER BY a.created_at DESC
         LIMIT 50`,
        [req.user.id]
      );
    } else {
      result = await db.query(
        `SELECT a.id, a.action, a.metadata, a.created_at,
                u.first_name, u.last_name, u.email AS actor_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC
         LIMIT 50`
      );
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// AI decision drawer/analytics source. The frontend displays routing reasoning
// from tickets.metadata so admins can inspect why Lumina chose an assignee.
router.get('/ai-decisions', requireAuth, async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (t.id) t.id, t.title, t.priority, t.type, t.created_at,
              t.metadata->'routing' AS routing,
              submitter.department AS submitter_department,
              COALESCE(
                NULLIF(TRIM(CONCAT(routed_assignee.first_name, ' ', routed_assignee.last_name)), ''),
                NULLIF(TRIM(CONCAT(qa_assignee.first_name, ' ', qa_assignee.last_name)), '')
              ) AS assigned_to_name,
              COALESCE(NULLIF(TRIM(routed_assignee.job_title), ''), NULLIF(TRIM(qa_assignee.job_title), '')) AS assigned_to_job_title
       FROM tickets t
       JOIN users submitter ON submitter.id = t.submitted_by
       LEFT JOIN ticket_assignment ta_qa ON ta_qa.ticket_id = t.id AND ta_qa.is_active = TRUE AND ta_qa.assignment_role = 'qa'
       LEFT JOIN users qa_assignee ON qa_assignee.id = ta_qa.assigned_to
       LEFT JOIN users routed_assignee ON routed_assignee.id::text = t.metadata->'routing'->>'assigned_admin_id'
       WHERE t.metadata->'routing' IS NOT NULL
         AND t.metadata->'routing' != 'null'
       ORDER BY t.id, t.created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
