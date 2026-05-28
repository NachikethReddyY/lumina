const { Pool } = require('pg');
require('../lib/loadRootEnv').loadRootEnv();

// Shared PostgreSQL access layer for all route modules. Keeping query execution
// here gives the backend one place to configure SSL, sanitize logs, and attach
// request metadata so API calls from React can be traced to their SQL work.
const connectionString = process.env.DATABASE_URL || '';
const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');
const useSSL =
  process.env.DATABASE_SSL === 'true' || (!isLocal && Boolean(connectionString));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
});

const requestContext = require('../lib/requestContext');

const enableLogging = process.env.NODE_ENV !== 'production';

// Produce short, stable labels such as "SELECT on users" instead of logging
// entire SQL strings. That keeps local terminal output readable while debugging
// frontend screens that make several API calls at once.
function summarizeQuery(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  const upperText = cleanText.toUpperCase();

  if (upperText.startsWith('BEGIN')) return 'BEGIN Transaction';
  if (upperText.startsWith('COMMIT')) return 'COMMIT Transaction';
  if (upperText.startsWith('ROLLBACK')) return 'ROLLBACK Transaction';

  const words = cleanText.split(' ');
  const action = words[0].toUpperCase();
  
  let tableName = '';
  if (action === 'SELECT' || action === 'DELETE') {
    const match = cleanText.match(/FROM\s+([a-zA-Z0-9_\"'\.]+)/i);
    if (match) tableName = match[1];
  } else if (action === 'INSERT') {
    const match = cleanText.match(/INTO\s+([a-zA-Z0-9_\"'\.]+)/i);
    if (match) tableName = match[1];
  } else if (action === 'UPDATE') {
    const match = cleanText.match(/UPDATE\s+([a-zA-Z0-9_\"'\.]+)/i);
    if (match) tableName = match[1];
  }
  
  if (tableName) {
    tableName = tableName.replace(/[\"\']/g, '').toLowerCase();
    return `${action} on "${tableName}"`;
  }
  
  return action || 'Query';
}

// Redact credentials and long tokens before they reach local logs. This matters
// because auth pages and account settings send passwords, JWTs, and OTP-related
// values through the same query wrapper as ordinary dashboard queries.
function sanitizeParams(params) {
  if (!params || !Array.isArray(params)) return params;
  return params.map(p => {
    if (typeof p === 'string') {
      if (p.startsWith('$2b$')) return '[PASSWORD_HASH]';
      if (p.length > 150 && (p.startsWith('eyJ') || p.includes('.'))) return '[JWT_TOKEN]';
      if (p.length > 60) return p.substring(0, 57) + '...';
      return p;
    }
    return p;
  });
}

module.exports = {
  query: (text, params) => {
    if (!enableLogging) {
      return pool.query(text, params);
    }
    const start = Date.now();
    return pool.query(text, params)
      .then((res) => {
        const duration = Date.now() - start;
        const summary = summarizeQuery(text);
        const store = requestContext.getStore();
        
        let logMsg = `\x1b[36m[DB]\x1b[0m`;
        if (store) {
          logMsg += ` \x1b[90m[${store.method} ${store.url}]\x1b[0m ➔`;
        }
        logMsg += ` \x1b[1m ${summary}\x1b[0m`;
        
        if (params && params.length > 0) {
          const cleanParams = sanitizeParams(params);
          logMsg += ` \x1b[90mParams: ${JSON.stringify(cleanParams)}\x1b[0m`;
        }
        logMsg += ` \x1b[32m(${duration}ms | Rows: ${res.rowCount})\x1b[0m`;
        console.log(logMsg);
        return res;
      })
      .catch((err) => {
        const duration = Date.now() - start;
        const summary = summarizeQuery(text);
        const store = requestContext.getStore();
        
        let logMsg = `\x1b[31m[DB Error]\x1b[0m`;
        if (store) {
          logMsg += ` \x1b[90m[${store.method} ${store.url}]\x1b[0m ➔`;
        }
        logMsg += ` \x1b[1m ${summary}\x1b[0m`;
        
        if (params && params.length > 0) {
          const cleanParams = sanitizeParams(params);
          logMsg += ` \x1b[90mParams: ${JSON.stringify(cleanParams)}\x1b[0m`;
        }
        logMsg += ` \x1b[31mError: ${err.message} (${duration}ms)\x1b[0m`;
        console.error(logMsg);
        throw err;
      });
  },
  pool,
};
