const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, status, email_is_verified,
              avatar_url, created_at, last_login_at
       FROM users`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
