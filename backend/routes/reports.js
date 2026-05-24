const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding, requireRole } = require('../middleware/auth');
const { isHrAdmin } = require('../lib/teamScope');

const router = express.Router();

let lastRunTimestamp = null;

router.post('/hr-diagnostics', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  if (!isHrAdmin(req.user)) {
    return res.status(403).json({ error: 'Only HR can run diagnostics.' });
  }

  try {
    const resolvedByAssignee = await db.query(`
      SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        u.department,
        COUNT(DISTINCT t.id) AS count
      FROM tickets t
      JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
      JOIN users u ON u.id = ta.assigned_to
      WHERE t.status IN ('resolved', 'closed')
      GROUP BY u.id, u.first_name, u.last_name, u.department
      ORDER BY count DESC
    `);

    const avgResolveResult = await db.query(`
      WITH resolved_tickets AS (
        SELECT t.id, t.created_at,
          MIN(a.created_at) AS resolved_at
        FROM tickets t
        JOIN audit_logs a ON a.metadata->>'ticket_id' = t.id::text
        WHERE t.status IN ('resolved', 'closed')
          AND a.action = 'ticket_status_changed'
          AND (a.metadata->>'new_status' IN ('resolved', 'closed')
            OR a.metadata->>'status' IN ('resolved', 'closed'))
        GROUP BY t.id, t.created_at
      )
      SELECT
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 0
        ) AS avg_hours
      FROM resolved_tickets
    `);

    const workloadByDept = await db.query(`
      SELECT
        COALESCE(u.department, 'Unassigned') AS department,
        COUNT(DISTINCT t.id) AS open_tickets
      FROM tickets t
      LEFT JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
      LEFT JOIN users u ON u.id = ta.assigned_to
      WHERE t.status NOT IN ('resolved', 'closed')
      GROUP BY u.department
      ORDER BY open_tickets DESC
    `);

    const qaQueue = await db.query(`
      SELECT COUNT(DISTINCT t.id) AS queue_depth
      FROM tickets t
      JOIN ticket_assignment ta ON ta.ticket_id = t.id AND ta.is_active = TRUE
      JOIN users u ON u.id = ta.assigned_to
      WHERE t.status NOT IN ('resolved', 'closed')
        AND u.department = 'QA'
    `);

    lastRunTimestamp = new Date().toISOString();

    res.json({
      lastRunAt: lastRunTimestamp,
      resolvedByAssignee: resolvedByAssignee.rows,
      avgTimeToResolveHours: Math.round((avgResolveResult.rows[0]?.avg_hours || 0) * 100) / 100,
      workloadByDepartment: workloadByDept.rows,
      qaQueueDepth: qaQueue.rows[0]?.queue_depth || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
