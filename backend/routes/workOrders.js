const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all work orders with equipment name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT wo.*, e.name AS equipment_name
       FROM work_orders wo
       LEFT JOIN equipment e ON wo.equipment_id = e.id
       ORDER BY wo.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching work orders:', err);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /:id - Get one work order with equipment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT wo.*, e.name AS equipment_name, e.model, e.location, e.status AS equipment_status
       FROM work_orders wo
       LEFT JOIN equipment e ON wo.equipment_id = e.id
       WHERE wo.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching work order:', err);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// POST / - Create a new work order
router.post('/', async (req, res) => {
  try {
    const {
      title, description, equipment_id, priority, status,
      assigned_to, requested_by, due_date, estimated_cost, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO work_orders
       (title, description, equipment_id, priority, status, assigned_to, requested_by, due_date, estimated_cost, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        title, description, equipment_id,
        priority || 'medium', status || 'open',
        assigned_to, requested_by, due_date, estimated_cost, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating work order:', err);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PUT /:id - Update a work order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, equipment_id, priority, status,
      assigned_to, requested_by, due_date, completed_date,
      estimated_cost, actual_cost, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE work_orders SET
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       equipment_id = COALESCE($3, equipment_id),
       priority = COALESCE($4, priority),
       status = COALESCE($5, status),
       assigned_to = COALESCE($6, assigned_to),
       requested_by = COALESCE($7, requested_by),
       due_date = COALESCE($8, due_date),
       completed_date = COALESCE($9, completed_date),
       estimated_cost = COALESCE($10, estimated_cost),
       actual_cost = COALESCE($11, actual_cost),
       notes = COALESCE($12, notes),
       updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        title, description, equipment_id, priority, status,
        assigned_to, requested_by, due_date, completed_date,
        estimated_cost, actual_cost, notes, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating work order:', err);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

// DELETE /:id - Delete a work order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM work_orders WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }
    res.json({ message: 'Work order deleted', workOrder: result.rows[0] });
  } catch (err) {
    console.error('Error deleting work order:', err);
    res.status(500).json({ error: 'Failed to delete work order' });
  }
});

// POST /:id/ai-prioritize - AI priority assessment
router.post('/:id/ai-prioritize', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the work order with equipment details
    const woResult = await pool.query(
      `SELECT wo.*, e.name AS equipment_name, e.model, e.location, e.status AS equipment_status
       FROM work_orders wo
       LEFT JOIN equipment e ON wo.equipment_id = e.id
       WHERE wo.id = $1`,
      [id]
    );

    if (woResult.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const wo = woResult.rows[0];

    const systemPrompt = `You are an expert commercial kitchen equipment maintenance manager.
Analyze the following work order and provide a JSON response with your assessment.
Consider food safety regulations, equipment criticality, business impact, and technician availability.
Respond ONLY with valid JSON in this format:
{
  "recommended_priority": "emergency|high|medium|low",
  "priority_reasoning": "brief explanation",
  "suggested_timeline": "recommended completion timeframe",
  "assignment_recommendation": "type of technician or specialist needed",
  "estimated_downtime": "expected equipment downtime",
  "safety_concerns": "any food safety or worker safety issues",
  "cost_estimate_notes": "notes on potential costs",
  "additional_recommendations": "any other suggestions"
}`;

    const userPrompt = `Work Order Details:
- Title: ${wo.title}
- Description: ${wo.description || 'No description provided'}
- Current Priority: ${wo.priority}
- Current Status: ${wo.status}
- Equipment: ${wo.equipment_name || 'Unknown'} (Model: ${wo.model || 'N/A'})
- Equipment Location: ${wo.location || 'N/A'}
- Equipment Status: ${wo.equipment_status || 'N/A'}
- Requested By: ${wo.requested_by || 'N/A'}
- Due Date: ${wo.due_date || 'Not set'}
- Estimated Cost: ${wo.estimated_cost ? '$' + wo.estimated_cost : 'Not estimated'}
- Notes: ${wo.notes || 'None'}`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let assessment = null;
    if (aiResult.success) {
      try {
        // Try to parse the AI response as JSON
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        assessment = JSON.parse(cleaned);
      } catch (parseErr) {
        // If parsing fails, return the raw response
        assessment = { raw_response: aiResult.response };
      }
    }

    res.json({
      work_order_id: wo.id,
      title: wo.title,
      current_priority: wo.priority,
      ai_assessment: assessment,
      ai_model: aiResult.model,
      success: aiResult.success,
      error: aiResult.success ? null : aiResult.response
    });
  } catch (err) {
    console.error('Error in AI prioritization:', err);
    res.status(500).json({ error: 'Failed to perform AI priority assessment' });
  }
});

module.exports = router;
