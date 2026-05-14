const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all technicians with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM technicians');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT * FROM technicians ORDER BY name ASC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json({ data: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Error fetching technicians:', err);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// GET /expiring-certs - Technicians with certifications expiring in next 90 days
router.get('/expiring-certs', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 90));

    // Try technician_certifications table first; fall back to certification field on technicians
    let result, total;
    try {
      const countResult = await pool.query(`
        SELECT COUNT(*) FROM technician_certifications
        WHERE expiry_date IS NOT NULL
          AND expiry_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
      `);
      total = parseInt(countResult.rows[0].count);

      const queryResult = await pool.query(`
        SELECT tc.*, t.name AS technician_name, t.email, t.phone, t.specialization
        FROM technician_certifications tc
        LEFT JOIN technicians t ON tc.technician_id = t.id
        WHERE tc.expiry_date IS NOT NULL
          AND tc.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        ORDER BY tc.expiry_date ASC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      result = queryResult.rows;
    } catch (tableErr) {
      // Fallback: parse expiry from technicians.certification JSON or text field
      const countResult = await pool.query('SELECT COUNT(*) FROM technicians WHERE certification IS NOT NULL');
      total = parseInt(countResult.rows[0].count);

      const queryResult = await pool.query(
        'SELECT * FROM technicians WHERE certification IS NOT NULL ORDER BY name ASC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      result = queryResult.rows;
    }

    res.json({ data: result, total, page, limit, totalPages: Math.ceil(total / limit), days_window: days });
  } catch (err) {
    console.error('Error fetching expiring certifications:', err);
    res.status(500).json({ error: 'Failed to fetch expiring certifications' });
  }
});

// GET /:id - Get a single technician
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM technicians WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching technician:', err);
    res.status(500).json({ error: 'Failed to fetch technician' });
  }
});

// POST / - Create a new technician
router.post('/', async (req, res) => {
  try {
    const {
      name, email, phone, specialization, certification,
      experience_years, availability_status, current_workload,
      max_workload, hourly_rate, rating, jobs_completed, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO technicians
        (name, email, phone, specialization, certification,
         experience_years, availability_status, current_workload,
         max_workload, hourly_rate, rating, jobs_completed,
         notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [
      name, email, phone, specialization, certification,
      experience_years, availability_status || 'available',
      current_workload || 0, max_workload || 5, hourly_rate,
      rating, jobs_completed || 0, notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating technician:', err);
    res.status(500).json({ error: 'Failed to create technician' });
  }
});

// PUT /:id - Update a technician
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, specialization, certification,
      experience_years, availability_status, current_workload,
      max_workload, hourly_rate, rating, jobs_completed, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE technicians SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        phone = COALESCE($3, phone),
        specialization = COALESCE($4, specialization),
        certification = COALESCE($5, certification),
        experience_years = COALESCE($6, experience_years),
        availability_status = COALESCE($7, availability_status),
        current_workload = COALESCE($8, current_workload),
        max_workload = COALESCE($9, max_workload),
        hourly_rate = COALESCE($10, hourly_rate),
        rating = COALESCE($11, rating),
        jobs_completed = COALESCE($12, jobs_completed),
        notes = COALESCE($13, notes),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      name, email, phone, specialization, certification,
      experience_years, availability_status, current_workload,
      max_workload, hourly_rate, rating, jobs_completed,
      notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating technician:', err);
    res.status(500).json({ error: 'Failed to update technician' });
  }
});

// DELETE /:id - Delete a technician
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM technicians WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json({ message: 'Technician deleted successfully', deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting technician:', err);
    res.status(500).json({ error: 'Failed to delete technician' });
  }
});

// POST /:id/certifications - Add certification with expiry date
router.post('/:id/certifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { certification_name, issuing_body, issued_date, expiry_date, certification_number, notes } = req.body;

    if (!certification_name) return res.status(400).json({ error: 'certification_name is required' });
    if (!expiry_date) return res.status(400).json({ error: 'expiry_date is required' });

    const techResult = await pool.query('SELECT * FROM technicians WHERE id = $1', [id]);
    if (techResult.rows.length === 0) return res.status(404).json({ error: 'Technician not found' });

    // Try inserting into technician_certifications table first
    let certRecord;
    try {
      const result = await pool.query(`
        INSERT INTO technician_certifications
          (technician_id, certification_name, issuing_body, issued_date, expiry_date, certification_number, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `, [id, certification_name, issuing_body || null, issued_date || null, expiry_date, certification_number || null, notes || null]);
      certRecord = result.rows[0];
    } catch (tableErr) {
      // Fallback: update certification field on technicians table
      const tech = techResult.rows[0];
      let existingCerts = [];
      try { existingCerts = JSON.parse(tech.certification || '[]'); } catch (_) {
        existingCerts = tech.certification ? [{ name: tech.certification }] : [];
      }
      existingCerts.push({ name: certification_name, issuing_body, issued_date, expiry_date, certification_number, notes });

      const updateResult = await pool.query(
        `UPDATE technicians SET certification = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(existingCerts), id]
      );
      certRecord = { technician_id: id, certification_name, expiry_date, stored_in: 'technicians.certification' };
    }

    // Update technician's main certification field as well
    await pool.query(
      `UPDATE technicians SET certification = $1, updated_at = NOW() WHERE id = $2`,
      [certification_name, id]
    ).catch(() => {}); // non-critical

    res.status(201).json({
      technician_id: parseInt(id),
      technician_name: techResult.rows[0].name,
      certification: certRecord
    });
  } catch (err) {
    console.error('Error adding certification:', err);
    res.status(500).json({ error: 'Failed to add certification' });
  }
});

// POST /:id/ai-schedule - AI optimal scheduling for a technician
router.post('/:id/ai-schedule', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the technician
    const techResult = await pool.query(
      'SELECT * FROM technicians WHERE id = $1',
      [id]
    );

    if (techResult.rows.length === 0) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    const technician = techResult.rows[0];

    // Fetch all technicians for workload comparison
    const allTechResult = await pool.query(`
      SELECT name, specialization, availability_status, current_workload,
             max_workload, hourly_rate, rating, jobs_completed
      FROM technicians
      ORDER BY current_workload ASC
    `);

    // Fetch pending work orders for scheduling context
    const workOrdersResult = await pool.query(`
      SELECT wo.*, e.name AS equipment_name, e.type AS equipment_type
      FROM work_orders wo
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.status IN ('pending', 'scheduled')
      ORDER BY wo.priority DESC, wo.created_at ASC
    `);

    // Fetch pending maintenance schedules
    const maintenanceResult = await pool.query(`
      SELECT ms.*, e.name AS equipment_name, e.type AS equipment_type
      FROM maintenance_schedules ms
      LEFT JOIN equipment e ON ms.equipment_id = e.id
      WHERE ms.status IN ('scheduled', 'overdue')
      ORDER BY ms.next_due ASC
    `);

    const systemPrompt = `You are an expert workforce scheduling AI for commercial kitchen equipment maintenance.
Analyze technician skills, workload, and pending tasks to suggest optimal assignments. Respond in JSON format:
{
  "recommended_assignments": [
    {
      "task_description": "string",
      "task_type": "work_order | maintenance",
      "priority": "critical | high | medium | low",
      "estimated_duration": "string",
      "reasoning": "string explaining why this technician is ideal for this task"
    }
  ],
  "workload_assessment": {
    "current_utilization": "percentage",
    "capacity_remaining": "string",
    "overload_risk": "low | medium | high"
  },
  "schedule_optimization": [
    "array of scheduling suggestions to maximize efficiency"
  ],
  "skill_gap_analysis": "string identifying any skill gaps or training needs",
  "team_rebalancing": ["suggestions for redistributing work across the team"]
}`;

    const userPrompt = `Analyze the following technician and pending tasks, then suggest optimal task assignments:

Technician Profile:
- Name: ${technician.name}
- Specialization: ${technician.specialization || 'General'}
- Certification: ${technician.certification || 'None listed'}
- Experience: ${technician.experience_years || 0} years
- Availability: ${technician.availability_status}
- Current Workload: ${technician.current_workload} / ${technician.max_workload}
- Hourly Rate: $${technician.hourly_rate || 'N/A'}
- Rating: ${technician.rating || 'N/A'} / 5.00
- Jobs Completed: ${technician.jobs_completed || 0}

Team Overview (all technicians):
${JSON.stringify(allTechResult.rows, null, 2)}

Pending Work Orders (${workOrdersResult.rows.length}):
${JSON.stringify(workOrdersResult.rows.slice(0, 15).map(wo => ({
  id: wo.id,
  equipment: wo.equipment_name,
  equipment_type: wo.equipment_type,
  title: wo.title,
  description: wo.description,
  priority: wo.priority,
  status: wo.status
})), null, 2)}

Upcoming Maintenance (${maintenanceResult.rows.length}):
${JSON.stringify(maintenanceResult.rows.slice(0, 15).map(ms => ({
  id: ms.id,
  equipment: ms.equipment_name,
  equipment_type: ms.equipment_type,
  task: ms.task_name,
  frequency: ms.frequency,
  priority: ms.priority,
  next_due: ms.next_due,
  status: ms.status
})), null, 2)}

Suggest the best task assignments for this technician based on their skills, current workload, and pending tasks. Also provide team-level rebalancing recommendations.`;

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
      technician: {
        id: technician.id,
        name: technician.name,
        specialization: technician.specialization,
        availability_status: technician.availability_status,
        current_workload: technician.current_workload,
        max_workload: technician.max_workload
      },
      pending_tasks: {
        work_orders: workOrdersResult.rows.length,
        maintenance_schedules: maintenanceResult.rows.length
      },
      ai_schedule: analysis,
      ai_metadata: {
        success: aiResult.success,
        model: aiResult.model,
        usage: aiResult.usage
      }
    });
  } catch (err) {
    console.error('Error generating AI schedule:', err);
    res.status(500).json({ error: 'Failed to generate AI schedule' });
  }
});

module.exports = router;
