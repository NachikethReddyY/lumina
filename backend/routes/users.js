const path = require('path');
const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireAuthAny, requireOnboarding, requireRole } = require('../middleware/auth');
const { validationError } = require('../lib/authValidation');
const { isPlaceholderName, serializeUser } = require('../lib/userProfile');
const { canAccessUserDirectory, isHrAdmin, isTeamManager } = require('../lib/teamScope');
const { sendMail } = require('../lib/mailer');
const { getFrontendBaseUrl } = require('../lib/frontendUrl');
const { userDeletedEmailHtml, userApprovedEmailHtml, userRejectedEmailHtml, onboardingSubmittedNotificationEmailHtml } = require('../lib/emailTemplates');

const router = express.Router();

// Avatar uploads are written to backend/uploads/avatars and served publicly from
// app.js at /uploads. The frontend stores only the returned URL on ApiUser and
// uses it in profile cards, ticket assignee chips, and comments.
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

// Email HR when a user finishes onboarding so the AdminApprovals page has a
// human workflow behind it, not just a silent status change.
async function notifyHrAdminsOfOnboardingSubmission(userName, userEmail, jobTitle, department) {
  console.log(`[ONBOARDING] notifyHrAdminsOfOnboardingSubmission called for: ${userEmail}`);
  try {
    console.log(`[ONBOARDING] Querying for active HR admins...`);
    const result = await db.query(
      `SELECT id, email, department FROM users WHERE role = 'admin' AND status = 'active' AND department IN ('HR', 'hr')`
    );
    const hrAdmins = result.rows;
    console.log(`[ONBOARDING] Found ${hrAdmins.length} active HR admins to notify about onboarding submission: ${userEmail}`);

    if (!hrAdmins.length) {
      console.log(`[ONBOARDING] No active HR admins found. Onboarding notification skipped.`);
      return;
    }

    const base = getFrontendBaseUrl();
    const html = onboardingSubmittedNotificationEmailHtml({ userName, userEmail, jobTitle, department, appUrl: base });

    for (const hr of hrAdmins) {
      console.log(`[ONBOARDING] Sending notification to: ${hr.email}`);
      await sendMail({
        to: hr.email,
        subject: `User onboarding submitted: ${userName} (${userEmail})`,
        html,
      }).then(() => {
        console.log(`[ONBOARDING] Notification sent successfully to: ${hr.email}`);
      }).catch((err) => {
        console.error(`[ONBOARDING] Failed to send notification to ${hr.email}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[ONBOARDING] Failed to notify HR admins of onboarding submission:', err.message);
  }
}

// Current-user endpoint for UserContext. It is intentionally available through
// requireAuthAny so setup pages can load pending/incomplete accounts.
router.get('/me', requireAuthAny, async (req, res, next) => {
  try {
    const google = await db.query(
      `SELECT 1 FROM oauth_accounts
       WHERE user_id = $1 AND provider = 'google'::oauth_provider
       LIMIT 1`,
      [req.user.id]
    );
    res.json(serializeUser(req.user, { is_google_account: Boolean(google.rows[0]) }));
  } catch (err) {
    next(err);
  }
});

// OnboardingPage saves job title/department here. The backend derives role from
// department so the frontend cannot promote itself by sending a role field.
router.patch('/me/onboarding', requireAuthAny, async (req, res, next) => {
  const jobTitle = String(req.body?.jobTitle ?? '').trim();
  const department = String(req.body?.department ?? '').trim();

  const details = {};
  if (!jobTitle) details.jobTitle = 'Job title is required';
  if (Object.keys(details).length) {
    return res.status(400).json(validationError(details));
  }

  try {
    const setClauses = [`job_title = $2`, `onboarding_completed = TRUE`];
    const params = [req.user.id, jobTitle];
    let paramIdx = 3;

    if (department) {
      setClauses.push(`department = $${paramIdx}`);
      params.push(department);
      paramIdx++;
    }

    // Derive role from department server-side; never trust client-provided role.
    const adminDepartments = ['HR', 'Managers'];
    const userDepartments = ['Developers', 'QA'];
    const derivedRole = adminDepartments.includes(department)
      ? 'admin'
      : userDepartments.includes(department)
        ? 'user'
        : null;

    if (derivedRole) {
      setClauses.push(`role = $${paramIdx}::user_role`);
      params.push(derivedRole);
      paramIdx++;
    }

    const result = await db.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, avatar_url,
                 approved_by, approved_at, created_at, last_login_at, job_title, department, onboarding_completed, name_set`,
      params
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[ONBOARDING] User ${user.email} completed onboarding. Notifying HR admins...`);
    const userName = `${user.first_name} ${user.last_name}`;
    await notifyHrAdminsOfOnboardingSubmission(userName, user.email, jobTitle, department);

    res.json({ user: serializeUser(user), message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

// AccountSettingsPage password form. Google-only users have no password_hash and
// receive a clear 400 so the UI can show the OAuth-specific path.
router.patch('/me/password', requireAuth, requireOnboarding, async (req, res, next) => {
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

// Profile/avatar upload path used by UserProfileCard and setup/profile screens.
router.post('/me/avatar', requireAuthAny, avatarUpload.single('avatar'), async (req, res, next) => {
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

// AccountSettingsPage notification toggle. This persists the user's email
// preference for backend mail notifications.
router.patch('/me/notifications', requireAuth, requireOnboarding, async (req, res, next) => {
  const emailNotifications = req.body?.email_notifications;
  if (typeof emailNotifications !== 'boolean') {
    return res.status(400).json(validationError({ email_notifications: 'Must be a boolean' }));
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET email_notifications = $2
       WHERE id = $1
       RETURNING id, email_notifications`,
      [req.user.id, emailNotifications]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ email_notifications: user.email_notifications, message: 'Notification preferences updated' });
  } catch (err) {
    next(err);
  }
});

// OAuthNamePage / complete-profile flow: replace placeholder Google/New User
// names before the account can pass requireOnboarding.
router.patch('/me', requireAuthAny, async (req, res, next) => {
  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName  = String(req.body?.lastName  ?? '').trim();

  if (!firstName || !lastName) {
    return res.status(400).json(validationError({
      firstName: firstName ? undefined : 'First name is required',
      lastName:  lastName  ? undefined : 'Last name is required',
    }));
  }

  if (isPlaceholderName(firstName, lastName)) {
    return res.status(400).json({
      error: 'Please enter your real name (not the default placeholder).',
    });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET first_name = $2, last_name = $3, name_set = TRUE
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, avatar_url,
                 approved_by, approved_at, created_at, last_login_at, job_title, department, onboarding_completed, name_set`,
      [req.user.id, firstName, lastName]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const google = await db.query(
      `SELECT 1 FROM oauth_accounts
       WHERE user_id = $1 AND provider = 'google'::oauth_provider
       LIMIT 1`,
      [req.user.id]
    );
    res.json({
      user: serializeUser(user, { is_google_account: Boolean(google.rows[0]) }),
      message: 'Name updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

// AdminUsersPage, AdminApprovalsPage, and sidebar admin counts use this list.
// HR/managers can filter by role/status using usersApi.list(params).
router.get('/', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  if (!canAccessUserDirectory(req.user)) {
    return res.status(403).json({ error: 'Only HR and managers can view the user directory.' });
  }

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
              avatar_url, approved_by, approved_at, created_at, last_login_at,
              job_title, department, onboarding_completed, name_set
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

// AdminApprovalsPage approval/suspension action. Approval stamps approved_by and
// approved_at so user cards can display the account lifecycle accurately.
router.patch('/:id/approval', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  const status = String(req.body?.status ?? '').trim();
  if (!['active', 'pending', 'suspended'].includes(status)) {
    return res.status(400).json(validationError({ status: 'Status must be active, pending, or suspended' }));
  }

  const canManageAnyStatus = isHrAdmin(req.user);
  const canSuspendOnly = isTeamManager(req.user) && status === 'suspended';
  if (!canManageAnyStatus && !canSuspendOnly) {
    return res.status(403).json({ error: 'Only HR can approve accounts. Managers can suspend active accounts.' });
  }
  if (status === 'suspended' && req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot suspend your own account' });
  }

  try {
    const target = await db.query(`SELECT id, role, status FROM users WHERE id = $1`, [req.params.id]);
    if (!target.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
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

    const user = result.rows[0];
    const appUrl = getFrontendBaseUrl();

    if (status === 'active' && user.email) {
      const emailHtml = userApprovedEmailHtml({ firstName: user.first_name, appUrl });
      await sendMail({
        to: user.email,
        subject: 'Your account has been approved',
        html: emailHtml,
      }).catch((err) => console.error('Failed to send approval email:', err));
    } else if (status === 'suspended' && user.email) {
      const adminEmail = req.user.email || 'admin@company.com';
      const emailHtml = userRejectedEmailHtml({ firstName: user.first_name, adminEmail });
      await sendMail({
        to: user.email,
        subject: 'Your account has been rejected',
        html: emailHtml,
      }).catch((err) => console.error('Failed to send rejection email:', err));
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// HR-only role editor. Department-driven role derivation handles most users, but
// this endpoint remains for explicit HR corrections from the admin UI.
router.patch('/:id/role', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  if (!isHrAdmin(req.user)) {
    return res.status(403).json({ error: 'Only HR can change user roles.' });
  }

  const role = String(req.body?.role ?? '').trim();
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json(validationError({ role: 'Role must be user or admin' }));
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

// Account deletion for self-service account settings and HR user management.
// Related rows cascade through the schema except category ownership, which is
// transferred first so historical tickets keep valid category creators.
router.delete('/:id', requireAuth, requireOnboarding, async (req, res, next) => {
  const targetId = req.params.id;
  const isOwnAccount = targetId === req.user.id;
  const canDeleteOtherUsers = isHrAdmin(req.user);

  // Allow self-deletion for any authenticated user
  // OR allow HR admins to delete other users. Managers can suspend instead.
  if (!isOwnAccount && !canDeleteOtherUsers) {
    return res.status(403).json({ error: 'Managers cannot delete users. Suspend the account instead.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query(`SELECT id, email, role, first_name FROM users WHERE id = $1`, [targetId]);
    if (!check.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, first_name } = check.rows[0];

    // Reassign categories owned by the target user before delete (FK is RESTRICT).
    // Prefer the current actor when deleting someone else; otherwise pick any active HR admin.
    let categoriesOwnerId = isOwnAccount ? null : req.user.id;
    if (!categoriesOwnerId) {
      const fallbackOwner = await client.query(
        `SELECT id
         FROM users
         WHERE id <> $1 AND role = 'admin' AND status = 'active' AND department = 'HR'
         ORDER BY created_at ASC
         LIMIT 1`,
        [targetId]
      );
      categoriesOwnerId = fallbackOwner.rows[0]?.id || null;
    }

    const ownedCategories = await client.query(
      `SELECT COUNT(*)::int AS count FROM categories WHERE created_by = $1`,
      [targetId]
    );
    if ((ownedCategories.rows[0]?.count || 0) > 0 && !categoriesOwnerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot delete this account because it owns categories and no alternate HR admin is available to transfer ownership.',
      });
    }
    if (categoriesOwnerId) {
      await client.query(
        `UPDATE categories
         SET created_by = $2
         WHERE created_by = $1`,
        [targetId, categoriesOwnerId]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_deleted', $2::jsonb)`,
      [req.user.id, JSON.stringify({ deleted_email: email, target_id: targetId })]
    );

    try {
      const adminEmail = req.user.email;
      const html = userDeletedEmailHtml({ firstName: first_name, adminEmail });
      await sendMail({
        to: email,
        subject: 'Your Lumina account has been terminated',
        text: `Your account has been deleted and is no longer active.`,
        html,
      });
    } catch (emailErr) {
      console.error('[DELETE USER] Email send failed:', emailErr.message);
      // Continue with deletion even if email fails
    }

    await client.query(`DELETE FROM users WHERE id = $1`, [targetId]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// HR profile editor for job title/department maintenance. Department changes
// also re-derive the coarse user/admin role used by ProtectedRoute.
router.patch('/:id/profile', requireAuth, requireOnboarding, requireRole('admin'), (req, res, next) => {
  if (!isHrAdmin(req.user)) {
    return res.status(403).json({ error: 'Only HR can update user profiles.' });
  }
  next();
}, async (req, res, next) => {
  const jobTitle = req.body?.jobTitle !== undefined ? String(req.body.jobTitle).trim() : undefined;
  const department = req.body?.department !== undefined ? String(req.body.department).trim() : undefined;

  if (!jobTitle && !department) {
    return res.status(400).json({ error: 'Provide at least one of jobTitle or department' });
  }

  try {
    const current = await db.query(
      `SELECT job_title, department FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!current.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const setClauses = [];
    const params = [req.params.id];
    let paramIdx = 2;

    if (jobTitle !== undefined) {
      setClauses.push(`job_title = $${paramIdx}`);
      params.push(jobTitle);
      paramIdx++;
    }
    if (department !== undefined) {
      setClauses.push(`department = $${paramIdx}`);
      params.push(department);
      paramIdx++;
    }

    // Re-derive role from department
    const finalDept = department !== undefined ? department : current.rows[0].department;
    const adminDepartments = ['HR', 'Managers'];
    const userDepartments = ['Developers', 'QA'];
    const derivedRole = adminDepartments.includes(finalDept)
      ? 'admin'
      : userDepartments.includes(finalDept)
        ? 'user'
        : null;

    if (derivedRole) {
      setClauses.push(`role = $${paramIdx}::user_role`);
      params.push(derivedRole);
      paramIdx++;
    }

    const result = await db.query(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, avatar_url,
                 approved_by, approved_at, created_at, last_login_at, job_title, department, onboarding_completed, name_set`,
      params
    );

    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_profile_updated', $2::jsonb)`,
      [
        req.user.id,
        JSON.stringify({
          target_id: req.params.id,
          changes: { jobTitle, department },
        }),
      ]
    );

    res.json({ user: serializeUser(result.rows[0]), message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
