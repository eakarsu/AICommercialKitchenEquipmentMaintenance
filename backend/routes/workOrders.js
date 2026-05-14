const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { queryAI } = require('../openrouter');

// State machine: valid transitions
const VALID_TRANSITIONS = {
  open: ['assigned'],
  assigned: ['in_progress', 'open'],
  in_progress: ['parts_ordered', 'completed'],
  parts_ordered: ['in_progress'],
  completed: ['closed'],
  closed: []
};

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all work orders with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM work_orders');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT wo.*, e.name AS equipment_name
       FROM work_orders wo
       LEFT JOIN equipment e ON wo.equipment_id = e.id
       ORDER BY wo.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching work orders:', err);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /overdue - Work orders past their estimated completion date
router.get('/overdue', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM work_orders
      WHERE status NOT IN ('completed', 'closed')
        AND due_date IS NOT NULL
        AND due_date < NOW()
    `);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT wo.*, e.name AS equipment_name,
              NOW() - wo.due_date AS overdue_by
       FROM work_orders wo
       LEFT JOIN equipment e ON wo.equipment_id = e.id
       WHERE wo.status NOT IN ('completed', 'closed')
         AND wo.due_date IS NOT NULL
         AND wo.due_date < NOW()
       ORDER BY wo.due_date ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error fetching overdue work orders:', err);
    res.status(500).json({ error: 'Failed to fetch overdue work orders' });
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

    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!equipment_id) return res.status(400).json({ error: 'equipment_id is required' });

    const validPriorities = ['emergency', 'critical', 'high', 'medium', 'low'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `priority must be one of: ${validPriorities.join(', ')}` });
    }
    const validStatuses = Object.keys(VALID_TRANSITIONS);
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO work_orders
       (title, description, equipment_id, priority, status, assigned_to, requested_by, due_date, estimated_cost, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        title.trim(), description, equipment_id,
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

// POST /:id/parts-used - Record parts consumed on a work order
router.post('/:id/parts-used', async (req, res) => {
  try {
    const { id } = req.params;
    const { parts } = req.body; // array of { part_id, quantity_used }

    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'parts must be a non-empty array of { part_id, quantity_used }' });
    }

    const woResult = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);
    if (woResult.rows.length === 0) return res.status(404).json({ error: 'Work order not found' });

    const usageRecords = [];
    const errors = [];

    for (const entry of parts) {
      const { part_id, quantity_used } = entry;
      if (!part_id || !quantity_used || quantity_used <= 0) {
        errors.push({ part_id, error: 'part_id and positive quantity_used are required' });
        continue;
      }

      const partResult = await pool.query('SELECT * FROM parts_inventory WHERE id = $1', [part_id]);
      if (partResult.rows.length === 0) {
        errors.push({ part_id, error: 'Part not found' });
        continue;
      }

      const part = partResult.rows[0];
      const newQty = Math.max(0, (part.quantity || 0) - quantity_used);
      const newStatus = newQty <= 0 ? 'out_of_stock' : newQty <= (part.minimum_stock || 0) ? 'low_stock' : 'in_stock';

      await pool.query(
        `UPDATE parts_inventory SET quantity = $1, status = $2, updated_at = NOW() WHERE id = $3`,
        [newQty, newStatus, part_id]
      );

      // Record usage against work order actual cost
      const partCost = (part.unit_cost || 0) * quantity_used;
      await pool.query(
        `UPDATE work_orders SET actual_cost = COALESCE(actual_cost, 0) + $1, updated_at = NOW() WHERE id = $2`,
        [partCost, id]
      );

      usageRecords.push({
        part_id,
        part_name: part.name,
        part_number: part.part_number,
        quantity_used,
        quantity_remaining: newQty,
        unit_cost: part.unit_cost,
        total_cost: partCost,
        new_status: newStatus
      });
    }

    const updatedWo = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);

    res.json({
      work_order_id: parseInt(id),
      parts_recorded: usageRecords,
      errors,
      work_order: updatedWo.rows[0]
    });
  } catch (err) {
    console.error('Error recording parts used:', err);
    res.status(500).json({ error: 'Failed to record parts used' });
  }
});

// PUT /:id/status - State machine status transition with timestamp recording
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus, notes } = req.body;

    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    const woResult = await pool.query('SELECT * FROM work_orders WHERE id = $1', [id]);
    if (woResult.rows.length === 0) return res.status(404).json({ error: 'Work order not found' });

    const wo = woResult.rows[0];
    const currentStatus = wo.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
        current_status: currentStatus,
        allowed_transitions: allowed
      });
    }

    // Build timestamp field based on new status
    const timestampFields = {
      assigned: 'assigned_at',
      in_progress: 'started_at',
      parts_ordered: 'parts_ordered_at',
      completed: 'completed_date',
      closed: 'closed_at'
    };
    const tsField = timestampFields[newStatus];

    let updateQuery;
    let updateParams;

    if (tsField) {
      updateQuery = `
        UPDATE work_orders SET
          status = $1,
          notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE notes END,
          ${tsField} = NOW(),
          updated_at = NOW()
        WHERE id = $3
        RETURNING *`;
      updateParams = [newStatus, notes || null, id];
    } else {
      updateQuery = `
        UPDATE work_orders SET
          status = $1,
          notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE notes END,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *`;
      updateParams = [newStatus, notes || null, id];
    }

    const result = await pool.query(updateQuery, updateParams);

    res.json({
      work_order: result.rows[0],
      transition: { from: currentStatus, to: newStatus },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error updating work order status:', err);
    res.status(500).json({ error: 'Failed to update work order status' });
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
