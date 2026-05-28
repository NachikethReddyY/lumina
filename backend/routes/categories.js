const express = require('express');
const db = require('../db');
const { requireAuth, requireOnboarding, requireRole } = require('../middleware/auth');
const { validateCategoryBody, validationError } = require('../lib/ticketValidation');

const router = express.Router();

// Category API for CreateTicketModal and any admin category management UI. The
// ticket form only offers active categories, while historical tickets keep their
// category labels through tickets.category_id.
router.get('/', requireAuth, requireOnboarding, async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, description, created_by, is_active
       FROM categories
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  const parsed = validateCategoryBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `INSERT INTO categories (name, description, created_by, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, created_by, is_active`,
      [parsed.value.name, parsed.value.description, req.user.id, parsed.value.isActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, requireOnboarding, requireRole('admin'), async (req, res, next) => {
  const parsed = validateCategoryBody(req.body);
  if (!parsed.ok) {
    return res.status(400).json(validationError(parsed.details));
  }

  try {
    const result = await db.query(
      `UPDATE categories
       SET name = $2, description = $3, is_active = $4
       WHERE id = $1
       RETURNING id, name, description, created_by, is_active`,
      [req.params.id, parsed.value.name, parsed.value.description, parsed.value.isActive]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
