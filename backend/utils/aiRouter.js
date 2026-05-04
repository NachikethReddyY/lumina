const db = require('../db');
const axios = require('axios');

const triggerAIRouting = async (ticket) => {
  try {
    // Fetch all active admins
    const adminsResult = await db.query(
      `SELECT id, email, first_name, last_name, role
       FROM users
       WHERE role IN ('admin', 'super_admin')
       AND status = 'active'
       ORDER BY created_at ASC`
    );

    const admins = adminsResult.rows;

    if (admins.length === 0) {
      console.warn('No active admins found for routing');
      return;
    }

    // Build AI prompt
    const adminList = admins.map((a) => `${a.first_name} ${a.last_name} (${a.email})`).join(', ');

    const prompt = `You are a helpdesk routing AI. Analyze this ticket and route it appropriately.

Ticket ID: ${ticket.id}
Title: ${ticket.title}
Description: ${ticket.description}
Type: ${ticket.type}
Category ID: ${ticket.category_id}

Available Admins: ${adminList}

Return a JSON object with exactly this structure:
{
  "category_id": "<UUID of category or keep existing ${ticket.category_id}>",
  "priority": "P1" or "P2" or "P3" or "P4",
  "assigned_to_user_id": "<UUID of one admin from the list>",
  "reasoning": "<brief explanation of routing decision>"
}

Choose the priority and admin based on ticket severity and content. Ensure assigned_to_user_id is one of these exact UUIDs: ${admins.map((a) => a.id).join(', ')}`;

    // Call OpenRouter API
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-2-7b-chat',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Lumina Helpdesk',
        },
      }
    );

    // Parse AI response
    let aiDecision;
    const content = response.data.choices[0].message.content;

    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      aiDecision = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      return;
    }

    // Validate AI decision
    if (!aiDecision.assigned_to_user_id || !aiDecision.priority) {
      console.error('Invalid AI decision structure:', aiDecision);
      return;
    }

    // Verify assigned user is in admin list
    const assignedAdmin = admins.find((a) => a.id === aiDecision.assigned_to_user_id);
    if (!assignedAdmin) {
      console.error('AI assigned user not in admin list:', aiDecision.assigned_to_user_id);
      return;
    }

    // Update ticket with routing metadata
    const routingMetadata = {
      ai_decision: {
        category_id: aiDecision.category_id,
        priority: aiDecision.priority,
        assigned_to_user_id: aiDecision.assigned_to_user_id,
        reasoning: aiDecision.reasoning || '',
      },
      routed_at: new Date().toISOString(),
      ai_model: 'meta-llama/llama-2-7b-chat',
    };

    await db.query(
      `UPDATE tickets
       SET status = $1,
           priority = $2,
           category_id = $3,
           routing_metadata = $4
       WHERE id = $5`,
      ['assigned', aiDecision.priority, aiDecision.category_id, JSON.stringify(routingMetadata), ticket.id]
    );

    // Create ticket assignment record
    await db.query(
      `INSERT INTO ticket_assignment (ticket_id, assigned_to_user_id, assigned_by_user_id, notes)
       VALUES ($1, $2, $3, $4)`,
      [ticket.id, aiDecision.assigned_to_user_id, null, `Auto-assigned by AI: ${aiDecision.reasoning}`]
    );

    console.log(`✓ Ticket ${ticket.id} routed to ${assignedAdmin.email}`);
  } catch (err) {
    console.error('AI routing error:', err.message);
  }
};

module.exports = { triggerAIRouting };
