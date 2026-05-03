const fs = require('fs');
const path = require('path');
const db = require('./index');

const initDatabase = async () => {
  try {
    // Check if users table exists
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      console.log('→ Database schema not found. Running init.sql...');
      const initSQL = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
      await db.query(initSQL);
      console.log('✓ Database schema initialized');
    } else {
      console.log('✓ Database schema already exists');
    }
  } catch (err) {
    console.error('✗ Failed to initialize database:', err.message);
    throw err;
  }
};

module.exports = initDatabase;
