const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  return secret || 'lumina-dev-only-change-me';
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    getSecret(),
    { expiresIn: '7d' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signAccessToken, verifyAccessToken };
