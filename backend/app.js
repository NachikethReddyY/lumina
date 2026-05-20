const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiVersionHeader } = require('./middleware/apiVersion');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const profile = String(process.env.LUMINA_PROFILE || '').toLowerCase();
  const allowLocalhostOrigins =
    profile === 'development' || profile === 'local';

  const corsOrigin = allowLocalhostOrigins
    ? (origin, callback) => {
        if (!origin) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, origin);
        }
        if (configuredOrigins.includes(origin)) {
          return callback(null, origin);
        }
        return callback(new Error(`CORS blocked origin: ${origin}`));
      }
    : configuredOrigins.length > 0
      ? configuredOrigins
      : true;

  const requestContext = require('./lib/requestContext');

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
      origin: corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/', (req, res) => {
    res.json({
      message: 'Backend is running',
      api: { current: '/api/v1', health: '/api/v1/health' },
    });
  });

  app.get('/api', (_req, res) => {
    res.json({ message: 'Use versioned routes', versions: ['1'], basePath: '/api/v1' });
  });

  app.use('/api/v1', apiVersionHeader, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
