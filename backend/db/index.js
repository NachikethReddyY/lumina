const { Pool } = require('pg');
require('../lib/loadRootEnv').loadRootEnv();

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

const enableLogging = process.env.NODE_ENV !== 'production';

module.exports = {
  query: (text, params) => {
    if (!enableLogging) {
      return pool.query(text, params);
    }
    const start = Date.now();
    return pool.query(text, params)
      .then((res) => {
        const duration = Date.now() - start;
        console.log('\x1b[36m%s\x1b[0m', `[SQL] ${text.replace(/\s+/g, ' ').trim()}`);
        if (params && params.length > 0) {
          console.log('\x1b[90m%s\x1b[0m', `      Params: ${JSON.stringify(params)}`);
        }
        console.log('\x1b[32m%s\x1b[0m', `      Duration: ${duration}ms | Rows: ${res.rowCount}`);
        return res;
      })
      .catch((err) => {
        console.error('\x1b[31m%s\x1b[0m', `[SQL Error] ${text.replace(/\s+/g, ' ').trim()}`);
        if (params && params.length > 0) {
          console.error('\x1b[90m%s\x1b[0m', `            Params: ${JSON.stringify(params)}`);
        }
        console.error('\x1b[31m%s\x1b[0m', `            Error: ${err.message}`);
        throw err;
      });
  },
  pool,
};
