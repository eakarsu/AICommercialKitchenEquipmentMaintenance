const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all cost records with equipment details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, e.name AS equipment_name
      FROM cost_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      ORDER BY cr.date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching cost records:', err);
    res.status(500).json({ error: 'Failed to fetch cost records' });
  }
});

// GET /:id - Get a single cost record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cr.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM cost_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      WHERE cr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching cost record:', err);
    res.status(500).json({ error: 'Failed to fetch cost record' });
  }
});

// POST / - Create a new cost record
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, category, description, amount, labor_cost,
      parts_cost, vendor_id, work_order_id, date, fiscal_quarter, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO cost_records
        (equipment_id, category, description, amount, labor_cost,
         parts_cost, vendor_id, work_order_id, date, fiscal_quarter,
         notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      equipment_id, category, description, amount, labor_cost,
      parts_cost, vendor_id, work_order_id, date, fiscal_quarter, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating cost record:', err);
    res.status(500).json({ error: 'Failed to create cost record' });
  }
});

// PUT /:id - Update a cost record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, category, description, amount, labor_cost,
      parts_cost, vendor_id, work_order_id, date, fiscal_quarter, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE cost_records SET
        equipment_id = COALESCE($1, equipment_id),
        category = COALESCE($2, category),
        description = COALESCE($3, description),
        amount = COALESCE($4, amount),
        labor_cost = COALESCE($5, labor_cost),
        parts_cost = COALESCE($6, parts_cost),
        vendor_id = COALESCE($7, vendor_id),
        work_order_id = COALESCE($8, work_order_id),
        date = COALESCE($9, date),
        fiscal_quarter = COALESCE($10, fiscal_quarter),
        notes = COALESCE($11, notes),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      equipment_id, category, description, amount, labor_cost,
      parts_cost, vendor_id, work_order_id, date, fiscal_quarter,
      notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating cost record:', err);
    res.status(500).json({ error: 'Failed to update cost record' });
  }
});

// DELETE /:id - Delete a cost record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM cost_records WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost record not found' });
    }
    res.json({ message: 'Cost record deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting cost record:', err);
    res.status(500).json({ error: 'Failed to delete cost record' });
  }
});

// POST /ai-analyze - AI cost optimization analysis across all costs
router.post('/ai-analyze', async (req, res) => {
  try {
    // Fetch all cost records with equipment details
    const costsResult = await pool.query(`
      SELECT cr.*, e.name AS equipment_name, e.type AS equipment_type
      FROM cost_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      ORDER BY cr.date DESC
    `);

    const costs = costsResult.rows;

    // Fetch summary statistics by category
    const summaryResult = await pool.query(`
      SELECT category,
             COUNT(*) AS record_count,
             SUM(amount) AS total_amount,
             SUM(labor_cost) AS total_labor,
             SUM(parts_cost) AS total_parts,
             AVG(amount) AS avg_amount
      FROM cost_records
      GROUP BY category
      ORDER BY total_amount DESC
    `);

    // Fetch per-equipment cost totals
    const equipmentCostsResult = await pool.query(`
      SELECT e.name AS equipment_name, e.type AS equipment_type,
             COUNT(cr.id) AS record_count,
             SUM(cr.amount) AS total_amount,
             SUM(cr.labor_cost) AS total_labor,
             SUM(cr.parts_cost) AS total_parts
      FROM cost_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      GROUP BY e.name, e.type
      ORDER BY total_amount DESC
    `);

    // Fetch quarterly trends
    const quarterlyResult = await pool.query(`
      SELECT fiscal_quarter,
             COUNT(*) AS record_count,
             SUM(amount) AS total_amount,
             SUM(labor_cost) AS total_labor,
             SUM(parts_cost) AS total_parts
      FROM cost_records
      WHERE fiscal_quarter IS NOT NULL
      GROUP BY fiscal_quarter
      ORDER BY fiscal_quarter DESC
    `);

    const systemPrompt = `You are an expert financial analyst specializing in commercial kitchen equipment maintenance costs.
Analyze cost data and provide actionable optimization recommendations. Respond in JSON format with the following structure:
{
  "budget_optimization": {
    "total_spend_assessment": "string",
    "recommended_budget_allocation": { "category": "percentage" },
    "potential_savings": "string"
  },
  "cost_reduction_strategies": [
    {
      "strategy": "string",
      "estimated_savings": "string",
      "implementation_effort": "low | medium | high",
      "priority": "critical | high | medium | low"
    }
  ],
  "roi_analysis": {
    "preventive_vs_emergency_ratio": "string",
    "labor_vs_parts_ratio": "string",
    "highest_cost_equipment": "string",
    "roi_recommendations": ["array of ROI improvement suggestions"]
  },
  "quarterly_trends": "string describing spending trends",
  "risk_areas": ["array of financial risk areas"],
  "executive_summary": "string"
}`;

    const userPrompt = `Analyze the following maintenance cost data for a commercial kitchen operation and provide budget optimization, cost reduction strategies, and ROI analysis:

Cost Summary by Category:
${JSON.stringify(summaryResult.rows, null, 2)}

Cost Summary by Equipment:
${JSON.stringify(equipmentCostsResult.rows, null, 2)}

Quarterly Trends:
${JSON.stringify(quarterlyResult.rows, null, 2)}

Total Records: ${costs.length}

Recent Cost Records (last 20):
${JSON.stringify(costs.slice(0, 20).map(c => ({
  equipment: c.equipment_name,
  category: c.category,
  amount: c.amount,
  labor_cost: c.labor_cost,
  parts_cost: c.parts_cost,
  date: c.date,
  quarter: c.fiscal_quarter
})), null, 2)}

Provide a comprehensive cost optimization analysis with actionable recommendations.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let analysis = null;
    if (aiResult.success) {
      try {
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = { raw_analysis: aiResult.response };
      }
    }

    res.json({
      cost_summary: {
        by_category: summaryResult.rows,
        by_equipment: equipmentCostsResult.rows,
        by_quarter: quarterlyResult.rows,
        total_records: costs.length
      },
      ai_analysis: analysis,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI cost analysis:', err);
    res.status(500).json({ error: 'Failed to generate AI cost analysis' });
  }
});

module.exports = router;
