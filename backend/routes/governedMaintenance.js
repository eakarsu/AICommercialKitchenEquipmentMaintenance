'use strict';
const express = require('express');
const crypto = require('crypto');
const pool = require('../db');
const auth = require('../middleware/auth');
const { evaluateTelemetry, transitionWorkOrder } = require('../domain/maintenanceWorkflow');
const router = express.Router();
function tenant(req, res) { if (!req.user?.tenant_id) { res.status(403).json({ error: 'Tenant-scoped identity required' }); return null; } return req.user.tenant_id; }

router.post('/telemetry', async (req, res) => {
  const secret = process.env.DEVICE_SIGNING_SECRET; const signature = req.get('X-Device-Signature') || '';
  if (!secret || secret.length < 32) return res.status(503).json({ error: 'Device verification not configured' });
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: 'Invalid device signature' });
  const { tenantId, equipmentId, deviceExternalId, idempotencyKey, metric, value, measuredAt } = req.body;
  if (!tenantId || !equipmentId || !deviceExternalId || !idempotencyKey || !metric || !measuredAt) return res.status(400).json({ error: 'Complete telemetry envelope required' });
  try {
    const found = await pool.query(`SELECT d.id AS device_id,d.calibrated_until,d.revoked_at,r.warning_min,r.warning_max,r.shutdown_min,r.shutdown_max
      FROM equipment_devices d JOIN maintenance_rules r ON r.equipment_id=d.equipment_id AND r.tenant_id=d.tenant_id AND r.metric=$4
      WHERE d.tenant_id=$1 AND d.equipment_id=$2 AND d.external_id=$3 ORDER BY r.effective_at DESC LIMIT 1`, [tenantId, equipmentId, deviceExternalId, metric]);
    if (!found.rowCount || found.rows[0].revoked_at) return res.status(403).json({ error: 'Active device/rule binding not found' });
    const row = found.rows[0]; const evaluation = evaluateTelemetry({ value, warningMin: row.warning_min, warningMax: row.warning_max, shutdownMin: row.shutdown_min, shutdownMax: row.shutdown_max, measuredAt, calibratedUntil: row.calibrated_until });
    const inserted = await pool.query(`INSERT INTO equipment_telemetry(tenant_id,equipment_id,device_id,idempotency_key,metric,value,measured_at,signature_valid,decision)
      VALUES($1,$2,$3,$4,$5,$6,$7,true,$8) ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`, [tenantId, equipmentId, row.device_id, idempotencyKey, metric, value, measuredAt, evaluation.decision]);
    let workOrderId = null;
    if (['lockout','inspect'].includes(evaluation.decision)) {
      workOrderId = crypto.randomUUID();
      await pool.query(`INSERT INTO governed_work_orders(id,tenant_id,equipment_id,idempotency_key,status,lockout_active) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,idempotency_key) DO NOTHING`, [workOrderId, tenantId, equipmentId, `telemetry:${idempotencyKey}`, evaluation.decision === 'lockout' ? 'locked_out' : 'open', evaluation.decision === 'lockout']);
    }
    res.status(202).json({ telemetry: inserted.rows[0], evaluation, workOrderId });
  } catch (error) { res.status(422).json({ error: error.message }); }
});

router.post('/work-orders', auth, async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return;
  const key = req.get('Idempotency-Key'); const { equipmentId } = req.body;
  if (!key || !equipmentId) return res.status(400).json({ error: 'Idempotency-Key and equipmentId required' });
  const result = await pool.query(`INSERT INTO governed_work_orders(id,tenant_id,equipment_id,idempotency_key,status)
    SELECT $1,$2,e.id,$4,'open' FROM governed_equipment e WHERE e.id=$3 AND e.tenant_id=$2
    ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`, [crypto.randomUUID(), tenantId, equipmentId, key]);
  if (!result.rowCount) return res.status(404).json({ error: 'Equipment not found in tenant' });
  res.status(201).json(result.rows[0]);
});

router.post('/work-orders/:id/transition', auth, async (req, res) => {
  const tenantId = tenant(req, res); if (!tenantId) return; const client = await pool.connect();
  try {
    await client.query('BEGIN'); const found = await client.query('SELECT * FROM governed_work_orders WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenantId]);
    if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Work order not found' }); }
    const current = found.rows[0];
    const next = transitionWorkOrder(current.status, req.body.status, req.user.role, { safetyChecklistComplete: Boolean(req.body.safetyChecklistComplete), repairOutcome: req.body.repairOutcome, signoff: req.body.signoff, lockoutActive: current.lockout_active && !req.body.authorizedLockoutRelease });
    await client.query(`UPDATE governed_work_orders SET status=$1,lockout_active=$2,safety_checklist=COALESCE($3,safety_checklist),repair_outcome=COALESCE($4,repair_outcome),signed_off_by=CASE WHEN $1='closed' THEN $5 ELSE signed_off_by END,signed_off_at=CASE WHEN $1='closed' THEN now() ELSE signed_off_at END,version=version+1 WHERE id=$6 AND tenant_id=$7`, [next, next === 'locked_out' ? true : current.lockout_active && !req.body.authorizedLockoutRelease, req.body.safetyChecklist ? JSON.stringify(req.body.safetyChecklist) : null, req.body.repairOutcome ? JSON.stringify(req.body.repairOutcome) : null, req.user.id, req.params.id, tenantId]);
    await client.query(`INSERT INTO maintenance_audit_events(tenant_id,aggregate_id,actor_id,event_type,payload) VALUES($1,$2,$3,'work_order.status_changed',$4)`, [tenantId, req.params.id, req.user.id, JSON.stringify({ from: current.status, to: next })]);
    await client.query('COMMIT'); res.json({ status: next });
  } catch (error) { await client.query('ROLLBACK'); res.status(409).json({ error: error.message }); } finally { client.release(); }
});
module.exports = router;
