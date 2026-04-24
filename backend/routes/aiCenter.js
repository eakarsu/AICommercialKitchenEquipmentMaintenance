const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { queryAI } = require('../openrouter');

// Apply auth middleware to all routes
router.use(auth);

// Helper: parse AI JSON response, fall back to raw text
function parseAIResponse(aiResult) {
  let parsed = aiResult.response;
  if (aiResult.success) {
    try {
      const cleaned = aiResult.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = aiResult.response;
    }
  }
  return {
    success: aiResult.success,
    response: parsed,
    model: aiResult.model,
    usage: aiResult.usage
  };
}

// POST /diagnostic-assistant - AI diagnostic assistant
router.post('/diagnostic-assistant', async (req, res) => {
  try {
    const { query, equipment_type, symptoms } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const systemPrompt = `You are an expert commercial kitchen equipment diagnostic AI assistant with deep knowledge of all major brands and models of commercial kitchen equipment including ovens, fryers, refrigerators, dishwashers, steam tables, grills, ice machines, ventilation hoods, and more.

Your role is to help kitchen maintenance technicians and managers diagnose equipment problems quickly and accurately. You provide:
- Precise diagnoses based on reported symptoms
- Step-by-step troubleshooting procedures following industry best practices
- Identification of parts likely needed for repair with common part numbers when possible
- Safety warnings relevant to the specific equipment and issue (electrical hazards, gas leaks, refrigerant handling, burn risks, etc.)
- Estimated repair difficulty and time

Always prioritize safety. If a situation could be dangerous (gas leaks, electrical faults, refrigerant issues), lead with safety warnings. Consider food safety implications of equipment failures.

Respond in JSON format with these fields:
- diagnosis: detailed diagnosis of the likely problem
- confidence: your confidence level ("high", "medium", "low")
- troubleshooting_steps: array of step-by-step troubleshooting instructions
- parts_needed: array of objects with { name, estimated_cost, priority }
- safety_warnings: array of safety warnings relevant to this issue
- estimated_repair_time: estimated time to complete the repair
- when_to_call_professional: guidance on when to escalate to a certified technician`;

    const userPrompt = `Diagnose the following commercial kitchen equipment issue:

Equipment Type: ${equipment_type || 'Not specified'}
Symptoms: ${symptoms || 'Not specified'}

Technician's Query: ${query}

Provide a comprehensive diagnosis with troubleshooting steps, parts that may be needed, and any safety warnings.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in diagnostic assistant:', err);
    res.status(500).json({ error: 'Failed to run diagnostic assistant' });
  }
});

// POST /predictive-analytics - AI predictive analytics
router.post('/predictive-analytics', async (req, res) => {
  try {
    const { equipment_ids } = req.body;

    // Fetch equipment data
    let equipmentQuery = 'SELECT * FROM equipment ORDER BY created_at DESC';
    let equipmentParams = [];
    if (equipment_ids && equipment_ids.length > 0) {
      equipmentQuery = 'SELECT * FROM equipment WHERE id = ANY($1) ORDER BY created_at DESC';
      equipmentParams = [equipment_ids];
    }
    const equipmentResult = await pool.query(equipmentQuery, equipmentParams);

    // Fetch recent maintenance records
    let maintenanceQuery = `
      SELECT wo.*, e.name AS equipment_name, e.type AS equipment_type
      FROM work_orders wo
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      ORDER BY wo.created_at DESC
      LIMIT 200
    `;
    let maintenanceParams = [];
    if (equipment_ids && equipment_ids.length > 0) {
      maintenanceQuery = `
        SELECT wo.*, e.name AS equipment_name, e.type AS equipment_type
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        WHERE wo.equipment_id = ANY($1)
        ORDER BY wo.created_at DESC
        LIMIT 200
      `;
      maintenanceParams = [equipment_ids];
    }
    const maintenanceResult = await pool.query(maintenanceQuery, maintenanceParams);

    const systemPrompt = `You are an advanced predictive analytics AI specializing in commercial kitchen equipment fleet management. You analyze equipment data, maintenance histories, and operational patterns to predict failures before they happen.

Your expertise includes:
- Failure pattern recognition across all types of commercial kitchen equipment
- Lifecycle analysis for ovens, fryers, refrigeration units, dishwashers, ice machines, ventilation systems, and more
- Maintenance scheduling optimization to minimize downtime during peak service hours
- Budget forecasting for parts, labor, and equipment replacement
- Risk scoring based on equipment age, usage patterns, and maintenance history

Analyze the provided fleet data and respond in JSON format with:
- failure_predictions: array of { equipment_name, risk_level, predicted_issue, estimated_timeframe, recommended_action }
- maintenance_priorities: array of { equipment_name, priority, reason, recommended_date }
- budget_forecast: { next_30_days, next_90_days, next_12_months } with estimated costs
- fleet_health_score: overall fleet health score 0-100
- critical_alerts: array of any immediate concerns requiring urgent attention
- optimization_suggestions: array of suggestions to improve fleet reliability`;

    const userPrompt = `Analyze the following commercial kitchen equipment fleet data and provide predictive maintenance insights:

Equipment Fleet (${equipmentResult.rows.length} units):
${equipmentResult.rows.map(e => `- ${e.name} (${e.type || 'Unknown type'}) | Status: ${e.status || 'Unknown'} | Location: ${e.location || 'N/A'} | Installed: ${e.install_date || 'Unknown'}`).join('\n')}

Recent Maintenance History (${maintenanceResult.rows.length} records):
${maintenanceResult.rows.slice(0, 50).map(m => `- ${m.equipment_name || 'Unknown'}: ${m.title || m.description || 'N/A'} | Status: ${m.status || 'Unknown'} | Priority: ${m.priority || 'N/A'} | Created: ${m.created_at || 'Unknown'}`).join('\n')}

Provide fleet-wide predictive analysis including failure predictions, maintenance priorities, and budget forecasts.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in predictive analytics:', err);
    res.status(500).json({ error: 'Failed to run predictive analytics' });
  }
});

// POST /cost-optimizer - AI cost optimizer
router.post('/cost-optimizer', async (req, res) => {
  try {
    const { timeframe } = req.body;

    let costQuery = 'SELECT * FROM cost_records ORDER BY created_at DESC LIMIT 500';
    const costResult = await pool.query(costQuery);

    // Also fetch work orders for labor cost context
    const workOrderResult = await pool.query(`
      SELECT wo.*, e.name AS equipment_name, e.type AS equipment_type
      FROM work_orders wo
      LEFT JOIN equipment e ON wo.equipment_id = e.id
      ORDER BY wo.created_at DESC
      LIMIT 200
    `);

    const systemPrompt = `You are an expert cost optimization AI for commercial kitchen equipment maintenance operations. You analyze spending patterns, identify waste, and recommend strategies to reduce costs while maintaining equipment reliability and food safety compliance.

Your expertise includes:
- Maintenance cost benchmarking against industry standards for commercial kitchens
- Repair vs. replace decision analysis for major equipment (considering ROI, downtime costs, energy efficiency)
- Vendor and parts procurement optimization
- Preventive maintenance ROI calculations
- Labor cost optimization and technician scheduling efficiency
- Energy cost reduction through equipment maintenance and upgrades
- Warranty and service contract analysis

Analyze the provided cost data and respond in JSON format with:
- cost_reduction_strategies: array of { strategy, estimated_savings, implementation_effort, timeframe }
- budget_recommendations: { monthly_budget, emergency_fund, capital_replacement_fund } with justifications
- roi_analysis: array of { investment, cost, expected_return, payback_period }
- spending_insights: { total_spend, top_cost_categories, cost_trends, anomalies }
- vendor_recommendations: suggestions for procurement optimization
- quick_wins: array of immediately actionable cost savings`;

    const userPrompt = `Analyze the following commercial kitchen maintenance cost data and provide optimization recommendations:

Timeframe: ${timeframe || 'All available data'}

Cost Records (${costResult.rows.length} entries):
${costResult.rows.slice(0, 100).map(c => `- ${c.description || 'N/A'} | Amount: $${c.amount || 0} | Category: ${c.category || 'N/A'} | Date: ${c.created_at || 'Unknown'}`).join('\n')}

Work Order Context (${workOrderResult.rows.length} orders):
${workOrderResult.rows.slice(0, 50).map(w => `- ${w.equipment_name || 'Unknown'} (${w.equipment_type || 'N/A'}): ${w.title || w.description || 'N/A'} | Status: ${w.status || 'Unknown'} | Cost: $${w.cost || 0}`).join('\n')}

Provide detailed cost reduction strategies, budget recommendations, and ROI analysis.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in cost optimizer:', err);
    res.status(500).json({ error: 'Failed to run cost optimizer' });
  }
});

// POST /compliance-checker - AI compliance checker
router.post('/compliance-checker', async (req, res) => {
  try {
    const { equipment_id } = req.body;

    let complianceQuery = 'SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 500';
    let complianceParams = [];
    if (equipment_id) {
      complianceQuery = 'SELECT * FROM compliance_records WHERE equipment_id = $1 ORDER BY created_at DESC LIMIT 500';
      complianceParams = [equipment_id];
    }
    const complianceResult = await pool.query(complianceQuery, complianceParams);

    // Fetch equipment details for context
    let equipmentQuery = 'SELECT * FROM equipment ORDER BY created_at DESC';
    let equipmentParams = [];
    if (equipment_id) {
      equipmentQuery = 'SELECT * FROM equipment WHERE id = $1';
      equipmentParams = [equipment_id];
    }
    const equipmentResult = await pool.query(equipmentQuery, equipmentParams);

    const systemPrompt = `You are an expert compliance and regulatory AI for commercial kitchen equipment operations. You have comprehensive knowledge of:

- FDA Food Code requirements for equipment maintenance and sanitation
- OSHA workplace safety standards for commercial kitchens
- NSF/ANSI standards for commercial kitchen equipment
- Local health department inspection requirements
- Fire safety codes (NFPA 96) for cooking equipment and ventilation
- EPA regulations for refrigerant handling and disposal
- ADA compliance for kitchen equipment accessibility
- Gas equipment safety codes and certifications
- Electrical safety standards (NEC/NFPA 70)
- Backflow prevention and plumbing codes

Analyze the provided compliance data and respond in JSON format with:
- compliance_gaps: array of { area, description, severity, regulation_reference, deadline }
- required_actions: array of { action, priority, responsible_party, due_date, regulation }
- risk_assessment: { overall_risk_level, health_risk, safety_risk, legal_risk, financial_risk }
- regulatory_updates: array of recent or upcoming regulatory changes relevant to the equipment
- inspection_readiness: score 0-100 with specific areas needing attention
- documentation_gaps: array of missing or outdated documentation
- recommended_schedule: suggested compliance check schedule`;

    const userPrompt = `Review the following commercial kitchen equipment compliance data and identify any gaps or risks:

Equipment (${equipmentResult.rows.length} units):
${equipmentResult.rows.slice(0, 50).map(e => `- ${e.name} (${e.type || 'Unknown'}) | Status: ${e.status || 'Unknown'} | Location: ${e.location || 'N/A'} | Installed: ${e.install_date || 'Unknown'}`).join('\n')}

Compliance Records (${complianceResult.rows.length} entries):
${complianceResult.rows.slice(0, 100).map(c => `- ${c.title || c.description || 'N/A'} | Status: ${c.status || 'Unknown'} | Type: ${c.type || 'N/A'} | Due: ${c.due_date || 'N/A'} | Equipment: ${c.equipment_id || 'General'}`).join('\n')}

Identify compliance gaps, required actions, risk levels, and any upcoming regulatory concerns.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in compliance checker:', err);
    res.status(500).json({ error: 'Failed to run compliance checker' });
  }
});

// POST /energy-advisor - AI energy advisor
router.post('/energy-advisor', async (req, res) => {
  try {
    const { equipment_id } = req.body;

    let energyQuery = 'SELECT * FROM energy_logs ORDER BY created_at DESC LIMIT 500';
    let energyParams = [];
    if (equipment_id) {
      energyQuery = 'SELECT * FROM energy_logs WHERE equipment_id = $1 ORDER BY created_at DESC LIMIT 500';
      energyParams = [equipment_id];
    }
    const energyResult = await pool.query(energyQuery, energyParams);

    // Fetch equipment for context
    let equipmentQuery = 'SELECT * FROM equipment ORDER BY created_at DESC';
    let equipmentParams = [];
    if (equipment_id) {
      equipmentQuery = 'SELECT * FROM equipment WHERE id = $1';
      equipmentParams = [equipment_id];
    }
    const equipmentResult = await pool.query(equipmentQuery, equipmentParams);

    const systemPrompt = `You are an expert energy efficiency advisor for commercial kitchen operations. You specialize in analyzing energy consumption patterns of commercial kitchen equipment and identifying opportunities for savings.

Your expertise covers:
- Energy consumption benchmarking for all types of commercial kitchen equipment (ovens, fryers, refrigerators, dishwashers, HVAC, ice machines, etc.)
- ENERGY STAR certification standards for commercial food service equipment
- Peak demand management and load balancing strategies
- Equipment scheduling optimization to reduce energy waste
- Maintenance practices that improve energy efficiency (coil cleaning, door seal replacement, calibration, etc.)
- ROI calculations for energy-efficient equipment upgrades
- Utility rate optimization and demand response programs
- Environmental impact assessment and carbon footprint reduction

Analyze the provided energy data and respond in JSON format with:
- energy_saving_tips: array of { tip, estimated_savings_kwh, estimated_savings_dollars, difficulty }
- efficiency_improvements: array of { equipment, current_efficiency, target_efficiency, improvement_action, investment_needed }
- environmental_impact: { current_carbon_footprint_kg, potential_reduction_kg, equivalent_trees, sustainability_score }
- cost_savings: { monthly_potential, annual_potential, investment_required, payback_period }
- peak_usage_analysis: insights about peak energy consumption patterns
- equipment_rankings: ranking equipment by energy efficiency with recommendations
- quick_wins: immediately actionable energy-saving measures`;

    const userPrompt = `Analyze the following commercial kitchen energy data and provide efficiency recommendations:

Equipment (${equipmentResult.rows.length} units):
${equipmentResult.rows.slice(0, 50).map(e => `- ${e.name} (${e.type || 'Unknown'}) | Status: ${e.status || 'Unknown'} | Location: ${e.location || 'N/A'}`).join('\n')}

Energy Logs (${energyResult.rows.length} entries):
${energyResult.rows.slice(0, 100).map(l => `- Equipment ID: ${l.equipment_id || 'N/A'} | Usage: ${l.usage_kwh || l.consumption || 'N/A'} kWh | Date: ${l.recorded_at || l.created_at || 'Unknown'} | Cost: $${l.cost || 'N/A'}`).join('\n')}

Provide energy saving recommendations, efficiency improvements, environmental impact analysis, and cost savings projections.`;

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in energy advisor:', err);
    res.status(500).json({ error: 'Failed to run energy advisor' });
  }
});

// POST /report-generator - AI report generator
router.post('/report-generator', async (req, res) => {
  try {
    const { report_type, date_range } = req.body;

    if (!report_type) {
      return res.status(400).json({ error: 'report_type is required' });
    }

    const validTypes = ['maintenance_summary', 'cost_analysis', 'compliance_status', 'equipment_health', 'energy_report'];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: `Invalid report_type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Fetch data based on report type
    const data = {};

    // Always fetch equipment
    const equipmentResult = await pool.query('SELECT * FROM equipment ORDER BY created_at DESC');
    data.equipment = equipmentResult.rows;

    if (report_type === 'maintenance_summary' || report_type === 'equipment_health') {
      const woResult = await pool.query(`
        SELECT wo.*, e.name AS equipment_name, e.type AS equipment_type
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        ORDER BY wo.created_at DESC LIMIT 300
      `);
      data.work_orders = woResult.rows;

      const diagResult = await pool.query(`
        SELECT dl.*, e.name AS equipment_name
        FROM diagnostic_logs dl
        LEFT JOIN equipment e ON dl.equipment_id = e.id
        ORDER BY dl.created_at DESC LIMIT 200
      `);
      data.diagnostics = diagResult.rows;
    }

    if (report_type === 'cost_analysis') {
      const costResult = await pool.query('SELECT * FROM cost_records ORDER BY created_at DESC LIMIT 500');
      data.costs = costResult.rows;

      const woResult = await pool.query(`
        SELECT wo.*, e.name AS equipment_name
        FROM work_orders wo
        LEFT JOIN equipment e ON wo.equipment_id = e.id
        ORDER BY wo.created_at DESC LIMIT 200
      `);
      data.work_orders = woResult.rows;
    }

    if (report_type === 'compliance_status') {
      const compResult = await pool.query('SELECT * FROM compliance_records ORDER BY created_at DESC LIMIT 500');
      data.compliance = compResult.rows;
    }

    if (report_type === 'energy_report') {
      const energyResult = await pool.query('SELECT * FROM energy_logs ORDER BY created_at DESC LIMIT 500');
      data.energy = energyResult.rows;
    }

    const reportTypeLabels = {
      maintenance_summary: 'Maintenance Summary Report',
      cost_analysis: 'Cost Analysis Report',
      compliance_status: 'Compliance Status Report',
      equipment_health: 'Equipment Health Report',
      energy_report: 'Energy Consumption Report'
    };

    const systemPrompt = `You are an expert report generation AI for commercial kitchen equipment maintenance operations. You create comprehensive, professionally formatted reports that facility managers and operations directors can use for decision-making.

Your reports should include:
- Executive summary with key findings
- Detailed analysis with data-driven insights
- Visual-friendly data breakdowns (tables, rankings, comparisons)
- Actionable recommendations prioritized by impact
- Key performance indicators (KPIs) relevant to the report type
- Trend analysis and comparisons to industry benchmarks
- Risk highlights and areas requiring immediate attention

Respond in JSON format with:
- report_title: the report title
- generated_at: current timestamp
- executive_summary: 2-3 paragraph executive summary
- key_metrics: array of { metric, value, trend, benchmark }
- detailed_analysis: array of { section_title, content, data_points }
- recommendations: array of { recommendation, priority, expected_impact, timeline }
- risk_alerts: array of any critical findings
- conclusion: brief concluding summary`;

    let userPrompt = `Generate a comprehensive ${reportTypeLabels[report_type]} for a commercial kitchen operation.

Date Range: ${date_range ? `${date_range.start || 'N/A'} to ${date_range.end || 'N/A'}` : 'All available data'}

Equipment Fleet (${data.equipment.length} units):
${data.equipment.slice(0, 30).map(e => `- ${e.name} (${e.type || 'Unknown'}) | Status: ${e.status || 'Unknown'}`).join('\n')}
`;

    if (data.work_orders) {
      userPrompt += `\nWork Orders (${data.work_orders.length} records):
${data.work_orders.slice(0, 40).map(w => `- ${w.equipment_name || 'Unknown'}: ${w.title || w.description || 'N/A'} | Status: ${w.status} | Priority: ${w.priority || 'N/A'} | Cost: $${w.cost || 0}`).join('\n')}
`;
    }

    if (data.diagnostics) {
      userPrompt += `\nDiagnostic Logs (${data.diagnostics.length} records):
${data.diagnostics.slice(0, 30).map(d => `- ${d.equipment_name || 'Unknown'}: ${d.reported_issue || 'N/A'} | Severity: ${d.severity || 'N/A'} | Status: ${d.status || 'Unknown'}`).join('\n')}
`;
    }

    if (data.costs) {
      userPrompt += `\nCost Records (${data.costs.length} entries):
${data.costs.slice(0, 40).map(c => `- ${c.description || 'N/A'} | Amount: $${c.amount || 0} | Category: ${c.category || 'N/A'}`).join('\n')}
`;
    }

    if (data.compliance) {
      userPrompt += `\nCompliance Records (${data.compliance.length} entries):
${data.compliance.slice(0, 40).map(c => `- ${c.title || c.description || 'N/A'} | Status: ${c.status || 'Unknown'} | Type: ${c.type || 'N/A'} | Due: ${c.due_date || 'N/A'}`).join('\n')}
`;
    }

    if (data.energy) {
      userPrompt += `\nEnergy Logs (${data.energy.length} entries):
${data.energy.slice(0, 40).map(l => `- Equipment ID: ${l.equipment_id || 'N/A'} | Usage: ${l.usage_kwh || l.consumption || 'N/A'} kWh | Cost: $${l.cost || 'N/A'}`).join('\n')}
`;
    }

    userPrompt += '\nGenerate a comprehensive, data-driven report with executive summary, key metrics, detailed analysis, and actionable recommendations.';

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in report generator:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// POST /smart-chat - General AI assistant chat
router.post('/smart-chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are an expert AI assistant specializing in commercial kitchen equipment maintenance, repair, and operations management. You have extensive knowledge of:

- All types of commercial kitchen equipment: ovens (convection, combi, deck, conveyor), fryers (gas, electric, pressure), refrigeration (walk-in, reach-in, prep tables, blast chillers), dishwashers (door-type, conveyor, flight-type, undercounter), ice machines, steam equipment, grills, broilers, ventilation hoods, and more
- Preventive maintenance best practices and scheduling
- Troubleshooting and repair procedures
- Parts sourcing and inventory management
- Health and safety regulations (FDA, OSHA, NSF, NFPA)
- Energy efficiency and sustainability
- Cost optimization and budgeting
- Vendor management and service contracts
- Kitchen workflow optimization
- Food safety implications of equipment failures
- Equipment lifecycle management and replacement planning

You are helpful, conversational, and practical. Provide clear, actionable advice. When discussing repairs, always mention relevant safety precautions. If a question is outside your expertise, say so honestly.

If the user provides additional context about their operation, use it to tailor your responses to their specific situation.`;

    let userPrompt = message;
    if (context) {
      userPrompt = `Context: ${typeof context === 'string' ? context : JSON.stringify(context)}\n\nQuestion: ${message}`;
    }

    const aiResult = await queryAI(systemPrompt, userPrompt);
    res.json(parseAIResponse(aiResult));
  } catch (err) {
    console.error('Error in smart chat:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

module.exports = router;
