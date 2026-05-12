const express = require('express');
const authRoutes = require('./auth');
const categoriesRoutes = require('./categories');
const ticketsRoutes = require('./tickets');
const usersRoutes = require('./users');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'lumina-api', version: '1' });
});

router.use('/auth', authRoutes);
router.use('/categories', categoriesRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/users', usersRoutes);

module.exports = router;
