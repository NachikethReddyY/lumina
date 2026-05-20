const { Pool } = require('pg');
require('../lib/loadRootEnv').loadRootEnv();

const connectionString = process.env.DATABASE_URL || '';
const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');
const useSSL =
  process.env.DATABASE_SSL === 'true' || (!isLocal && Boolean(connectionString));

if (process.env.VERCEL) {
  try {
    const host = new URL(connectionString).hostname;
    console.log(`[db] DATABASE_URL host=${host} ssl=${useSSL ? 'on' : 'off'}`);
  } catch (err) {
    console.log(
      `[db] DATABASE_URL unavailable or invalid: ${err && err.message ? err.message : 'unknown error'}`
    );
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSSL && {
    ssl: { rejectUnauthorized: false },
  }),
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
