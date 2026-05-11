const express = require('express');
const authRoutes = require('./auth');
const usersRoutes = require('./users');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lumina-api', version: '1' });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);

module.exports = router;
