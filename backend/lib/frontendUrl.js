/** First origin in FRONTEND_URL (comma-separated) or Vite default. */
// Returns the browser app origin used in emails and redirects. Backend routes
// call this whenever a user needs to leave an API flow and continue in React.
function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const first = raw.split(',')[0].trim();
  return first.replace(/\/$/, '');
}

module.exports = { getFrontendBaseUrl };
