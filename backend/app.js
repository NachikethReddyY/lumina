const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiVersionHeader } = require('./middleware/apiVersion');

/**
 * Builds the Express application shared by local server startup and tests.
 *
 * Frontend connection:
 * - src/utils/apiClient.ts prefixes every request with /api/v1 by default.
 * - Vite can proxy to this app locally, while deployed clients use FRONTEND_URL
 *   for CORS allow-listing.
 * - /uploads is intentionally public because avatar_url values returned from
 *   /users/me and ticket/user APIs point the React UI at files in this folder.
 */
function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const origins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : true;

  const requestContext = require('./lib/requestContext');

  // Set baseline browser security headers and bind the current request to
  // AsyncLocalStorage so backend/db/index.js can log which frontend API call
  // triggered each SQL query during development.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    const context = {
      method: req.method,
      url: req.originalUrl || req.url,
    };
    requestContext.run(context, () => {
      next();
    });
  });

  app.use(
    cors({
      origin: origins,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Human-friendly root probes for developers; the actual React app uses /api/v1.
  app.get('/', (req, res) => {
    res.json({
      message: 'Backend is running',
      api: { current: '/api/v1', health: '/api/v1/health' },
    });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Use versioned routes', versions: ['1'], basePath: '/api/v1' });
  });

  // All product endpoints live under /api/v1 so the frontend can evolve API
  // versions explicitly through VITE_API_PREFIX.
  app.use('/api/v1', apiVersionHeader, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
