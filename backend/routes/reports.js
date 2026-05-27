const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding, requireRole } = require('../middleware/auth');
const { isHrAdmin } = require('../lib/teamScope');
const { generateHrReport } = require('../lib/hrReport');

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

router.post('/hr-generate', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  if (!isHrAdmin(req.user)) {
    return res.status(403).json({ error: 'Only HR can generate reports.' });
  }

  try {
    const { period = '30d' } = req.body;
    if (!['7d', '30d'].includes(period)) {
      return res.status(400).json({ error: 'Period must be 7d (this week) or 30d (this month)' });
    }

    const report = await generateHrReport(period);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/ticket-closure-analytics', requireAuth, requireOnboarding, async (req, res, next) => {
  try {
    const monthlyAvgResult = await db.query(`
      SELECT
        TO_CHAR(t.created_at, 'Mon YYYY') AS month,
        COUNT(DISTINCT t.id) AS count,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600), 0
        ) AS avg_hours
      FROM tickets t
      WHERE t.status IN ('closed', 'resolved')
        AND t.closed_at IS NOT NULL
        AND t.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(t.created_at, 'Mon YYYY'), DATE_TRUNC('month', t.created_at)
      ORDER BY DATE_TRUNC('month', t.created_at)
    `);

    const closureDistributionResult = await db.query(`
      WITH closure_times AS (
        SELECT
          EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600 AS hours_to_close
        FROM tickets t
        WHERE t.status IN ('closed', 'resolved')
          AND t.closed_at IS NOT NULL
          AND t.created_at >= NOW() - INTERVAL '6 months'
      )
      SELECT
        CASE
          WHEN hours_to_close < 4 THEN 'Under 4h'
          WHEN hours_to_close < 24 THEN '4-24h'
          WHEN hours_to_close < 72 THEN '1-3d'
          WHEN hours_to_close < 168 THEN '3-7d'
          WHEN hours_to_close < 720 THEN '1-4w'
          ELSE '4w+'
        END AS range,
        COUNT(*) AS count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
      FROM closure_times
      GROUP BY range
      ORDER BY CASE range
        WHEN 'Under 4h' THEN 1
        WHEN '4-24h' THEN 2
        WHEN '1-3d' THEN 3
        WHEN '3-7d' THEN 4
        WHEN '1-4w' THEN 5
        WHEN '4w+' THEN 6
      END
    `);

    const priorityAnalysisResult = await db.query(`
      SELECT
        t.priority,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600), 0
        ) AS avg_hours,
        COUNT(DISTINCT t.id) AS count
      FROM tickets t
      WHERE t.status IN ('closed', 'resolved')
        AND t.closed_at IS NOT NULL
        AND t.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY t.priority
      ORDER BY CASE t.priority
        WHEN 'P1' THEN 1
        WHEN 'P2' THEN 2
        WHEN 'P3' THEN 3
        WHEN 'P4' THEN 4
      END
    `);

    const ticketTimelineResult = await db.query(`
      SELECT
        ROW_NUMBER() OVER (ORDER BY t.created_at) AS seq,
        SUBSTRING(t.title, 1, 20) AS name,
        t.priority,
        EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 3600 AS hours,
        TO_CHAR(t.created_at, 'Mon') AS month
      FROM tickets t
      WHERE t.status IN ('closed', 'resolved')
        AND t.closed_at IS NOT NULL
        AND t.created_at >= NOW() - INTERVAL '6 months'
      ORDER BY t.created_at
      LIMIT 100
    `);

    const priorityColors = {
      P1: '#ef4444',
      P2: '#f97316',
      P3: '#eab308',
      P4: '#6b7280',
    };

    res.json({
      monthlyAverage: monthlyAvgResult.rows.map(r => ({
        month: r.month,
        avgHours: Math.round(r.avg_hours * 10) / 10,
        count: parseInt(r.count, 10),
      })),
      closureDistribution: closureDistributionResult.rows.map(r => ({
        range: r.range,
        count: parseInt(r.count, 10),
        percentage: parseFloat(r.percentage),
      })),
      priorityAnalysis: priorityAnalysisResult.rows.map(r => ({
        priority: r.priority,
        avgHours: Math.round(r.avg_hours * 10) / 10,
        count: parseInt(r.count, 10),
        fill: priorityColors[r.priority] || '#6b7280',
      })),
      ticketTimeline: ticketTimelineResult.rows.map(r => ({
        name: r.name || 'Ticket',
        hours: Math.round(r.hours * 10) / 10,
        priority: r.priority,
        month: r.month,
        fill: priorityColors[r.priority] || '#6b7280',
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
