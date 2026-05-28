const crypto = require('crypto');
const express = require('express');
const db = require('../db');
const { signAccessToken } = require('../lib/jwt');
const { verifyGoogleIdToken, verifyGoogleAccessToken } = require('../lib/google');
const {
  validationError,
  validateSignupBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
} = require('../lib/authValidation');
const { isMailConfigured, sendMail } = require('../lib/mailer');
const { getFrontendBaseUrl } = require('../lib/frontendUrl');
const { verificationEmailHtml, passwordResetEmailHtml, newSignupNotificationEmailHtml } = require('../lib/emailTemplates');
const { rateLimit } = require('../middleware/rateLimit');
const { serializeUser } = require('../lib/userProfile');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: (req) => req.ip });
const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, key: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}` });

router.use(authLimiter);

const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

async function createVerificationChallenge(userId) {
  // Invalidate all prior unused challenges for this user so old OTPs can't interfere
  await db.query(
    `UPDATE email_verifications SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  const vToken = crypto.randomBytes(32).toString('hex');
  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
  await db.query(
    `INSERT INTO email_verifications (user_id, token, otp_hash, otp_expires_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, vToken, hashOtp(otp), otpExpiresAt, expiresAt]
  );
  return { token: vToken, otp };
}

async function sendVerificationEmail(toEmail, token, otp) {
  const base = getFrontendBaseUrl();
  const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: toEmail,
    subject: 'Activate your Lumina account',
    text:
      `Welcome to Lumina.\n\n` +
      `Option 1: Open this link to activate your account (expires in 48 hours):\n${url}\n\n` +
      `Option 2: Enter this one-time code in the app (expires in 10 minutes):\n${otp}\n\n` +
      `If you did not sign up, you can ignore this email.`,
    html: verificationEmailHtml({ url, otp }),
  });
}

async function sendPasswordResetEmail(toEmail, token) {
  const base = getFrontendBaseUrl();
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: toEmail,
    subject: 'Reset your Lumina password',
    text: `We received a request to reset your Lumina password.\n\nOpen this link (expires in 1 hour):\n${url}\n\nIf you did not request this, ignore this email.`,
    html: passwordResetEmailHtml({ url }),
  });
}

async function notifyHrAdminsOfNewSignup(newUserEmail) {
  console.log(`[SIGNUP] notifyHrAdminsOfNewSignup called for: ${newUserEmail}`);
  try {
    console.log(`[SIGNUP] Querying for active admins...`);
    const result = await db.query(
      `SELECT id, email, department FROM users WHERE role = 'admin' AND status = 'active'`
    );
    const allAdmins = result.rows;
    console.log(`[SIGNUP] Query result - found ${allAdmins.length} active admins`);
    console.log(`[SIGNUP] All active admins in system:`, allAdmins.map(a => ({ email: a.email, department: a.department })));

    const hrAdmins = allAdmins.filter(a => a.department === 'HR' || a.department === 'hr');
    console.log(`[SIGNUP] Found ${hrAdmins.length} active HR admins to notify about new signup: ${newUserEmail}`);

    if (!hrAdmins.length) {
      console.log(`[SIGNUP] No active HR admins found. HR notification skipped.`);
      return;
    }

    const base = getFrontendBaseUrl();
    const html = newSignupNotificationEmailHtml({ userEmail: newUserEmail, appUrl: base });

    for (const hr of hrAdmins) {
      console.log(`[SIGNUP] Sending HR notification to: ${hr.email}`);
      await sendMail({
        to: hr.email,
        subject: `New user signup: ${newUserEmail} — Awaiting approval`,
        html,
      }).then(() => {
        console.log(`[SIGNUP] HR notification sent successfully to: ${hr.email}`);
      }).catch((err) => {
        console.error(`[SIGNUP] Failed to send HR notification to ${hr.email}:`, err.message);
      });
    }
  } catch (err) {
    console.error('[SIGNUP] Failed to notify HR admins of new signup:', err.message);
  }
}

router.post('/login', async (req, res, next) => {
  const parsed = validateLoginBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email, password } = parsed;

  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at
       FROM users
       WHERE lower(email) = lower($1)
         AND password_hash IS NOT NULL
         AND crypt($2, password_hash) = password_hash`,
      [email, password]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'pending' && !user.email_is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        verificationEmail: user.email,
      });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact a super admin.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const loginResult = await db.query(
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at, last_login_at`,
      [user.id]
    );
    const loggedInUser = loginResult.rows[0] || user;
    await db.query(
      `INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ipaddress)
       VALUES ($1, gen_random_uuid()::text, NOW() + INTERVAL '7 days', $2, $3)`,
      [user.id, req.get('user-agent') || 'unknown', req.ip || 'unknown']
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_logged_in', $2::jsonb)`,
      [
        user.id,
        JSON.stringify({
          method: 'password',
          user_agent: req.get('user-agent') || 'unknown',
          ipaddress: req.ip || 'unknown',
        }),
      ]
    );

    const accessToken = signAccessToken(loggedInUser);
    return res.status(200).json({
      accessToken,
      refreshToken: '',
      user: serializeUser(loggedInUser),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/signup', async (req, res, next) => {
  const parsed = validateSignupBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email, password } = parsed;

  // Clean up expired pending users (older than verification TTL)
  const verificationTTL = VERIFY_TTL_MS;
  try {
    const cleanupResult = await db.query(
      `DELETE FROM users 
       WHERE email = $1 AND status = 'pending' 
       AND created_at < NOW() - INTERVAL '1 millisecond' * $2
       RETURNING id`,
      [email.toLowerCase(), verificationTTL]
    );
    if (cleanupResult.rowCount > 0) {
      console.log(`Cleaned up expired pending user: ${email}`);
    }
  } catch (cleanupErr) {
    console.error('Failed to cleanup expired user:', cleanupErr.message);
  }

  const mailConfigured = isMailConfigured();
  if (!mailConfigured) {
    return res.status(503).json({
      error: 'Email verification is required, but SMTP is not configured on the server.',
      code: 'MAIL_NOT_CONFIGURED',
    });
  }

  try {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified, name_set)
       VALUES ($1, crypt($2, gen_salt('bf')), 'User', 'New', 'user'::user_role, $3::user_status, $4, FALSE)
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at`,
      [email, password, 'pending', false]
    );
    const user = result.rows[0];
    const { token: vToken, otp } = await createVerificationChallenge(user.id);

    try {
      await sendVerificationEmail(user.email, vToken, otp);
    } catch (mailErr) {
      console.error('Verification email failed:', mailErr.message);
      return res.status(503).json({
        error:
          'Account was created but the verification email could not be sent. Check SMTP settings and try again.',
        code: 'MAIL_FAILED',
      });
    }

    console.log(`[SIGNUP] User created: ${user.email}. Notifying HR admins...`);
    await notifyHrAdminsOfNewSignup(user.email);

    return res.status(201).json({
      user: serializeUser(user),
      requiresEmailVerification: true,
      message: 'Check your email to activate your account before signing in.',
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(err);
  }
});

router.post('/verify-email', async (req, res, next) => {
  const token = String(req.body?.token ?? '').trim();
  if (!token) {
    return res.status(400).json(validationError({ token: 'Verification token is required' }));
  }

  try {
    const r = await db.query(
      `SELECT ev.id, ev.user_id
       FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = $1 AND ev.used_at IS NULL AND ev.expires_at > NOW()`,
      [token]
    );
    const row = r.rows[0];
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired activation link' });
    }

    await db.query(
      `UPDATE users
       SET email_is_verified = TRUE
       WHERE id = $1`,
      [row.user_id]
    );
    await db.query(`UPDATE email_verifications SET used_at = NOW() WHERE id = $1`, [row.id]);

    const u = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at
       FROM users WHERE id = $1`,
      [row.user_id]
    );
    const user = u.rows[0];
    const accessToken = signAccessToken(user);

    return res.json({
      message: 'Email verified. Next, enter your name to continue.',
      user: serializeUser(user),
      accessToken,
      refreshToken: '',
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/verify-email-otp', otpLimiter, async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim();
  const otp = String(req.body?.otp ?? '').trim();

  const details = {};
  if (!email) details.email = 'Email is required';
  if (!otp) details.otp = 'Code is required';
  if (Object.keys(details).length) {
    return res.status(400).json(validationError(details));
  }

  try {
    const r = await db.query(
      `SELECT ev.id, ev.user_id
       FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE lower(u.email) = lower($1)
         AND ev.used_at IS NULL
         AND ev.otp_expires_at IS NOT NULL
         AND ev.otp_expires_at > NOW()
         AND ev.otp_hash = $2`,
      [email, hashOtp(otp)]
    );
    const row = r.rows[0];
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    await db.query(
      `UPDATE users
       SET email_is_verified = TRUE
       WHERE id = $1`,
      [row.user_id]
    );
    await db.query(`UPDATE email_verifications SET used_at = NOW() WHERE id = $1`, [row.id]);

    const u = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at
       FROM users WHERE id = $1`,
      [row.user_id]
    );
    const user = u.rows[0];
    const accessToken = signAccessToken(user);

    return res.json({
      message: 'Email verified. Next, enter your name to continue.',
      user: serializeUser(user),
      accessToken,
      refreshToken: '',
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/resend-verification', otpLimiter, async (req, res, next) => {
  const parsed = validateForgotPasswordBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email } = parsed;

  const generic = {
    message: 'If this account is waiting for activation, we sent a new verification email.',
  };

  try {
    if (!isMailConfigured()) {
      return res.status(503).json({
        error: 'Email is not configured on the server. Ask an admin to set SMTP variables.',
        code: 'MAIL_NOT_CONFIGURED',
      });
    }

    const u = await db.query(
      `SELECT id, email FROM users
       WHERE lower(email) = lower($1) AND status = 'pending'::user_status AND password_hash IS NOT NULL`,
      [email]
    );
    const user = u.rows[0];
    if (!user) {
      return res.json(generic);
    }

    await db.query(
      `UPDATE email_verifications SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    const { token: vToken, otp } = await createVerificationChallenge(user.id);

    try {
      await sendVerificationEmail(user.email, vToken, otp);
    } catch (mailErr) {
      console.error('Resend verification failed:', mailErr.message);
      return res.status(503).json({ error: 'Could not send email.', code: 'MAIL_FAILED' });
    }

    return res.json(generic);
  } catch (err) {
    return next(err);
  }
});

router.post('/google', async (req, res, next) => {
  const { credential, accessToken } = req.body;
  if (!credential && !accessToken) {
    return res.status(400).json({ error: 'Missing Google credential or access token' });
  }

  let payload;
  try {
    if (credential) {
      payload = await verifyGoogleIdToken(credential);
    } else {
      payload = await verifyGoogleAccessToken(accessToken);
    }
  } catch (err) {
    const status = err.status || 401;
    return res.status(status).json({ error: err.message || 'Invalid Google token' });
  }

  const sub = payload.sub;
  const email = payload.email;
  if (!sub || !email) {
    return res.status(400).json({ error: 'Google account has no usable identity' });
  }

  try {
    let userRow;
    const existingOAuth = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status, u.email_is_verified, u.name_set, u.created_at
       FROM oauth_accounts o
       JOIN users u ON u.id = o.user_id
       WHERE o.provider = 'google'::oauth_provider AND o.provider_user_id = $1`,
      [sub]
    );

    if (existingOAuth.rows[0]) {
      userRow = existingOAuth.rows[0];
    } else {
      const byEmail = await db.query(
        `SELECT id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at
         FROM users WHERE lower(email) = lower($1)`,
        [email]
      );

      if (byEmail.rows[0]) {
        userRow = byEmail.rows[0];
        await db.query(
          `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
           VALUES ($1, 'google'::oauth_provider, $2)
          ON CONFLICT (provider_user_id) DO NOTHING`,
          [userRow.id, sub]
        );
      } else {
        const first = payload.given_name || (payload.name ? payload.name.split(' ')[0] : 'New');
        const last  = payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : 'User');
        if (!isMailConfigured()) {
          return res.status(503).json({
            error: 'Email verification is required, but SMTP is not configured on the server.',
            code: 'MAIL_NOT_CONFIGURED',
          });
        }
        const ins = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified, name_set)
           VALUES (lower($1), NULL, $2, $3, 'user'::user_role, 'pending'::user_status, FALSE, FALSE)
           RETURNING id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at`,
          [email, first, last]
        );
        userRow = ins.rows[0];
        await db.query(
          `INSERT INTO oauth_accounts (user_id, provider, provider_user_id)
           VALUES ($1, 'google'::oauth_provider, $2)`,
          [userRow.id, sub]
        );
      }
    }

    if (userRow.status === 'suspended') {
      return res.status(403).json({
        error: 'This account has been suspended. Contact a super admin.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    if (!userRow.email_is_verified) {
      if (!isMailConfigured()) {
        return res.status(503).json({
          error: 'Email verification is required, but SMTP is not configured on the server.',
          code: 'MAIL_NOT_CONFIGURED',
        });
      }
      try {
        const { token: vToken, otp } = await createVerificationChallenge(userRow.id);
        await sendVerificationEmail(userRow.email, vToken, otp);
      } catch (mailErr) {
        console.error('OAuth verification email failed:', mailErr.message);
        return res.status(503).json({
          error: 'Could not send verification email. Try again shortly.',
          code: 'MAIL_FAILED',
        });
      }
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        verificationEmail: userRow.email,
      });
    }

    const loginResult = await db.query(
      `UPDATE users
       SET last_login_at = NOW()
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, status, email_is_verified, name_set, created_at, last_login_at`,
      [userRow.id]
    );
    const loggedInUser = loginResult.rows[0] || userRow;
    await db.query(
      `INSERT INTO sessions (user_id, session_token, expires_at, user_agent, ipaddress)
       VALUES ($1, gen_random_uuid()::text, NOW() + INTERVAL '7 days', $2, $3)`,
      [userRow.id, req.get('user-agent') || 'unknown', req.ip || 'unknown']
    );
    await db.query(
      `INSERT INTO audit_logs (actor_id, action, metadata)
       VALUES ($1, 'user_logged_in', $2::jsonb)`,
      [
        userRow.id,
        JSON.stringify({
          method: 'google',
          user_agent: req.get('user-agent') || 'unknown',
          ipaddress: req.ip || 'unknown',
        }),
      ]
    );

    const accessToken = signAccessToken(loggedInUser);
    return res.json({
      accessToken,
      refreshToken: '',
      user: serializeUser(loggedInUser, { is_google_account: true }),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/forgot-password', otpLimiter, async (req, res, next) => {
  const parsed = validateForgotPasswordBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { email } = parsed;

  const generic = {
    message:
      'If an account exists for this email, you will receive password reset instructions shortly.',
  };

  try {
    const u = await db.query(
      `SELECT id, email FROM users WHERE lower(email) = lower($1) AND password_hash IS NOT NULL`,
      [email]
    );
    const user = u.rows[0];
    if (!user) {
      return res.json({ ...generic, emailSent: false });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.query(
      `INSERT INTO password_reset (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    let emailSent = false;
    let devResetLink;

    console.log(`[FORGOT-PASSWORD] SMTP configured: ${isMailConfigured()}`);
    console.log(`[FORGOT-PASSWORD] Attempting to send password reset email to ${user.email}`);

    if (isMailConfigured()) {
      try {
        await sendPasswordResetEmail(user.email, token);
        emailSent = true;
        console.log(`[FORGOT-PASSWORD] Password reset email successfully sent to ${user.email}`);
      } catch (mailErr) {
        console.error('[FORGOT-PASSWORD] Password reset email failed:', {
          message: mailErr.message,
          code: mailErr.code,
          stack: mailErr.stack,
        });
        // Don't silently fail - return error to client so they know something went wrong
        return res.status(503).json({
          error: 'Could not send password reset email. Please try again later or contact support.',
          code: 'MAIL_FAILED'
        });
      }
    } else {
      console.log('[FORGOT-PASSWORD] SMTP not configured, generating dev reset link');
      if (process.env.NODE_ENV !== 'production') {
        const base = getFrontendBaseUrl();
        devResetLink = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      }
    }

    return res.json({
      ...generic,
      emailSent,
      ...(devResetLink ? { devResetLink } : {}),
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  const parsed = validateResetPasswordBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }
  const { token, password } = parsed;

  try {
    const r = await db.query(
      `SELECT pr.id, pr.user_id
       FROM password_reset pr
       WHERE pr.token = $1 AND pr.used_at IS NULL AND pr.expires_at > NOW()`,
      [token]
    );
    const row = r.rows[0];
    if (!row) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    await db.query(`UPDATE users SET password_hash = crypt($1, gen_salt('bf')) WHERE id = $2`, [
      password,
      row.user_id,
    ]);
    await db.query(`UPDATE password_reset SET used_at = NOW() WHERE id = $1`, [row.id]);
    return res.json({ message: 'Password updated. You can sign in now.' });
  } catch (err) {
    return next(err);
  }
});

router.post('/refresh', (req, res) => {
  res.status(501).json({ error: 'Refresh token flow is not implemented yet' });
});

module.exports = router;
