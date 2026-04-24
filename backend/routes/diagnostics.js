const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all diagnostic logs with equipment details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dl.*, e.name AS equipment_name
      FROM diagnostic_logs dl
      LEFT JOIN equipment e ON dl.equipment_id = e.id
      ORDER BY dl.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching diagnostic logs:', err);
    res.status(500).json({ error: 'Failed to fetch diagnostic logs' });
  }
});

// GET /:id - Get a single diagnostic log with equipment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT dl.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM diagnostic_logs dl
      LEFT JOIN equipment e ON dl.equipment_id = e.id
      WHERE dl.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnostic log not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching diagnostic log:', err);
    res.status(500).json({ error: 'Failed to fetch diagnostic log' });
  }
});

// POST / - Create a new diagnostic log
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, reported_issue, symptoms, diagnosis, severity,
      status, technician, resolution, resolved_at
    } = req.body;

    const result = await pool.query(`
      INSERT INTO diagnostic_logs
        (equipment_id, reported_issue, symptoms, diagnosis, severity,
         status, technician, resolution, resolved_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      equipment_id, reported_issue, symptoms, diagnosis,
      severity || 'medium', status || 'open', technician,
      resolution, resolved_at
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating diagnostic log:', err);
    res.status(500).json({ error: 'Failed to create diagnostic log' });
  }
});

// PUT /:id - Update a diagnostic log
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, reported_issue, symptoms, diagnosis, severity,
      status, technician, resolution, resolved_at
    } = req.body;

    const result = await pool.query(`
      UPDATE diagnostic_logs
      SET equipment_id = $1, reported_issue = $2, symptoms = $3,
          diagnosis = $4, severity = $5, status = $6,
          technician = $7, resolution = $8, resolved_at = $9,
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      equipment_id, reported_issue, symptoms, diagnosis, severity,
      status, technician, resolution, resolved_at, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnostic log not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating diagnostic log:', err);
    res.status(500).json({ error: 'Failed to update diagnostic log' });
  }
});

// DELETE /:id - Delete a diagnostic log
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM diagnostic_logs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnostic log not found' });
    }
    res.json({ message: 'Diagnostic log deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting diagnostic log:', err);
    res.status(500).json({ error: 'Failed to delete diagnostic log' });
  }
});

// POST /:id/ai-diagnose - AI-powered troubleshooting and diagnosis
router.post('/:id/ai-diagnose', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the diagnostic log with equipment details
    const logResult = await pool.query(`
      SELECT dl.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM diagnostic_logs dl
      LEFT JOIN equipment e ON dl.equipment_id = e.id
      WHERE dl.id = $1
    `, [id]);

    if (logResult.rows.length === 0) {
      return res.status(404).json({ error: 'Diagnostic log not found' });
    }

    const log = logResult.rows[0];

    // Fetch past diagnostics for this equipment for context
    const historyResult = await pool.query(`
      SELECT reported_issue, symptoms, diagnosis, severity, status,
             resolution, resolved_at
      FROM diagnostic_logs
      WHERE equipment_id = $1 AND id != $2
      ORDER BY created_at DESC
      LIMIT 20
    `, [log.equipment_id, id]);

    const history = historyResult.rows;

    const systemPrompt = `You are an expert commercial kitchen equipment diagnostics AI.
Analyze reported issues and symptoms to provide comprehensive troubleshooting guidance.
Respond in JSON format with these fields:
- diagnosis: detailed diagnosis of the problem
- root_cause: most likely root cause of the issue
- troubleshooting_steps: array of step-by-step troubleshooting instructions
- parts_needed: array of parts that may need replacement (each with name and estimated_cost)
- estimated_repair_time: estimated time to complete the repair
- severity_assessment: your assessment of severity ("critical", "high", "medium", or "low")
- preventive_measures: array of recommendations to prevent recurrence
- safety_warnings: array of any safety precautions the technician should take`;

    const userPrompt = `Analyze this commercial kitchen equipment issue and provide a comprehensive diagnosis and troubleshooting guide:

Equipment: ${log.equipment_name || 'Unknown'}
Type: ${log.equipment_type || 'Unknown'}
Location: ${log.equipment_location || 'Unknown'}

Reported Issue: ${log.reported_issue || 'N/A'}
Symptoms: ${log.symptoms || 'N/A'}
Current Diagnosis: ${log.diagnosis || 'None yet'}
Severity: ${log.severity || 'Unknown'}
Technician: ${log.technician || 'Unassigned'}

Previous Diagnostic History (${history.length} records):
${history.map(h => `  - Issue: ${h.reported_issue} | Symptoms: ${h.symptoms || 'N/A'} | Diagnosis: ${h.diagnosis || 'N/A'} | Resolution: ${h.resolution || 'Unresolved'}`).join('\n')}

Provide a detailed diagnosis, root cause analysis, step-by-step troubleshooting guide, parts that may be needed, and estimated repair time.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let aiDiagnosis = null;
    if (aiResult.success) {
      try {
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        aiDiagnosis = JSON.parse(cleaned);
      } catch {
        aiDiagnosis = { raw_analysis: aiResult.response };
      }
    }

    res.json({
      diagnostic_log: log,
      diagnostic_history: history,
      ai_diagnosis: aiDiagnosis,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI diagnosis:', err);
    res.status(500).json({ error: 'Failed to generate AI diagnosis' });
  }
});

module.exports = router;
