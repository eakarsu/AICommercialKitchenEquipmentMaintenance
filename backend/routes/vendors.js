const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET / - List all vendors
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendors ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /:id - Get a single vendor
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching vendor:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST / - Create a new vendor
router.post('/', async (req, res) => {
  try {
    const {
      name, contact_person, email, phone, address, specialization,
      rating, total_orders, on_time_delivery_rate, average_response_time,
      contract_status, contract_start, contract_end, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vendor name is required.' });
    }

    const result = await pool.query(
      `INSERT INTO vendors
        (name, contact_person, email, phone, address, specialization,
         rating, total_orders, on_time_delivery_rate, average_response_time,
         contract_status, contract_start, contract_end, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        name, contact_person, email, phone, address, specialization,
        rating, total_orders || 0, on_time_delivery_rate, average_response_time,
        contract_status || 'pending', contract_start, contract_end, notes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating vendor:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /:id - Update a vendor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, contact_person, email, phone, address, specialization,
      rating, total_orders, on_time_delivery_rate, average_response_time,
      contract_status, contract_start, contract_end, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vendors SET
        name = COALESCE($1, name),
        contact_person = COALESCE($2, contact_person),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        specialization = COALESCE($6, specialization),
        rating = COALESCE($7, rating),
        total_orders = COALESCE($8, total_orders),
        on_time_delivery_rate = COALESCE($9, on_time_delivery_rate),
        average_response_time = COALESCE($10, average_response_time),
        contract_status = COALESCE($11, contract_status),
        contract_start = COALESCE($12, contract_start),
        contract_end = COALESCE($13, contract_end),
        notes = COALESCE($14, notes),
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        name, contact_person, email, phone, address, specialization,
        rating, total_orders, on_time_delivery_rate, average_response_time,
        contract_status, contract_start, contract_end, notes, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating vendor:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /:id - Delete a vendor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM vendors WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    res.json({ message: 'Vendor deleted successfully.', vendor: result.rows[0] });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /:id/ai-evaluate - AI vendor performance scoring
router.post('/:id/ai-evaluate', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the vendor
    const vendorResult = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found.' });
    }

    const vendor = vendorResult.rows[0];

    // Fetch all vendors with the same specialization for benchmarking
    const benchmarkResult = await pool.query(
      'SELECT name, rating, total_orders, on_time_delivery_rate, average_response_time, contract_status FROM vendors WHERE specialization = $1',
      [vendor.specialization]
    );

    const systemPrompt = `You are an AI vendor performance analyst for a commercial kitchen equipment maintenance operation.
Evaluate vendor performance data and provide a comprehensive scoring and assessment.
Respond in JSON format with the following structure:
{
  "performance_score": number (0-100),
  "rating_breakdown": {
    "reliability": number (0-100),
    "responsiveness": number (0-100),
    "cost_effectiveness": number (0-100),
    "quality": number (0-100)
  },
  "strengths": ["array of identified strengths"],
  "weaknesses": ["array of identified weaknesses"],
  "risk_assessment": {
    "level": "low" | "medium" | "high" | "critical",
    "factors": ["array of risk factors"]
  },
  "recommendation": "detailed recommendation string",
  "contract_advice": "advice regarding contract renewal or changes"
}`;

    const userPrompt = `Evaluate the following vendor's performance and provide a comprehensive assessment:

Vendor Details:
- Name: ${vendor.name}
- Contact Person: ${vendor.contact_person || 'N/A'}
- Email: ${vendor.email || 'N/A'}
- Specialization: ${vendor.specialization || 'General'}
- Rating: ${vendor.rating || 'Not rated'}/5.00
- Total Orders: ${vendor.total_orders || 0}
- On-Time Delivery Rate: ${vendor.on_time_delivery_rate || 'N/A'}%
- Average Response Time: ${vendor.average_response_time || 'N/A'}
- Contract Status: ${vendor.contract_status || 'N/A'}
- Contract Start: ${vendor.contract_start || 'N/A'}
- Contract End: ${vendor.contract_end || 'N/A'}
- Notes: ${vendor.notes || 'None'}

Benchmark Data (other vendors in same specialization):
${JSON.stringify(benchmarkResult.rows, null, 2)}

Please analyze this vendor's performance relative to peers, assess reliability and risk, and provide a detailed recommendation on whether to continue, renegotiate, or terminate the relationship.`;

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
      vendor: {
        id: vendor.id,
        name: vendor.name,
        specialization: vendor.specialization,
        rating: vendor.rating,
        total_orders: vendor.total_orders,
        on_time_delivery_rate: vendor.on_time_delivery_rate,
        contract_status: vendor.contract_status
      },
      ai_analysis: analysis,
      raw_response: aiResult.response,
      model: aiResult.model,
      success: aiResult.success
    });
  } catch (err) {
    console.error('Error in AI vendor evaluation:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
