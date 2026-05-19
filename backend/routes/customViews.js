/**
 * Custom Views (Kitchen Views) - domain: commercial kitchen equipment maintenance
 * 4 endpoints:
 *   GET  /api/custom-views/uptime-trend       -> VIZ: equipment uptime time-series chart
 *   GET  /api/custom-views/maintenance-heatmap -> VIZ: equipment x month maintenance frequency heatmap
 *   GET  /api/custom-views/pm-schedule-pdf    -> NON-VIZ: preventive maintenance schedule (text/pdf-like)
 *   GET  /api/custom-views/maintenance-rules  -> NON-VIZ: list maintenance rules (CRUD intervals)
 *   POST /api/custom-views/maintenance-rules  -> create
 *   PUT  /api/custom-views/maintenance-rules/:id -> update
 *   DELETE /api/custom-views/maintenance-rules/:id -> delete
 *
 * In-memory storage for rules (no schema changes). Uses auth middleware to mirror project patterns.
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

router.use(auth);

// ---------- Seed data ----------
const equipmentNames = [
  'Hobart Mixer HL600',
  'Vulcan Range VR48',
  'Hoshizaki Ice Maker KM-260',
  'True Reach-In Cooler T49',
  'Frymaster Fryer H50',
  'Rational SCC Combi Oven',
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Deterministic pseudo-random based on seed
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ---------- In-memory rules ----------
let nextRuleId = 5;
const rules = [
  { id: 1, equipment: 'Hobart Mixer HL600', interval_days: 30, task: 'Lubricate gears, inspect drive belt', priority: 'high' },
  { id: 2, equipment: 'Vulcan Range VR48', interval_days: 60, task: 'Clean burners, calibrate thermostat', priority: 'medium' },
  { id: 3, equipment: 'Hoshizaki Ice Maker KM-260', interval_days: 90, task: 'Descale evaporator, replace water filter', priority: 'high' },
  { id: 4, equipment: 'Frymaster Fryer H50', interval_days: 14, task: 'Filter oil, check heating elements', priority: 'medium' },
];

// ---------- VIZ 1: Equipment uptime trend ----------
router.get('/uptime-trend', (req, res) => {
  try {
    const rand = seededRandom(42);
    const days = 30;
    const series = equipmentNames.slice(0, 4).map((name, eqIdx) => {
      const baseline = 92 + eqIdx; // distinct baseline per equipment
      const points = [];
      for (let d = 1; d <= days; d++) {
        const noise = (rand() - 0.5) * 6;
        const dip = (d % 7 === 0) ? -3 : 0;
        const uptime = Math.max(70, Math.min(100, baseline + noise + dip));
        points.push({ day: d, uptime: Number(uptime.toFixed(2)) });
      }
      return { equipment: name, points };
    });
    res.json({
      title: 'Equipment Uptime Trend (last 30 days)',
      unit: 'percent',
      series,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- VIZ 2: Maintenance frequency heatmap (equipment x month) ----------
router.get('/maintenance-heatmap', (req, res) => {
  try {
    const rand = seededRandom(7);
    const matrix = equipmentNames.map((name, i) => {
      const row = months.map((m, mi) => {
        const base = 1 + Math.floor(rand() * 6);
        const seasonal = (mi >= 5 && mi <= 8) ? 2 : 0; // busier summer
        const equipBias = (i % 3 === 0) ? 1 : 0;
        return base + seasonal + equipBias;
      });
      return { equipment: name, counts: row };
    });
    res.json({
      title: 'Maintenance Frequency Heatmap',
      x_axis: months,
      y_axis: equipmentNames,
      matrix,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 1: Preventive Maintenance Schedule (PDF-like text payload) ----------
router.get('/pm-schedule-pdf', (req, res) => {
  try {
    const today = new Date();
    const lines = [];
    lines.push('PREVENTIVE MAINTENANCE SCHEDULE');
    lines.push('Commercial Kitchen Equipment Maintenance');
    lines.push(`Generated: ${today.toISOString().slice(0, 10)}`);
    lines.push('---------------------------------------------');
    rules.forEach(r => {
      const next = new Date(today);
      next.setDate(today.getDate() + r.interval_days);
      lines.push(`* ${r.equipment}`);
      lines.push(`  Task     : ${r.task}`);
      lines.push(`  Interval : every ${r.interval_days} days`);
      lines.push(`  Priority : ${r.priority}`);
      lines.push(`  Next due : ${next.toISOString().slice(0, 10)}`);
      lines.push('');
    });
    lines.push('--- end of schedule ---');
    const body = lines.join('\n');
    res.json({
      filename: `pm-schedule-${today.toISOString().slice(0, 10)}.pdf`,
      mime: 'application/pdf',
      content_format: 'text/plain-preview',
      pages: Math.ceil(lines.length / 30) || 1,
      content: body,
      rule_count: rules.length,
      generated_at: today.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- NON-VIZ 2: Maintenance rules CRUD ----------
router.get('/maintenance-rules', (req, res) => {
  res.json({ rules, count: rules.length });
});

router.post('/maintenance-rules', (req, res) => {
  try {
    const { equipment, interval_days, task, priority } = req.body || {};
    if (!equipment || !interval_days || !task) {
      return res.status(400).json({ error: 'equipment, interval_days and task are required' });
    }
    const rule = {
      id: nextRuleId++,
      equipment: String(equipment),
      interval_days: Number(interval_days),
      task: String(task),
      priority: priority || 'medium',
    };
    rules.push(rule);
    res.status(201).json(rule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/maintenance-rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
    const { equipment, interval_days, task, priority } = req.body || {};
    rules[idx] = {
      ...rules[idx],
      ...(equipment !== undefined ? { equipment } : {}),
      ...(interval_days !== undefined ? { interval_days: Number(interval_days) } : {}),
      ...(task !== undefined ? { task } : {}),
      ...(priority !== undefined ? { priority } : {}),
    };
    res.json(rules[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/maintenance-rules/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const idx = rules.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Rule not found' });
    const [removed] = rules.splice(idx, 1);
    res.json({ deleted: true, rule: removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
