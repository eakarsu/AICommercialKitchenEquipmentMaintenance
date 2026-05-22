const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

function parseAIJson(response) {
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}
  return { raw_response: response };
}

// POST /api/ai/failure-mode-analysis
// Body: { equipment_type, failure_description, maintenance_history }
// Returns: FMEA (Failure Mode and Effects Analysis)
router.post('/failure-mode-analysis', rateLimiter, async (req, res) => {
  try {
    const { equipment_type, failure_description, maintenance_history } = req.body;

    if (!equipment_type) return res.status(400).json({ error: 'equipment_type is required' });
    if (!failure_description) return res.status(400).json({ error: 'failure_description is required' });

    // Fetch recent failures for similar equipment from DB for additional context
    let similarFailures = [];
    try {
      const result = await pool.query(`
        SELECT wo.title, wo.description, wo.priority, wo.status, wo.created_at,
               e.name AS equipment_name, e.type AS equipment_type
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE LOWER(e.type) LIKE LOWER($1)
           OR LOWER(wo.description) LIKE LOWER($2)
        ORDER BY wo.created_at DESC
        LIMIT 20
      `, [`%${equipment_type}%`, `%${failure_description.split(' ').slice(0, 3).join('%')}%`]);
      similarFailures = result.rows;
    } catch (_) {}

    const systemPrompt = `You are an expert commercial kitchen equipment maintenance engineer specializing in Failure Mode and Effects Analysis (FMEA). Provide comprehensive, actionable FMEA reports based on equipment failure data. Return valid JSON only.`;

    const userPrompt = `Perform a Failure Mode and Effects Analysis (FMEA) for the following commercial kitchen equipment failure.

Equipment Type: ${equipment_type}
Failure Description: ${failure_description}
Maintenance History Provided: ${JSON.stringify(maintenance_history || [], null, 2)}

Similar Historical Failures from Database (${similarFailures.length} records):
${JSON.stringify(similarFailures.slice(0, 10).map(f => ({
  title: f.title,
  description: f.description,
  priority: f.priority,
  equipment: f.equipment_name,
  date: f.created_at
})), null, 2)}

Return a JSON object with:
- fmea_summary (object with: equipment_type, failure_mode, severity: 1-10, occurrence_probability: 1-10, detectability: 1-10, rpn: (severity * occurrence * detectability))
- failure_modes (array of {
    mode, potential_effect, severity (1-10), potential_cause, occurrence (1-10),
    current_controls, detectability (1-10), rpn, recommended_actions, priority: "critical"|"high"|"medium"|"low"
  })
- root_cause_analysis (object with: primary_causes, contributing_factors, systemic_issues)
- corrective_actions (array of {action, responsible_party, target_date_days, estimated_cost, effectiveness_rating})
- preventive_measures (array of {measure, frequency, expected_risk_reduction_percent})
- food_safety_impact (object with: haccp_concern, contamination_risk, regulatory_implications)
- parts_likely_needed (array of {part_name, part_category, urgency})
- estimated_repair_cost_range (object with: min_usd, max_usd, labor_hours)
- executive_summary (string)`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    const analysis = aiResult.success ? parseAIJson(aiResult.response) : { raw_response: aiResult.response };

    res.json({
      input: { equipment_type, failure_description },
      similar_failures_found: similarFailures.length,
      fmea_analysis: analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating FMEA:', err);
    res.status(500).json({ error: 'Failed to generate failure mode analysis' });
  }
});

// POST /api/ai/parts-obsolescence
// Body: { parts_list: [{ part_number, name, category, manufacturer, year_introduced }] }
// Returns: end-of-life identification, alternative part numbers
router.post('/parts-obsolescence', rateLimiter, async (req, res) => {
  try {
    const { parts_list } = req.body;

    if (!Array.isArray(parts_list) || parts_list.length === 0) {
      return res.status(400).json({ error: 'parts_list must be a non-empty array' });
    }

    // Enrich with current DB inventory data
    const enrichedParts = [];
    for (const p of parts_list) {
      let dbData = {};
      if (p.part_number || p.id) {
        try {
          const q = p.id
            ? await pool.query('SELECT * FROM parts_inventory WHERE id = $1', [p.id])
            : await pool.query('SELECT * FROM parts_inventory WHERE part_number = $1', [p.part_number]);
          if (q.rows.length > 0) dbData = q.rows[0];
        } catch (_) {}
      }
      enrichedParts.push({ ...p, ...dbData });
    }

    const systemPrompt = `You are an expert commercial kitchen equipment parts specialist with deep knowledge of parts lifecycles, OEM databases, and aftermarket alternatives. Identify obsolete or end-of-life parts and provide alternative part numbers. Return valid JSON only.`;

    const userPrompt = `Analyze the following parts list for obsolescence risks and provide alternative part numbers and sourcing recommendations.

Parts to Analyze (${enrichedParts.length} items):
${JSON.stringify(enrichedParts, null, 2)}

Return a JSON object with:
- obsolescence_summary (object with: total_analyzed, critical_count, at_risk_count, safe_count)
- parts_analysis (array of {
    part_number, name, manufacturer,
    obsolescence_status: "obsolete"|"end_of_life"|"at_risk"|"active"|"unknown",
    end_of_life_date_estimated,
    confidence: "high"|"medium"|"low",
    risk_level: "critical"|"high"|"medium"|"low",
    alternative_parts: [{
      part_number, manufacturer, compatibility_rating: "direct_replacement"|"compatible"|"modified_fit",
      estimated_cost_usd, availability: "in_stock"|"special_order"|"limited",
      notes
    }],
    recommended_action: string,
    urgency: "immediate"|"within_3mo"|"within_year"|"monitor"
  })
- procurement_recommendations (array of {action, parts_affected, priority})
- total_inventory_risk_value_usd (estimated value of at-risk inventory)
- executive_summary (string)`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    const analysis = aiResult.success ? parseAIJson(aiResult.response) : { raw_response: aiResult.response };

    res.json({
      parts_analyzed: enrichedParts.length,
      obsolescence_analysis: analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating parts obsolescence analysis:', err);
    res.status(500).json({ error: 'Failed to generate parts obsolescence analysis' });
  }
});

// POST /api/ai/compliance-check
// Body: { equipment_id }
// Fetches equipment from DB, checks NSF/ANSI, HACCP requirements
router.post('/compliance-check', rateLimiter, async (req, res) => {
  try {
    const { equipment_id } = req.body;
    if (!equipment_id) return res.status(400).json({ error: 'equipment_id is required' });

    // Fetch equipment from DB
    const equipResult = await pool.query(`
      SELECT e.*
      FROM equipment e
      WHERE e.id = $1
    `, [equipment_id]);

    if (equipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const equipment = equipResult.rows[0];

    // Fetch maintenance history for compliance context
    let maintenanceHistory = [];
    try {
      const mhResult = await pool.query(`
        SELECT ms.task_name, ms.frequency, ms.last_completed, ms.next_due, ms.status, ms.priority
        FROM maintenance_schedules ms
        WHERE ms.equipment_id = $1
        ORDER BY ms.next_due ASC
        LIMIT 20
      `, [equipment_id]);
      maintenanceHistory = mhResult.rows;
    } catch (_) {}

    // Fetch recent work orders for compliance audit trail
    let recentWorkOrders = [];
    try {
      const woResult = await pool.query(`
        SELECT title, description, status, priority, completed_date, created_at
        FROM work_orders
        WHERE equipment_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [equipment_id]);
      recentWorkOrders = woResult.rows;
    } catch (_) {}

    // Fetch energy logs for compliance metrics
    let energyData = [];
    try {
      const elResult = await pool.query(`
        SELECT reading_date, energy_consumption, efficiency_rating, temperature_setting, anomaly_detected
        FROM energy_logs
        WHERE equipment_id = $1
        ORDER BY reading_date DESC
        LIMIT 10
      `, [equipment_id]);
      energyData = elResult.rows;
    } catch (_) {}

    const systemPrompt = `You are an expert in commercial kitchen equipment regulatory compliance, specializing in NSF/ANSI standards, HACCP (Hazard Analysis and Critical Control Points), FDA food safety regulations, and local health code requirements. Provide comprehensive compliance assessments. Return valid JSON only.`;

    const userPrompt = `Perform a comprehensive compliance check for the following commercial kitchen equipment against NSF/ANSI standards, HACCP requirements, and FDA food safety regulations.

Equipment Details:
${JSON.stringify(equipment, null, 2)}

Maintenance Schedule (${maintenanceHistory.length} tasks):
${JSON.stringify(maintenanceHistory, null, 2)}

Recent Work Orders (${recentWorkOrders.length} records):
${JSON.stringify(recentWorkOrders, null, 2)}

Energy/Temperature Data (${energyData.length} records):
${JSON.stringify(energyData, null, 2)}

Return a JSON object with:
- overall_compliance_status: "compliant"|"minor_issues"|"major_issues"|"non_compliant"
- compliance_score (0-100)
- applicable_standards (array of standard names relevant to this equipment type)
- nsf_ansi_compliance (object with: {
    applicable_standards: [standard numbers], status: "compliant"|"review_needed"|"non_compliant",
    issues: [], recommendations: []
  })
- haccp_compliance (object with: {
    critical_control_points: [], ccp_status: "adequate"|"gaps_found", issues: [], recommendations: []
  })
- fda_compliance (object with: { status, issues: [], recommendations: [] })
- temperature_compliance (object with: required_ranges, current_status, issues_found)
- maintenance_compliance (object with: {
    required_frequency, current_status: "on_schedule"|"overdue"|"unknown", overdue_tasks: [], issues: []
  })
- violations (array of { standard, violation, severity: "critical"|"major"|"minor", corrective_action, deadline_days })
- inspection_readiness (object with: { ready_for_inspection: bool, preparation_steps: [], estimated_prep_days })
- documentation_requirements (array of { document, current_status: "available"|"missing"|"outdated", action_required })
- executive_summary (string)`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    const analysis = aiResult.success ? parseAIJson(aiResult.response) : { raw_response: aiResult.response };

    res.json({
      equipment,
      maintenance_history: maintenanceHistory,
      recent_work_orders: recentWorkOrders,
      energy_data: energyData,
      compliance_assessment: analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error generating compliance check:', err);
    res.status(500).json({ error: 'Failed to generate compliance check' });
  }
});

// POST /api/ai/work-order-summarizer
// Body: { date_range, status_filter }
// Returns: rolled-up narrative + KPIs across recent work orders
router.post('/work-order-summarizer', rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { date_range, status_filter } = req.body || {};

    let woRows = [];
    try {
      const params = [];
      const where = [];
      if (status_filter) { params.push(status_filter); where.push(`wo.status = $${params.length}`); }
      const sql = `
        SELECT wo.id, wo.title, wo.description, wo.status, wo.priority, wo.cost,
               wo.created_at, wo.completed_date,
               e.name AS equipment_name, e.type AS equipment_type
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY wo.created_at DESC LIMIT 200
      `;
      const result = await pool.query(sql, params);
      woRows = result.rows;
    } catch (_) {}

    const total = woRows.length;
    const byStatus = woRows.reduce((acc, w) => {
      const k = w.status || 'unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const totalCost = woRows.reduce((s, w) => s + (Number(w.cost) || 0), 0);

    const systemPrompt = `You are an operations analyst summarizing commercial kitchen work-order activity. Return valid JSON only.`;
    const userPrompt = `Summarize the following work-order set.

Range: ${date_range ? JSON.stringify(date_range) : 'recent 200'}
Status filter: ${status_filter || 'none'}

Aggregate counts by status: ${JSON.stringify(byStatus)}
Total cost recorded: $${totalCost.toFixed(2)}

Sample (up to 50):
${JSON.stringify(woRows.slice(0, 50), null, 2)}

Return JSON with:
- executive_summary (string)
- kpis: { total_orders, completed_pct, average_cost, top_priority_count }
- top_issues: array of { issue, frequency, equipment_types, suggested_action }
- trend_signals: array of strings
- recommendations: array of { action, priority, expected_impact }`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    const analysis = aiResult.success ? parseAIJson(aiResult.response) : { raw_response: aiResult.response };
    res.json({
      total_orders: total,
      by_status: byStatus,
      total_cost: totalCost,
      analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in work-order-summarizer:', err);
    res.status(500).json({ error: 'Failed to summarize work orders' });
  }
});

// POST /api/ai/vendor-selection-advisor
// Body: { equipment_type, scope_of_work, budget_ceiling }
// Returns: ranked vendor recommendations using local vendors table
router.post('/vendor-selection-advisor', rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
      return res.status(503).json({ error: 'OpenRouter API key not configured' });
    }
    const { equipment_type, scope_of_work, budget_ceiling } = req.body || {};
    if (!scope_of_work) return res.status(400).json({ error: 'scope_of_work is required' });

    let vendors = [];
    try {
      const result = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC LIMIT 100');
      vendors = result.rows;
    } catch (_) {}

    const systemPrompt = `You are a procurement advisor for commercial kitchen maintenance. Rank vendors based on suitability for the requested scope. Return valid JSON only.`;
    const userPrompt = `Recommend a shortlist of vendors.

Equipment type: ${equipment_type || 'unspecified'}
Scope of work: ${scope_of_work}
Budget ceiling: ${budget_ceiling || 'unspecified'}

Vendor pool (${vendors.length}):
${JSON.stringify(vendors.slice(0, 40), null, 2)}

Return JSON with:
- shortlist: array of { vendor_id, vendor_name, fit_score (0-100), strengths, concerns }
- selection_criteria_used: array of strings
- negotiation_tips: array of strings
- red_flags: array of { vendor_name, issue }
- final_recommendation (string)`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    const analysis = aiResult.success ? parseAIJson(aiResult.response) : { raw_response: aiResult.response };
    res.json({
      vendor_pool_size: vendors.length,
      analysis,
      ai_metadata: { success: aiResult.success, model: aiResult.model, usage: aiResult.usage },
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in vendor-selection-advisor:', err);
    res.status(500).json({ error: 'Failed to run vendor selection advisor' });
  }
});

router.post('/parts-triage', rateLimiter, async (req, res) => {
  const body = req.body || {};
  const downtime = Number(body.downtime_hours || 0);
  const partOnHand = Boolean(body.part_on_hand);
  const rush = Boolean(body.rush_shipping_available);
  const priority = downtime >= 8 || !partOnHand ? 'urgent' : 'standard';
  res.json({
    equipment_type: body.equipment_type || 'equipment',
    symptom: body.symptom || 'symptom not specified',
    priority,
    recommended_part_action: partOnHand ? 'Reserve on-hand part and assign technician.' : rush ? 'Create rush supplier order and schedule provisional visit.' : 'Source substitute supplier and notify operations of downtime risk.',
    technician_notes: [
      'Verify model and serial before dispatch.',
      'Bring universal gasket, sensor harness, and manufacturer service sheet when applicable.',
      downtime >= 8 ? 'Escalate customer ETA communication.' : 'Keep standard service window.',
    ],
    generated_at: new Date().toISOString(),
  });
});

module.exports = router;
