const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { PORT, DATABASE_URL, NODE_ENV } = require('./config/env');
const db = require('./db');
const errorHandler = require('./middleware/errorHandler');
const initDatabase = require('./db/initDatabase');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', env: NODE_ENV });
});

// Routes
app.use('/auth', require('./routes/auth'));

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test DB connection
    await db.query('SELECT NOW()');
    console.log('✓ Database connected');

    // Initialize database schema if needed
    await initDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${NODE_ENV}`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();
