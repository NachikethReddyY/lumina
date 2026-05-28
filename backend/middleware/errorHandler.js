// Final Express fallbacks. apiClient surfaces these JSON bodies to the React
// pages, so errors stay machine-readable instead of returning an HTML error
// document that the frontend cannot parse.
function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not Found' });
}

// Hide unexpected server details in production while preserving validation and
// permission messages that frontend forms can display directly.
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || err.statusCode || 500;
  const exposeMessage = process.env.NODE_ENV !== 'production' || status < 500;
  const message = exposeMessage ? err.message || 'Internal Server Error' : 'Internal Server Error';
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
