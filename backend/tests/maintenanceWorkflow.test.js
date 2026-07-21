const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateTelemetry, transitionWorkOrder, maintenanceDue } = require('../domain/maintenanceWorkflow');

test('applies deterministic warning, shutdown, and calibration rules', () => {
  assert.equal(evaluateTelemetry({ value: 250, warningMin: 35, warningMax: 220, shutdownMin: 30, shutdownMax: 240, measuredAt: '2026-01-01', calibratedUntil: '2027-01-01' }).decision, 'lockout');
  assert.equal(evaluateTelemetry({ value: 40, warningMin: 35, warningMax: 220, shutdownMin: 30, shutdownMax: 240, measuredAt: '2028-01-01', calibratedUntil: '2027-01-01' }).decision, 'review');
});
test('requires safety evidence and technician sign-off before closure', () => {
  assert.throws(() => transitionWorkOrder('verification', 'closed', 'technician', { safetyChecklistComplete: true, repairOutcome: 'fixed', signoff: '', lockoutActive: false }), /sign-off/);
  assert.equal(transitionWorkOrder('verification', 'closed', 'technician', { safetyChecklistComplete: true, repairOutcome: 'fixed', signoff: 'tech-1', lockoutActive: false }), 'closed');
});
test('calculates usage-based maintenance interval', () => {
  assert.deepEqual(maintenanceDue({ lastServiceAt: '2026-01-01', intervalHours: 500, operatingHoursSinceService: 525 }), { due: true, remainingHours: 0 });
});
