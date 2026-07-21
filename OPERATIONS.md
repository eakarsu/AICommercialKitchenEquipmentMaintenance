# Operations

Copy `.env.example` to `.env`, replace secrets, run `scripts/bootstrap.sh` once, and apply reviewed migrations with `scripts/migrate.sh`. `start.sh` is non-destructive. Demo seeding requires `CONFIRM_DEMO_SEED=yes` and three explicit passwords.

The governed API is `/api/governed-maintenance`. Signed device telemetry is evaluated against approved calibration and warning/shutdown rules; critical readings create a lockout work order. Closure requires safety evidence, a repair outcome, authorized lockout release, and technician sign-off. Device enrollment, CMMS/FSM, parts/vendor, food-safety, notification adapters, calibrated equipment tests, and qualified safety review remain external gates.
