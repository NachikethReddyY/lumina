const express = require('express');
const auditLogsRoutes = require('./auditLogs');
const authRoutes = require('./auth');
const categoriesRoutes = require('./categories');
const commentsRoutes = require('./comments');
const notificationsRoutes = require('./notifications');
const reportsRoutes = require('./reports');
const ticketsRoutes = require('./tickets');
const userSummaryRoutes = require('./userSummary');
const usersRoutes = require('./users');

const router = express.Router();

// /api/v1 route registry. The frontend API client mirrors these mount points in
// src/utils/apiClient.ts, so changing a path here also means updating the client
// wrapper, hooks, and page-level cache keys that call it.
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lumina-api', version: '1' });
});

router.use('/auth', authRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/tickets/:ticketId/comments', commentsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/users', userSummaryRoutes);
router.use('/users', usersRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);

module.exports = router;
