const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { triggerAIRouting } = require('../utils/aiRouter');

const router = express.Router();

// GET /tickets - List all tickets (filtering done on frontend)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        id, title, description, category_id, type, priority, status,
        submitted_by, replication_steps, created_at
       FROM tickets
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch tickets error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// GET /tickets/:id - Get single ticket
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
        id, title, description, category_id, type, priority, status,
        submitted_by, replication_steps, created_at
       FROM tickets
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch ticket error:', err.message);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// POST /tickets - Create ticket and trigger AI routing
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, category_id, type, priority, replication_steps } = req.body;
    const submitted_by = req.user.id;

    if (!title || !description || !category_id || !type || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create ticket with pending_routing status
    const ticketResult = await db.query(
      `INSERT INTO tickets (title, description, category_id, type, priority, status, submitted_by, replication_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description, category_id, type, priority, 'pending_routing', submitted_by, replication_steps || null]
    );

    const ticket = ticketResult.rows[0];

    // Return ticket to frontend without routing_metadata
    const ticketResponse = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category_id: ticket.category_id,
      type: ticket.type,
      priority: ticket.priority,
      status: ticket.status,
      submitted_by: ticket.submitted_by,
      replication_steps: ticket.replication_steps,
      created_at: ticket.created_at,
    };

    res.status(201).json(ticketResponse);

    // Trigger AI routing asynchronously (don't wait for response)
    triggerAIRouting(ticket).catch((err) => {
      console.error('AI routing failed for ticket', ticket.id, ':', err.message);
    });
  } catch (err) {
    console.error('Create ticket error:', err.message);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// PATCH /tickets/:id - Update ticket status/priority
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { status, priority, description } = req.body;
    const ticketId = req.params.id;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      values.push(priority);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(ticketId);
    const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, title, description, category_id, type, priority, status, submitted_by, replication_steps, created_at`;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update ticket error:', err.message);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;
