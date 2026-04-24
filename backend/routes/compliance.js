const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all compliance records with equipment details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*, e.name AS equipment_name
      FROM compliance_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      ORDER BY cr.next_inspection ASC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching compliance records:', err);
    res.status(500).json({ error: 'Failed to fetch compliance records' });
  }
});

// GET /:id - Get a single compliance record with equipment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT cr.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM compliance_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      WHERE cr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching compliance record:', err);
    res.status(500).json({ error: 'Failed to fetch compliance record' });
  }
});

// POST / - Create a new compliance record
router.post('/', async (req, res) => {
  try {
    const {
      equipment_id, regulation_name, category, status,
      last_inspection, next_inspection, inspector, findings,
      corrective_actions, deadline, documentation_url, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO compliance_records
        (equipment_id, regulation_name, category, status,
         last_inspection, next_inspection, inspector, findings,
         corrective_actions, deadline, documentation_url, notes,
         created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      equipment_id, regulation_name, category, status || 'pending_review',
      last_inspection, next_inspection, inspector, findings,
      corrective_actions, deadline, documentation_url, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating compliance record:', err);
    res.status(500).json({ error: 'Failed to create compliance record' });
  }
});

// PUT /:id - Update a compliance record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipment_id, regulation_name, category, status,
      last_inspection, next_inspection, inspector, findings,
      corrective_actions, deadline, documentation_url, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE compliance_records
      SET equipment_id = $1, regulation_name = $2, category = $3,
          status = $4, last_inspection = $5, next_inspection = $6,
          inspector = $7, findings = $8, corrective_actions = $9,
          deadline = $10, documentation_url = $11, notes = $12,
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      equipment_id, regulation_name, category, status,
      last_inspection, next_inspection, inspector, findings,
      corrective_actions, deadline, documentation_url, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating compliance record:', err);
    res.status(500).json({ error: 'Failed to update compliance record' });
  }
});

// DELETE /:id - Delete a compliance record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM compliance_records WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    res.json({ message: 'Compliance record deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting compliance record:', err);
    res.status(500).json({ error: 'Failed to delete compliance record' });
  }
});

// POST /:id/ai-check - AI compliance gap analysis
router.post('/:id/ai-check', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the compliance record with equipment details
    const recordResult = await pool.query(`
      SELECT cr.*, e.name AS equipment_name, e.type AS equipment_type,
             e.location AS equipment_location
      FROM compliance_records cr
      LEFT JOIN equipment e ON cr.equipment_id = e.id
      WHERE cr.id = $1
    `, [id]);

    if (recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    const record = recordResult.rows[0];

    // Fetch all compliance records for this equipment for broader context
    const allRecordsResult = await pool.query(`
      SELECT regulation_name, category, status, last_inspection,
             next_inspection, inspector, findings, corrective_actions,
             deadline, notes
      FROM compliance_records
      WHERE equipment_id = $1
      ORDER BY next_inspection ASC NULLS LAST
      LIMIT 20
    `, [record.equipment_id]);

    const allRecords = allRecordsResult.rows;

    const systemPrompt = `You are an expert compliance and safety analyst for commercial kitchen equipment.
Analyze compliance records and identify gaps, risks, and required actions. Respond in JSON format with these fields:
- compliance_gaps: array of identified compliance gaps or missing requirements
- risk_assessment: overall risk level ("low", "medium", "high", or "critical")
- risk_factors: array of specific risk factors identified
- required_actions: array of actions needed to achieve full compliance, each with description and priority ("low", "medium", "high", "urgent")
- upcoming_deadlines: array of upcoming deadlines that need attention
- recommendations: array of proactive recommendations to improve compliance posture
- regulatory_notes: any relevant regulatory considerations or updates
- overall_compliance_score: estimated compliance score (0-100)`;

    const userPrompt = `Analyze the compliance and safety records for this commercial kitchen equipment and identify gaps, risks, and required actions:

Equipment: ${record.equipment_name || 'Unknown'}
Type: ${record.equipment_type || 'Unknown'}
Location: ${record.equipment_location || 'Unknown'}

Current Compliance Record:
- Regulation: ${record.regulation_name}
- Category: ${record.category}
- Status: ${record.status}
- Last Inspection: ${record.last_inspection || 'Never'}
- Next Inspection: ${record.next_inspection || 'Not scheduled'}
- Inspector: ${record.inspector || 'Not assigned'}
- Findings: ${record.findings || 'None recorded'}
- Corrective Actions: ${record.corrective_actions || 'None'}
- Deadline: ${record.deadline || 'Not set'}
- Notes: ${record.notes || 'None'}

All Compliance Records for this Equipment (${allRecords.length} records):
${allRecords.map(r => `  - ${r.regulation_name} | Category: ${r.category} | Status: ${r.status} | Last Inspection: ${r.last_inspection || 'N/A'} | Next: ${r.next_inspection || 'N/A'} | Findings: ${r.findings || 'None'}`).join('\n')}

Provide a comprehensive compliance gap analysis with risk assessment, required actions, and priority recommendations.`;

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
      record,
      all_compliance_records: allRecords,
      ai_analysis: analysis,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI compliance analysis:', err);
    res.status(500).json({ error: 'Failed to generate AI compliance analysis' });
  }
});

module.exports = router;
