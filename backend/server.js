require('./lib/loadRootEnv').loadRootEnv();

const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 5000;
const app = createApp();

// Startup guard for local development and serverless cold starts. The schema is
// owned by backend/db/DDL.sql; this check only tells developers when the API is
// pointed at an empty or unapplied database instead of running migrations here.
const initializeDatabase = async () => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (result.rows[0].n === 0) {
      console.warn(
        'No users found. Apply backend/db/DDL.sql to load the schema and development seed data.'
      );
    }
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error(
      'Hint: apply schema with `psql "$DATABASE_URL" -f db/DDL.sql` if tables are missing.'
    );
  }
};

if (process.env.VERCEL) {
  // In serverless deployments, start handling requests while the non-mutating
  // database check runs in the background.
  initializeDatabase();
} else {
  initializeDatabase().then(() => {
    const server = app.listen(PORT, (arg) => {
      // Express wires this callback to `server.once('error', done)` as well as the
      // listening callback, so it runs with an Error on bind failures (e.g. EADDRINUSE).
      if (arg instanceof Error) {
        console.error(`Server failed to listen on port ${PORT}:`, arg.message);
        process.exit(1);
      }
      console.log(`Server is running on http://localhost:${PORT}`);
    });

    // Surface port collisions and other bind failures in local development.
    server.on('error', (err) => {
      console.error(`Server error on port ${PORT}:`, err.message);
    });
  }).catch((err) => {
    throw err;
  });
}

module.exports = app;
