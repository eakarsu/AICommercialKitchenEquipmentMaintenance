const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all equipment
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM equipment ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching equipment:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// GET /:id - Get one equipment item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching equipment:', err);
    res.status(500).json({ error: 'Failed to fetch equipment' });
  }
});

// POST / - Create new equipment
router.post('/', async (req, res) => {
  try {
    const {
      name, type, manufacturer, model, serial_number,
      location, status, purchase_date, warranty_expiry,
      last_maintenance, next_maintenance, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO equipment
        (name, type, manufacturer, model, serial_number,
         location, status, purchase_date, warranty_expiry,
         last_maintenance, next_maintenance, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING *`,
      [
        name, type, manufacturer, model, serial_number,
        location, status || 'operational', purchase_date, warranty_expiry,
        last_maintenance, next_maintenance, notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating equipment:', err);
    res.status(500).json({ error: 'Failed to create equipment' });
  }
});

// PUT /:id - Update equipment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, type, manufacturer, model, serial_number,
      location, status, purchase_date, warranty_expiry,
      last_maintenance, next_maintenance, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE equipment SET
        name = $1, type = $2, manufacturer = $3, model = $4, serial_number = $5,
        location = $6, status = $7, purchase_date = $8, warranty_expiry = $9,
        last_maintenance = $10, next_maintenance = $11, notes = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name, type, manufacturer, model, serial_number,
        location, status, purchase_date, warranty_expiry,
        last_maintenance, next_maintenance, notes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating equipment:', err);
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

// DELETE /:id - Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM equipment WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }
    res.json({ message: 'Equipment deleted successfully', equipment: result.rows[0] });
  } catch (err) {
    console.error('Error deleting equipment:', err);
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

// POST /:id/ai-analyze - AI analysis of equipment health
router.post('/:id/ai-analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const equipment = result.rows[0];

    const systemPrompt = `You are an expert commercial kitchen equipment maintenance analyst.
Analyze the provided equipment data and return a JSON response with the following structure:
{
  "health_score": <number 1-100>,
  "health_status": "<good|fair|poor|critical>",
  "risk_factors": ["<list of identified risk factors>"],
  "maintenance_recommendations": ["<list of actionable maintenance recommendations>"],
  "estimated_remaining_life": "<estimated remaining useful life>",
  "priority": "<low|medium|high|urgent>",
  "summary": "<brief overall assessment>"
}
Base your analysis on the equipment type, age, maintenance history, current status, and warranty information. Be specific and practical in your recommendations for commercial kitchen environments.`;

    const now = new Date().toISOString();
    const userPrompt = `Analyze this commercial kitchen equipment:
- Name: ${equipment.name}
- Type: ${equipment.type}
- Manufacturer: ${equipment.manufacturer}
- Model: ${equipment.model}
- Serial Number: ${equipment.serial_number}
- Location: ${equipment.location}
- Current Status: ${equipment.status}
- Purchase Date: ${equipment.purchase_date || 'Unknown'}
- Warranty Expiry: ${equipment.warranty_expiry || 'Unknown'}
- Last Maintenance: ${equipment.last_maintenance || 'No record'}
- Next Scheduled Maintenance: ${equipment.next_maintenance || 'Not scheduled'}
- Notes: ${equipment.notes || 'None'}
- Current Date: ${now}

Provide a thorough health assessment with risk factors and maintenance recommendations.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);

    let analysis = null;
    if (aiResult.success) {
      try {
        // Try to parse the AI response as JSON
        const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysis = JSON.parse(cleaned);
      } catch {
        // If parsing fails, return the raw text in a structured format
        analysis = {
          raw_response: aiResult.response,
          parse_error: true
        };
      }
    }

    res.json({
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      ai_success: aiResult.success,
      analysis: analysis,
      model_used: aiResult.model,
      usage: aiResult.usage,
      analyzed_at: now
    });
  } catch (err) {
    console.error('Error analyzing equipment:', err);
    res.status(500).json({ error: 'Failed to analyze equipment' });
  }
});

module.exports = router;
