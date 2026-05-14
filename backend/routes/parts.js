const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET / - List all parts with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM parts_inventory');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM parts_inventory ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching parts:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /low-stock - Parts below reorder threshold
router.get('/low-stock', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM parts_inventory WHERE quantity <= minimum_stock'
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT *, (minimum_stock - quantity) AS shortage
       FROM parts_inventory
       WHERE quantity <= minimum_stock
       ORDER BY (quantity::float / NULLIF(minimum_stock, 0)) ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching low-stock parts:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /:id - Get a single part
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM parts_inventory WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching part:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST / - Create a new part
router.post('/', async (req, res) => {
  try {
    const {
      name, part_number, category, compatible_equipment,
      quantity, minimum_stock, unit_cost, supplier,
      location, status, last_ordered, lead_time_days, notes
    } = req.body;

    if (!name || !part_number) {
      return res.status(400).json({ error: 'Name and part number are required.' });
    }

    const result = await pool.query(
      `INSERT INTO parts_inventory
        (name, part_number, category, compatible_equipment, quantity, minimum_stock,
         unit_cost, supplier, location, status, last_ordered, lead_time_days, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        name, part_number, category, compatible_equipment,
        quantity || 0, minimum_stock || 0, unit_cost || 0,
        supplier, location, status || 'in_stock',
        last_ordered, lead_time_days, notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating part:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /:id - Update a part
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, part_number, category, compatible_equipment,
      quantity, minimum_stock, unit_cost, supplier,
      location, status, last_ordered, lead_time_days, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE parts_inventory SET
        name = COALESCE($1, name),
        part_number = COALESCE($2, part_number),
        category = COALESCE($3, category),
        compatible_equipment = COALESCE($4, compatible_equipment),
        quantity = COALESCE($5, quantity),
        minimum_stock = COALESCE($6, minimum_stock),
        unit_cost = COALESCE($7, unit_cost),
        supplier = COALESCE($8, supplier),
        location = COALESCE($9, location),
        status = COALESCE($10, status),
        last_ordered = COALESCE($11, last_ordered),
        lead_time_days = COALESCE($12, lead_time_days),
        notes = COALESCE($13, notes),
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        name, part_number, category, compatible_equipment,
        quantity, minimum_stock, unit_cost, supplier,
        location, status, last_ordered, lead_time_days,
        notes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating part:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /:id - Delete a part
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM parts_inventory WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found.' });
    }

    res.json({ message: 'Part deleted successfully.', part: result.rows[0] });
  } catch (err) {
    console.error('Error deleting part:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /:id/reorder - Mark part as ordered with expected delivery date
router.put('/:id/reorder', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity_ordered, expected_delivery_date, supplier, notes } = req.body;

    if (!quantity_ordered || quantity_ordered <= 0) {
      return res.status(400).json({ error: 'quantity_ordered must be a positive number' });
    }

    const partResult = await pool.query('SELECT * FROM parts_inventory WHERE id = $1', [id]);
    if (partResult.rows.length === 0) return res.status(404).json({ error: 'Part not found.' });

    const result = await pool.query(
      `UPDATE parts_inventory SET
         status = 'on_order',
         last_ordered = NOW(),
         supplier = COALESCE($1, supplier),
         notes = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE notes END,
         updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [supplier || null, notes || null, id]
    );

    res.json({
      part: result.rows[0],
      reorder_details: {
        quantity_ordered,
        ordered_at: new Date().toISOString(),
        expected_delivery_date: expected_delivery_date || null,
        supplier: supplier || result.rows[0].supplier
      }
    });
  } catch (err) {
    console.error('Error marking part as ordered:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /ai-reorder - AI reorder prediction
router.post('/:id/ai-reorder', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the part
    const partResult = await pool.query(
      'SELECT * FROM parts_inventory WHERE id = $1',
      [id]
    );

    if (partResult.rows.length === 0) {
      return res.status(404).json({ error: 'Part not found.' });
    }

    const part = partResult.rows[0];

    // Fetch all parts in the same category for context
    const categoryResult = await pool.query(
      'SELECT name, part_number, quantity, minimum_stock, unit_cost, lead_time_days, last_ordered, status FROM parts_inventory WHERE category = $1',
      [part.category]
    );

    const systemPrompt = `You are an AI inventory management specialist for commercial kitchen equipment parts.
Analyze stock levels, usage patterns, and lead times to provide reorder recommendations.
Respond in JSON format with the following structure:
{
  "reorder_recommended": true/false,
  "urgency": "critical" | "high" | "medium" | "low",
  "suggested_quantity": number,
  "estimated_cost": number,
  "reorder_date": "YYYY-MM-DD",
  "reasoning": "string explaining the recommendation",
  "risk_assessment": "string describing risks of not reordering",
  "optimization_tips": ["array of suggestions to optimize inventory"]
}`;

    const userPrompt = `Analyze the following part and provide a reorder recommendation:

Part Details:
- Name: ${part.name}
- Part Number: ${part.part_number}
- Category: ${part.category}
- Compatible Equipment: ${part.compatible_equipment}
- Current Quantity: ${part.quantity}
- Minimum Stock Level: ${part.minimum_stock}
- Unit Cost: $${part.unit_cost}
- Supplier: ${part.supplier}
- Lead Time: ${part.lead_time_days} days
- Last Ordered: ${part.last_ordered || 'Never'}
- Current Status: ${part.status}

Category Inventory Context (other parts in same category):
${JSON.stringify(categoryResult.rows, null, 2)}

Please analyze the stock level relative to minimum stock, consider the lead time for reordering, estimate usage patterns, and provide a detailed reorder recommendation.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let analysis = null;
    if (aiResult.success) {
      try {
        // Try to parse JSON from the AI response
        const jsonMatch = aiResult.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        // If JSON parsing fails, use the raw response
        analysis = null;
      }
    }

    res.json({
      part: {
        id: part.id,
        name: part.name,
        part_number: part.part_number,
        quantity: part.quantity,
        minimum_stock: part.minimum_stock,
        status: part.status
      },
      ai_analysis: analysis,
      raw_response: aiResult.response,
      model: aiResult.model,
      success: aiResult.success
    });
  } catch (err) {
    console.error('Error in AI reorder analysis:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
