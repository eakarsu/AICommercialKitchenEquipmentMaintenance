'use strict';

const WORK_ORDER_TRANSITIONS = Object.freeze({ open: ['triaged', 'cancelled'], triaged: ['assigned', 'locked_out'], assigned: ['in_progress', 'locked_out'], in_progress: ['awaiting_parts', 'verification', 'locked_out'], awaiting_parts: ['in_progress'], locked_out: ['in_progress'], verification: ['closed', 'in_progress'], closed: [], cancelled: [] });

function evaluateTelemetry({ value, warningMin, warningMax, shutdownMin, shutdownMax, measuredAt, calibratedUntil }) {
  for (const item of [value, warningMin, warningMax, shutdownMin, shutdownMax]) if (!Number.isFinite(Number(item))) throw new Error('telemetry thresholds and value must be numeric');
  if (!(Number(shutdownMin) <= Number(warningMin) && Number(warningMin) < Number(warningMax) && Number(warningMax) <= Number(shutdownMax))) throw new Error('telemetry thresholds must be ordered');
  const measured = new Date(measuredAt); const calibrated = new Date(calibratedUntil);
  if (Number.isNaN(measured.getTime()) || Number.isNaN(calibrated.getTime())) throw new Error('valid timestamps required');
  const calibratedReading = measured <= calibrated;
  const shutdown = Number(value) < Number(shutdownMin) || Number(value) > Number(shutdownMax);
  const warning = shutdown || Number(value) < Number(warningMin) || Number(value) > Number(warningMax);
  return { calibratedReading, warning, shutdown, decision: !calibratedReading ? 'review' : shutdown ? 'lockout' : warning ? 'inspect' : 'normal' };
}

function transitionWorkOrder(current, next, actorRole, context = {}) {
  if (!(WORK_ORDER_TRANSITIONS[current] || []).includes(next)) throw new Error(`invalid transition ${current} -> ${next}`);
  if (next === 'closed') {
    if (!['technician', 'supervisor', 'admin'].includes(actorRole)) throw new Error('technician sign-off required');
    if (!context.safetyChecklistComplete || !context.repairOutcome || !context.signoff) throw new Error('safety checklist, repair outcome, and sign-off required');
    if (context.lockoutActive) throw new Error('active lockout prevents closure');
  }
  if (next === 'in_progress' && current === 'locked_out' && !['supervisor', 'safety_officer'].includes(actorRole)) throw new Error('authorized lockout release required');
  return next;
}

function maintenanceDue({ lastServiceAt, intervalHours, operatingHoursSinceService }) {
  if (!lastServiceAt || !Number.isFinite(Number(intervalHours)) || Number(intervalHours) <= 0 || !Number.isFinite(Number(operatingHoursSinceService))) throw new Error('maintenance interval evidence required');
  return { due: Number(operatingHoursSinceService) >= Number(intervalHours), remainingHours: Math.max(0, Number(intervalHours) - Number(operatingHoursSinceService)) };
}

module.exports = { WORK_ORDER_TRANSITIONS, evaluateTelemetry, transitionWorkOrder, maintenanceDue };
