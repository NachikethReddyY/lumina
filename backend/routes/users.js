const path = require('path');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validationError } = require('../lib/authValidation');

const router = express.Router();

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/avatars'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

router.get('/me', requireAuth, async (req, res) => {
  res.json(req.user);
});

router.patch('/me/password', requireAuth, async (req, res, next) => {
  const current = String(req.body?.currentPassword ?? '').trim();
  const next_ = String(req.body?.newPassword ?? '').trim();
  if (!current || !next_) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (next_.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  try {
    const result = await db.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [req.user.id]
    );
    const row = result.rows[0];
    if (!row?.password_hash) {
      return res.status(400).json({ error: 'No password set on this account (OAuth login)' });
    }
    const valid = await db.query(
      `SELECT (password_hash = crypt($1, password_hash)) AS ok FROM users WHERE id = $2`,
      [current, req.user.id]
    );
    if (!valid.rows[0]?.ok) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    await db.query(
      `UPDATE users SET password_hash = crypt($2, gen_salt('bf')) WHERE id = $1`,
      [req.user.id, next_]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata) VALUES ($1, 'password_changed', '{}'::jsonb)`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/me/avatar', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  try {
    const result = await db.query(
      `UPDATE users SET avatar_url = $2 WHERE id = $1
       RETURNING id, avatar_url`,
      [req.user.id, avatarUrl]
    );
    res.json({ avatarUrl: result.rows[0].avatar_url });
  } catch (err) {
    next(err);
  }
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

router.patch('/:id/role', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  const role = String(req.body?.role ?? '').trim();
  if (!['user', 'admin', 'super_admin'].includes(role)) {
    return res.status(400).json(validationError({ role: 'Role must be user, admin, or super_admin' }));
  }
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot change your own role' });
  }

  try {
    const result = await db.query(
      `UPDATE users SET role = $2::user_role WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status`,
      [req.params.id, role]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_role_changed', $2::jsonb)`,
      [req.user.id, JSON.stringify({ target_id: req.params.id, new_role: role })]
    );
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  try {
    const check = await db.query(`SELECT id, email FROM users WHERE id = $1`, [req.params.id]);
    if (!check.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_deleted', $2::jsonb)`,
      [req.user.id, JSON.stringify({ deleted_email: check.rows[0].email })]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
