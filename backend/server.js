require('./lib/loadRootEnv').loadRootEnv();

const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 5000;
const app = createApp();

const initializeDatabase = async () => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (result.rows[0].n === 0) {
      console.warn(
        'No users found. Apply backend/db/init.sql to load the schema and development seed data.'
      );
    }
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error(
      'Hint: apply schema with `psql "$DATABASE_URL" -f db/init.sql` if tables are missing.'
    );
  }
};

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  });
