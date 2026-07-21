BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid;
CREATE TABLE IF NOT EXISTS governed_equipment (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, external_asset_id text NOT NULL, manufacturer text NOT NULL, model text NOT NULL,
  serial_number text NOT NULL, location_id uuid NOT NULL, safety_class text NOT NULL, commissioned_at date, UNIQUE(tenant_id,external_asset_id), UNIQUE(tenant_id,serial_number)
);
CREATE TABLE IF NOT EXISTS equipment_devices (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, equipment_id uuid NOT NULL REFERENCES governed_equipment(id), external_id text NOT NULL,
  public_key_fingerprint text NOT NULL, calibrated_until timestamptz NOT NULL, revoked_at timestamptz, UNIQUE(tenant_id,external_id)
);
CREATE TABLE IF NOT EXISTS equipment_telemetry (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, equipment_id uuid NOT NULL REFERENCES governed_equipment(id),
  device_id uuid NOT NULL REFERENCES equipment_devices(id), idempotency_key text NOT NULL, metric text NOT NULL, value numeric NOT NULL,
  measured_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), signature_valid boolean NOT NULL, decision text NOT NULL,
  UNIQUE(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS maintenance_rules (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, equipment_id uuid NOT NULL REFERENCES governed_equipment(id), metric text,
  warning_min numeric, warning_max numeric, shutdown_min numeric, shutdown_max numeric, service_interval_hours numeric, approved_by text NOT NULL, effective_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS governed_work_orders (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, equipment_id uuid NOT NULL REFERENCES governed_equipment(id), idempotency_key text NOT NULL,
  status text NOT NULL CHECK(status IN ('open','triaged','assigned','in_progress','awaiting_parts','locked_out','verification','closed','cancelled')),
  assigned_technician_id text, lockout_active boolean NOT NULL DEFAULT false, safety_checklist jsonb, repair_outcome jsonb,
  signed_off_by text, signed_off_at timestamptz, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, work_order_id uuid NOT NULL REFERENCES governed_work_orders(id), part_id uuid NOT NULL,
  quantity numeric NOT NULL CHECK(quantity > 0), reservation_status text NOT NULL CHECK(reservation_status IN ('requested','reserved','consumed','released','failed')), external_reference text
);
CREATE TABLE IF NOT EXISTS maintenance_audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, aggregate_id uuid NOT NULL, actor_id text,
  event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS maintenance_integration_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, tenant_id uuid NOT NULL, provider text NOT NULL, direction text NOT NULL,
  idempotency_key text NOT NULL, status text NOT NULL CHECK(status IN ('pending','succeeded','failed')), external_id text,
  failure_code text, retry_count integer NOT NULL DEFAULT 0, next_retry_at timestamptz, occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id,provider,idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_equipment_telemetry_trace ON equipment_telemetry(tenant_id,equipment_id,measured_at DESC);
COMMIT;
