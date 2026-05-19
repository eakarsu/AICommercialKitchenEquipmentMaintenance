const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET /by-equipment - Energy consumption aggregated per equipment item
router.get('/by-equipment', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query(`
      SELECT COUNT(DISTINCT el.equipment_id) FROM energy_logs el
    `);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
      SELECT
        e.id AS equipment_id,
        e.name AS equipment_name,
        e.type AS equipment_type,
        e.location,
        COUNT(el.id) AS log_count,
        SUM(el.energy_consumption) AS total_kwh,
        AVG(el.energy_consumption) AS avg_kwh_per_reading,
        SUM(el.cost) AS total_cost,
        AVG(el.cost) AS avg_cost_per_reading,
        AVG(el.efficiency_rating) AS avg_efficiency_rating,
        SUM(el.operating_hours) AS total_operating_hours,
        MAX(el.reading_date) AS last_reading_date,
        COUNT(CASE WHEN el.anomaly_detected THEN 1 END) AS anomaly_count
      FROM energy_logs el
      LEFT JOIN equipment e ON el.equipment_id = e.id
      GROUP BY e.id, e.name, e.type, e.location
      ORDER BY total_kwh DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({ data: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching energy by equipment:', err);
    res.status(500).json({ error: 'Failed to fetch energy by equipment' });
  }
});

// POST /ai-optimize - AI analyzes fleet-level consumption, returns savings recommendations
router.post('/ai-optimize', rateLimiter, async (req, res) => {
  try {
    // Fetch per-equipment energy aggregates
    const equipmentEnergy = await pool.query(`
      SELECT
        e.id AS equipment_id,
        e.name AS equipment_name,
        e.type AS equipment_type,
        e.location,
        COUNT(el.id) AS log_count,
        SUM(el.energy_consumption) AS total_kwh,
        AVG(el.energy_consumption) AS avg_kwh_per_reading,
        SUM(el.cost) AS total_cost,
        AVG(el.efficiency_rating) AS avg_efficiency_rating,
        SUM(el.operating_hours) AS total_operating_hours,
        COUNT(CASE WHEN el.anomaly_detected THEN 1 END) AS anomaly_count
      FROM energy_logs el
      LEFT JOIN equipment e ON el.equipment_id = e.id
      GROUP BY e.id, e.name, e.type, e.location
      ORDER BY total_kwh DESC NULLS LAST
    `);

    const overallStats = await pool.query(`
      SELECT
        SUM(energy_consumption) AS total_kwh,
        SUM(cost) AS total_cost,
        AVG(efficiency_rating) AS avg_efficiency,
        COUNT(*) AS total_readings,
        COUNT(CASE WHEN anomaly_detected THEN 1 END) AS total_anomalies
      FROM energy_logs
    `);

    const systemPrompt = `You are an expert energy efficiency analyst for commercial kitchen equipment. Analyze fleet-wide energy consumption data and provide comprehensive optimization recommendations. Return valid JSON only.`;

    const userPrompt = `Analyze the fleet-wide energy consumption for this commercial kitchen operation and provide optimization recommendations.

Overall Statistics:
${JSON.stringify(overallStats.rows[0], null, 2)}

Per-Equipment Energy Breakdown (${equipmentEnergy.rows.length} items):
${JSON.stringify(equipmentEnergy.rows, null, 2)}

Return a JSON object with:
- fleet_efficiency_score (0-100)
- total_estimated_monthly_cost_usd (number)
- top_consumers (array of {equipment_name, total_kwh, pct_of_fleet})
- optimization_recommendations (array of {equipment_name, action, estimated_savings_kwh, estimated_savings_usd_monthly, priority: "high"|"medium"|"low"})
- eco_alternatives (array of {equipment_name, alternative, savings_percent, certification})
- carbon_footprint (object with: total_kg_co2, equivalent_trees, reduction_potential_percent)
- anomaly_alerts (array of {equipment_name, anomaly_count, recommended_action})
- scheduling_optimizations (array of string tips for off-peak scheduling)
- roi_summary (object with: total_investment_estimate, annual_savings_potential, payback_years)
- executive_summary (string)`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let analysis = null;
    if (aiResult.success) {
      try {
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) analysis = JSON.parse(match[0]);
        else analysis = { raw_response: aiResult.response };
      } catch { analysis = { raw_response: aiResult.response }; }
    }

    res.json({
      overall_stats: overallStats.rows[0],
      equipment_count: equipmentEnergy.rows.length,
      per_equipment: equipmentEnergy.rows,
      ai_optimization: analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating fleet energy optimization:', err);
    res.status(500).json({ error: 'Failed to generate AI energy optimization' });
  }
});

// GET / - List all energy logs with equipment details and pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM energy_logs');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
      SELECT el.*, e.name AS equipment_name
      FROM energy_logs el
      LEFT JOIN equipment e ON el.equipment_id = e.id
      ORDER BY el.reading_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    res.json({ data: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching energy logs:', err);
    res.status(500).json({ error: 'Failed to fetch energy logs' });
  }
});

// GET /:id - Get a single energy log with equipment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT el.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM energy_logs el
      LEFT JOIN equipment e ON el.equipment_id = e.id
      WHERE el.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Energy log not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching energy log:', err);
    res.status(500).json({ error: 'Failed to fetch energy log' });
  }
});

// POST / - Create a new energy log
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, reading_date, energy_consumption, unit,
      cost, peak_usage_time, efficiency_rating, temperature_setting,
      operating_hours, anomaly_detected, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO energy_logs
        (equipment_id, reading_date, energy_consumption, unit,
         cost, peak_usage_time, efficiency_rating, temperature_setting,
         operating_hours, anomaly_detected, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      equipment_id, reading_date, energy_consumption, unit || 'kWh',
      cost, peak_usage_time, efficiency_rating, temperature_setting,
      operating_hours, anomaly_detected || false, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating energy log:', err);
    res.status(500).json({ error: 'Failed to create energy log' });
  }
});

// PUT /:id - Update an energy log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, reading_date, energy_consumption, unit,
      cost, peak_usage_time, efficiency_rating, temperature_setting,
      operating_hours, anomaly_detected, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE energy_logs
      SET equipment_id = $1, reading_date = $2, energy_consumption = $3,
          unit = $4, cost = $5, peak_usage_time = $6,
          efficiency_rating = $7, temperature_setting = $8,
          operating_hours = $9, anomaly_detected = $10,
          notes = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      equipment_id, reading_date, energy_consumption, unit,
      cost, peak_usage_time, efficiency_rating, temperature_setting,
      operating_hours, anomaly_detected, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Energy log not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating energy log:', err);
    res.status(500).json({ error: 'Failed to update energy log' });
  }
});

// DELETE /:id - Delete an energy log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM energy_logs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Energy log not found' });
    }
    res.json({ message: 'Energy log deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting energy log:', err);
    res.status(500).json({ error: 'Failed to delete energy log' });
  }
});

// POST /:id/ai-optimize - AI-powered energy optimization analysis
router.post('/:id/ai-optimize', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the energy log with equipment details
    const logResult = await pool.query(`
      SELECT el.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM energy_logs el
      LEFT JOIN equipment e ON el.equipment_id = e.id
      WHERE el.id = $1
    `, [id]);

    if (logResult.rows.length === 0) {
      return res.status(404).json({ error: 'Energy log not found' });
    }

    const energyLog = logResult.rows[0];

    // Fetch energy history for this equipment
    const historyResult = await pool.query(`
      SELECT reading_date, energy_consumption, unit, cost,
             peak_usage_time, efficiency_rating, temperature_setting,
             operating_hours, anomaly_detected, notes
      FROM energy_logs
      WHERE equipment_id = $1
      ORDER BY reading_date DESC
      LIMIT 30
    `, [energyLog.equipment_id]);

    const history = historyResult.rows;

    const systemPrompt = `You are an expert energy efficiency analyst for commercial kitchen equipment.
Analyze energy consumption data and provide optimization recommendations. Respond in JSON format with these fields:
- optimization_tips: array of specific actionable tips to reduce energy consumption
- estimated_savings: object with monthly_kwh, monthly_cost, and annual_cost savings estimates
- efficiency_improvements: array of recommended efficiency improvements with expected impact
- environmental_impact: object with co2_reduction_kg, equivalent_trees, and sustainability_rating (A-F)
- anomaly_analysis: description of any detected anomalies or unusual patterns
- optimal_settings: recommended temperature and operating hour settings
- peak_usage_recommendations: tips for reducing peak-time energy usage
- overall_efficiency_score: score from 0-100 based on current data
- priority_actions: array of top 3 most impactful actions ranked by ROI`;

    const userPrompt = `Analyze this commercial kitchen equipment energy data and provide optimization recommendations:

Equipment: ${energyLog.equipment_name || 'Unknown'}
Type: ${energyLog.equipment_type || 'Unknown'}
Location: ${energyLog.equipment_location || 'Unknown'}

Current Reading:
- Date: ${energyLog.reading_date}
- Energy Consumption: ${energyLog.energy_consumption} ${energyLog.unit}
- Cost: $${energyLog.cost || 'N/A'}
- Peak Usage Time: ${energyLog.peak_usage_time || 'N/A'}
- Efficiency Rating: ${energyLog.efficiency_rating || 'N/A'}
- Temperature Setting: ${energyLog.temperature_setting || 'N/A'}
- Operating Hours: ${energyLog.operating_hours || 'N/A'}
- Anomaly Detected: ${energyLog.anomaly_detected ? 'Yes' : 'No'}
- Notes: ${energyLog.notes || 'None'}

Energy History (${history.length} records):
${history.map(h => `  - ${h.reading_date} | ${h.energy_consumption} ${h.unit} | Cost: $${h.cost || 'N/A'} | Efficiency: ${h.efficiency_rating || 'N/A'} | Hours: ${h.operating_hours || 'N/A'} | Peak: ${h.peak_usage_time || 'N/A'} | Anomaly: ${h.anomaly_detected ? 'Yes' : 'No'}`).join('\n')}

Provide a comprehensive energy optimization analysis with specific tips, estimated savings, efficiency improvements, and environmental impact.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let optimization = null;
    if (aiResult.success) {
      try {
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        optimization = JSON.parse(cleaned);
      } catch {
        optimization = { raw_analysis: aiResult.response };
      }
    }

    res.json({
      energy_log: energyLog,
      energy_history: history,
      ai_optimization: optimization,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI energy optimization:', err);
    res.status(500).json({ error: 'Failed to generate AI energy optimization' });
  }
});

module.exports = router;
