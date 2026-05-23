const db = require('../db');
const { verifyAccessToken } = require('../lib/jwt');

const USER_SELECT = `id, email, first_name, last_name, role, status, email_is_verified, avatar_url,
              approved_by, approved_at, created_at, last_login_at, job_title, department, onboarding_completed, name_set`;

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAccessToken(match[1]);
    const result = await db.query(
      `SELECT ${USER_SELECT}
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    const status = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    next(Object.assign(error, { status }));
  }
}

async function requireAuthAny(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyAccessToken(match[1]);
    const result = await db.query(
      `SELECT ${USER_SELECT}
       FROM users
       WHERE id = $1`,
      [payload.sub]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    const status = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ? 401 : 500;
    next(Object.assign(error, { status }));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

/**
 * Require that the user has completed all onboarding steps.
 * Must be used AFTER requireAuth or requireAuthAny so req.user is populated.
 * Super admin is exempt from name_set and onboarding_completed checks.
 */
function requireOnboarding(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user;

  if (!user.name_set) {
    return res.status(403).json({
      error: 'Please complete your profile before continuing.',
      code: 'NAME_NOT_SET',
      redirectTo: '/complete-profile',
    });
  }

  if (!user.email_is_verified) {
    return res.status(403).json({
      error: 'Please verify your email before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
      redirectTo: '/verify-email-otp',
    });
  }

  if (!user.onboarding_completed) {
    return res.status(403).json({
      error: 'Please complete onboarding before continuing.',
      code: 'ONBOARDING_NOT_COMPLETED',
      redirectTo: '/onboarding',
    });
  }

  if (user.status !== 'active') {
    return res.status(403).json({
      error: 'Your account is pending approval.',
      code: 'ACCOUNT_NOT_ACTIVE',
      redirectTo: '/pending-approval',
    });
  }

  next();
}

module.exports = { requireAuth, requireAuthAny, requireRole, requireOnboarding };
