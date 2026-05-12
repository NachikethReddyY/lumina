require('./lib/loadRootEnv').loadRootEnv();

const { createApp } = require('./app');
const db = require('./db');

const PORT = process.env.PORT || 5000;
const app = createApp();

const initializeDatabase = async () => {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM users');
    if (result.rows[0].n > 0) {
      return; 
    }

    await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified)
       VALUES (lower($1), crypt($2, gen_salt('bf')), $3, $4, $5::user_role, $6::user_status, TRUE)`,
      [
        'admin@example.com',
        'Adminpass1',
        'Admin',
        'User',
        'super_admin',
        'active',
      ]
    );
    console.log('Database seeded with default admin user (admin@example.com / Adminpass1).');
  } catch (error) {
    console.error('Error initializing database:', error.message);
    console.error(
      'Hint: apply schema with `psql "$DATABASE_URL" -f db/init.sql` if tables are missing.'
    );
  }
};

async function seedDemoUsers() {
  const demo = [
    ['alice@test.lumina', 'Testpass1', 'Alice', 'Tester', 'user'],
    ['bob@test.lumina', 'Testpass1', 'Bob', 'Builder', 'user'],
    ['carol@test.lumina', 'Testpass1', 'Carol', 'Coordinator', 'admin'],
  ];
  for (const [email, pass, firstName, lastName, role] of demo) {
    try {
      await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_is_verified)
         VALUES (lower($1), crypt($2, gen_salt('bf')), $3, $4, $5::user_role, 'active'::user_status, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [email, pass, firstName, lastName, role]
      );
    } catch (e) {
      console.warn('Demo user seed skipped:', e.message);
    }
  }
}

async function seedDefaultCategories() {
  const admin = await db.query(
    `SELECT id
     FROM users
     WHERE role IN ('admin'::user_role, 'super_admin'::user_role)
     ORDER BY created_at ASC
     LIMIT 1`
  );
  const adminId = admin.rows[0]?.id;
  if (!adminId) {
    return;
  }

  const categories = [
    ['Hardware Support', 'Device issues, peripherals, and workstation setup'],
    ['Software Support', 'Application access, system setup, and account tooling'],
    ['Bug Reports', 'Unexpected errors, crashes, and reproducible defects'],
  ];

  for (const [name, description] of categories) {
    try {
      await db.query(
        `INSERT INTO categories (name, description, created_by, is_active)
         SELECT $1, $2, $3, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM categories WHERE lower(name) = lower($1)
         )`,
        [name, description, adminId]
      );
    } catch (error) {
      console.warn('Default category seed skipped:', error.message);
    }
  }
}

initializeDatabase()
  .then(() => seedDemoUsers())
  .then(() => seedDefaultCategories())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  });
