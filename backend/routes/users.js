const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationError } = require('../lib/authValidation');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  res.json(req.user);
});

router.get('/', requireAuth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const values = [];
    const clauses = [];

    if (req.query.role) {
      values.push(String(req.query.role));
      clauses.push(`role = $${values.length}::user_role`);
    }
    if (req.query.status) {
      values.push(String(req.query.status));
      clauses.push(`status = $${values.length}::user_status`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified,
              avatar_url, approved_by, approved_at, created_at, last_login_at
       FROM users
       ${where}
       ORDER BY created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/approval', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  const status = String(req.body?.status ?? '').trim();
  if (!['active', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json(validationError({ status: 'Status must be active, pending, or suspended' }));
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET status = $2::user_status,
           approved_by = CASE WHEN $2 = 'active' THEN $3 ELSE approved_by END,
           approved_at = CASE WHEN $2 = 'active' THEN NOW() ELSE approved_at END
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, approved_by, approved_at`,
      [req.params.id, status, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
