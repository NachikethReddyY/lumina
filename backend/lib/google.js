const { OAuth2Client } = require('google-auth-library');

let client;

// Google token verification for GoogleAuthButton. The backend accepts either an
// ID token or access token, verifies it with Google, then /auth/google links the
// provider identity to the local users table.
function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }
  if (!client) {
    client = new OAuth2Client(clientId);
  }
  return client;
}

async function verifyGoogleIdToken(idToken) {
  const c = getClient();
  if (!c) {
    throw Object.assign(new Error('Google sign-in is not configured'), { status: 503 });
  }
  const ticket = await c.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function verifyGoogleAccessToken(accessToken) {
  const c = getClient();
  if (!c) {
    throw Object.assign(new Error('Google sign-in is not configured'), { status: 503 });
  }
  // This verifies the token and returns info including email/sub
  const info = await c.getTokenInfo(accessToken);
  if (info.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw Object.assign(new Error('Invalid token audience'), { status: 401 });
  }
  return info;
}

module.exports = { 
  verifyGoogleIdToken, 
  verifyGoogleAccessToken,
  isGoogleConfigured: () => Boolean(process.env.GOOGLE_CLIENT_ID) 
};
