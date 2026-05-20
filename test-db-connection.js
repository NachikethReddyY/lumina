const { Pool } = require('pg');
require('dotenv').config({ path: '.env.hosting' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in .env.hosting');
  process.exit(1);
}

console.log(`Connecting to: ${connectionString.split('@')[1] || connectionString} (password hidden)`);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database Connection Failed:', err.message);
    console.error('\nTips to fix:');
    console.error('1. Make sure you are using a postgres:// connection string, not an https:// REST API URL.');
    console.error('2. Double-check your database password in the URL.');
    console.error('3. Make sure the database host matches your Supabase project reference.');
  } else {
    console.log('✅ Connection Successful! Current time from database:', res.rows[0].now);
    
    // Check if DDL tables exist
    pool.query("SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users')", (err2, res2) => {
      if (err2) {
        console.error('❌ Error checking tables:', err2.message);
      } else if (res2.rows[0].exists) {
        console.log('✅ Tables exist! Your DDL schema is correctly applied.');
      } else {
        console.warn('⚠️ DDL Warning: The connection works, but the "users" table was not found! You need to run DDL.sql in the Supabase SQL Editor.');
      }
      pool.end();
    });
  }
});
