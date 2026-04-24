const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// GET / - List all technicians
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM technicians ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching technicians:', err);
    res.status(500).json({ error: 'Failed to fetch technicians' });
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
