const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all maintenance schedules with equipment details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, e.name AS equipment_name
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      ORDER BY ms.next_due ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching maintenance schedules:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance schedules' });
  }
});

// GET /:id - Get a single maintenance schedule with equipment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT ms.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      WHERE ms.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching maintenance schedule:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance schedule' });
  }
});

// POST / - Create a new maintenance schedule
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, task_name, description, frequency, priority,
      last_completed, next_due, assigned_to, status,
      estimated_duration, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO maintenance_schedules
        (equipment_id, task_name, description, frequency, priority,
         last_completed, next_due, assigned_to, status,
         estimated_duration, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      equipment_id, task_name, description, frequency, priority,
      last_completed, next_due, assigned_to, status || 'scheduled',
      estimated_duration, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating maintenance schedule:', err);
    res.status(500).json({ error: 'Failed to create maintenance schedule' });
  }
});

// PUT /:id - Update a maintenance schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, task_name, description, frequency, priority,
      last_completed, next_due, assigned_to, status,
      estimated_duration, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE maintenance_schedules
      SET equipment_id = $1, task_name = $2, description = $3,
          frequency = $4, priority = $5, last_completed = $6,
          next_due = $7, assigned_to = $8, status = $9,
          estimated_duration = $10, notes = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      equipment_id, task_name, description, frequency, priority,
      last_completed, next_due, assigned_to, status,
      estimated_duration, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating maintenance schedule:', err);
    res.status(500).json({ error: 'Failed to update maintenance schedule' });
  }
});

// DELETE /:id - Delete a maintenance schedule
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM maintenance_schedules WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }
    res.json({ message: 'Maintenance schedule deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting maintenance schedule:', err);
    res.status(500).json({ error: 'Failed to delete maintenance schedule' });
  }
});

// POST /:id/ai-predict - AI-powered predictive maintenance analysis
router.post('/:id/ai-predict', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the maintenance schedule with equipment details
    const scheduleResult = await pool.query(`
      SELECT ms.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      WHERE ms.id = $1
    `, [id]);

    if (scheduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance schedule not found' });
    }

    const schedule = scheduleResult.rows[0];

    // Fetch maintenance history for this equipment
    const historyResult = await pool.query(`
      SELECT task_name, status, last_completed, next_due, frequency,
             priority, estimated_duration, notes
      FROM maintenance_schedules
      WHERE equipment_id = $1
      ORDER BY last_completed DESC NULLS LAST
      LIMIT 20
    `, [schedule.equipment_id]);

    const history = historyResult.rows;

    const systemPrompt = `You are an expert predictive maintenance AI for commercial kitchen equipment.
Analyze maintenance data and provide actionable predictions. Respond in JSON format with these fields:
- optimal_next_maintenance: recommended date (ISO format)
- predicted_failure_risk: percentage (0-100)
- risk_level: "low", "medium", "high", or "critical"
- predicted_issues: array of potential problems
- recommendations: array of actionable recommendations
- estimated_remaining_life: estimated remaining useful life description
- cost_impact: estimated cost impact if maintenance is delayed
- confidence_score: confidence in the prediction (0-100)`;

    const userPrompt = `Analyze this commercial kitchen equipment maintenance data and predict optimal scheduling:

Equipment: ${schedule.equipment_name || 'Unknown'}
Type: ${schedule.equipment_type || 'Unknown'}
Location: ${schedule.equipment_location || 'Unknown'}

Current Schedule:
- Task: ${schedule.task_name}
- Description: ${schedule.description || 'N/A'}
- Frequency: ${schedule.frequency}
- Priority: ${schedule.priority}
- Status: ${schedule.status}
- Last Completed: ${schedule.last_completed || 'Never'}
- Next Due: ${schedule.next_due || 'Not set'}
- Estimated Duration: ${schedule.estimated_duration || 'Unknown'}

Maintenance History (${history.length} records):
${history.map(h => `  - ${h.task_name} | Status: ${h.status} | Completed: ${h.last_completed || 'N/A'} | Frequency: ${h.frequency} | Priority: ${h.priority}`).join('\n')}

Provide a predictive maintenance analysis with optimal scheduling, potential failure predictions, and risk assessment.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let prediction = null;
    if (aiResult.success) {
      try {
        // Try to parse the AI response as JSON
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        prediction = JSON.parse(cleaned);
      } catch {
        // If not valid JSON, wrap the text response
        prediction = { raw_analysis: aiResult.response };
      }
    }

    res.json({
      schedule,
      maintenance_history: history,
      ai_prediction: prediction,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI prediction:', err);
    res.status(500).json({ error: 'Failed to generate AI prediction' });
  }
});

module.exports = router;
