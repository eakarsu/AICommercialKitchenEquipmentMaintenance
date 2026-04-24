const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const pool = require('../db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Starting database seed...');

    // ─── DROP TABLES ───────────────────────────────────────────────
    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS cost_records CASCADE;
      DROP TABLE IF EXISTS energy_logs CASCADE;
      DROP TABLE IF EXISTS vendors CASCADE;
      DROP TABLE IF EXISTS compliance_records CASCADE;
      DROP TABLE IF EXISTS diagnostic_logs CASCADE;
      DROP TABLE IF EXISTS parts_inventory CASCADE;
      DROP TABLE IF EXISTS work_orders CASCADE;
      DROP TABLE IF EXISTS maintenance_schedules CASCADE;
      DROP TABLE IF EXISTS technicians CASCADE;
      DROP TABLE IF EXISTS equipment CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('All tables dropped.');

    // ─── CREATE TABLES ─────────────────────────────────────────────
    console.log('Creating tables...');

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'technician')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: users');

    await client.query(`
      CREATE TABLE equipment (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        manufacturer VARCHAR(255),
        model VARCHAR(255),
        serial_number VARCHAR(255),
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'operational' CHECK (status IN ('operational', 'needs_maintenance', 'out_of_service')),
        purchase_date DATE,
        warranty_expiry DATE,
        last_maintenance DATE,
        next_maintenance DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: equipment');

    await client.query(`
      CREATE TABLE maintenance_schedules (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        task_name VARCHAR(255) NOT NULL,
        description TEXT,
        frequency VARCHAR(100),
        priority VARCHAR(50),
        last_completed DATE,
        next_due DATE,
        assigned_to VARCHAR(255),
        status VARCHAR(50),
        estimated_duration VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: maintenance_schedules');

    await client.query(`
      CREATE TABLE work_orders (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        equipment_id INT REFERENCES equipment(id),
        priority VARCHAR(50),
        status VARCHAR(50),
        assigned_to VARCHAR(255),
        requested_by VARCHAR(255),
        due_date DATE,
        completed_date DATE,
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: work_orders');

    await client.query(`
      CREATE TABLE parts_inventory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        part_number VARCHAR(100),
        category VARCHAR(100),
        compatible_equipment VARCHAR(255),
        quantity INT DEFAULT 0,
        minimum_stock INT DEFAULT 1,
        unit_cost DECIMAL(10,2),
        supplier VARCHAR(255),
        location VARCHAR(255),
        status VARCHAR(50),
        last_ordered DATE,
        lead_time_days INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: parts_inventory');

    await client.query(`
      CREATE TABLE diagnostic_logs (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        reported_issue VARCHAR(255),
        symptoms TEXT,
        diagnosis TEXT,
        severity VARCHAR(50),
        status VARCHAR(50),
        technician VARCHAR(255),
        resolution TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: diagnostic_logs');

    await client.query(`
      CREATE TABLE compliance_records (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        regulation_name VARCHAR(255),
        category VARCHAR(100),
        status VARCHAR(50),
        last_inspection DATE,
        next_inspection DATE,
        inspector VARCHAR(255),
        findings TEXT,
        corrective_actions TEXT,
        deadline DATE,
        documentation_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: compliance_records');

    await client.query(`
      CREATE TABLE vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        specialization VARCHAR(255),
        rating DECIMAL(3,2),
        total_orders INT DEFAULT 0,
        on_time_delivery_rate DECIMAL(5,2),
        average_response_time VARCHAR(50),
        contract_status VARCHAR(50),
        contract_start DATE,
        contract_end DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: vendors');

    await client.query(`
      CREATE TABLE energy_logs (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        reading_date DATE,
        energy_consumption DECIMAL(10,2),
        unit VARCHAR(20) DEFAULT 'kWh',
        cost DECIMAL(10,2),
        peak_usage_time VARCHAR(50),
        efficiency_rating DECIMAL(5,2),
        temperature_setting VARCHAR(50),
        operating_hours DECIMAL(5,2),
        anomaly_detected BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: energy_logs');

    await client.query(`
      CREATE TABLE cost_records (
        id SERIAL PRIMARY KEY,
        equipment_id INT REFERENCES equipment(id),
        category VARCHAR(100),
        description TEXT,
        amount DECIMAL(10,2),
        labor_cost DECIMAL(10,2),
        parts_cost DECIMAL(10,2),
        vendor_id INT,
        work_order_id INT,
        date DATE,
        fiscal_quarter VARCHAR(10),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: cost_records');

    await client.query(`
      CREATE TABLE technicians (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        specialization VARCHAR(255),
        certification TEXT,
        experience_years INT,
        availability_status VARCHAR(50),
        current_workload INT DEFAULT 0,
        max_workload INT DEFAULT 5,
        hourly_rate DECIMAL(10,2),
        rating DECIMAL(3,2),
        jobs_completed INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  Created: technicians');

    console.log('All tables created.');

    // ─── SEED DATA ─────────────────────────────────────────────────

    // --- USERS ---
    console.log('Seeding users...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const managerHash = await bcrypt.hash('manager123', 10);
    const techHash = await bcrypt.hash('tech123', 10);

    await client.query(`
      INSERT INTO users (name, email, password, role) VALUES
        ('David Chen', 'admin@kitchen.com', $1, 'admin'),
        ('Maria Santos', 'manager@kitchen.com', $2, 'manager'),
        ('James Walker', 'tech@kitchen.com', $3, 'technician');
    `, [adminHash, managerHash, techHash]);
    console.log('  Seeded: users (3 rows)');

    // --- EQUIPMENT ---
    console.log('Seeding equipment...');
    await client.query(`
      INSERT INTO equipment (name, type, manufacturer, model, serial_number, location, status, purchase_date, warranty_expiry, last_maintenance, next_maintenance, notes) VALUES
        ('Walk-In Freezer Unit A', 'Refrigeration', 'Kolpak', 'QS7-0806-FT', 'KP-2022-44891', 'Back Kitchen - Bay 1', 'operational', '2022-03-15', '2027-03-15', '2026-02-10', '2026-05-10', 'Primary frozen storage. Compressor serviced Feb 2026.'),
        ('Commercial Convection Oven', 'Cooking', 'Blodgett', 'DFG-200-ES', 'BL-2021-33742', 'Main Kitchen - Line A', 'operational', '2021-06-20', '2026-06-20', '2026-03-01', '2026-06-01', 'Double-stack convection. Door gaskets replaced last service.'),
        ('Industrial Dishwasher', 'Sanitation', 'Hobart', 'CL44eN', 'HB-2023-56210', 'Dish Pit', 'operational', '2023-01-10', '2028-01-10', '2026-03-15', '2026-04-15', 'High-temp sanitizing model. Wash arm checked monthly.'),
        ('Deep Fryer Bank (4-Well)', 'Cooking', 'Pitco', 'SSH55R', 'PT-2022-18903', 'Main Kitchen - Fry Station', 'needs_maintenance', '2022-08-05', '2027-08-05', '2026-01-20', '2026-04-20', 'Thermostat on well #3 reading 8F high. Scheduled for calibration.'),
        ('Commercial Flat-Top Griddle', 'Cooking', 'Vulcan', '972RX-30', 'VL-2023-27654', 'Main Kitchen - Line B', 'operational', '2023-04-12', '2028-04-12', '2026-03-05', '2026-06-05', '72-inch chrome-top griddle. Even heat distribution confirmed.'),
        ('Ice Machine', 'Refrigeration', 'Manitowoc', 'IYT1200A', 'MW-2022-65478', 'Bar Area', 'operational', '2022-11-01', '2027-11-01', '2026-02-28', '2026-05-28', 'Air-cooled half-cube. Produces 1200 lbs/day. Water filter replaced Feb.'),
        ('Walk-In Refrigerator', 'Refrigeration', 'Norlake', 'KLB77810-C', 'NL-2021-41298', 'Back Kitchen - Bay 2', 'operational', '2021-09-18', '2026-09-18', '2026-03-10', '2026-06-10', 'Main cold storage for produce and dairy. Door seals inspected.'),
        ('Steam Table (5-Well)', 'Holding', 'Duke', 'E305M', 'DK-2023-88312', 'Service Line', 'operational', '2023-02-22', '2028-02-22', '2026-02-15', '2026-05-15', 'Hot holding for service. All wells heating evenly.'),
        ('60-Qt Commercial Mixer', 'Prep', 'Hobart', 'HL600', 'HB-2020-12567', 'Bakery Prep Area', 'needs_maintenance', '2020-07-14', '2025-07-14', '2026-01-05', '2026-04-05', 'Planetary mixer. Gear box making grinding noise at speed 2. Out of warranty.'),
        ('Exhaust Hood System', 'Ventilation', 'Captive-Aire', 'SND-2-14', 'CA-2021-73920', 'Main Kitchen - Above Line A/B', 'operational', '2021-04-30', '2031-04-30', '2026-03-20', '2026-06-20', '14-foot Type I hood with Ansul system. Filters cleaned weekly.'),
        ('Prep Table w/ Refrigeration', 'Refrigeration', 'True', 'TSSU-72-18M-B', 'TR-2023-90124', 'Cold Prep Area', 'operational', '2023-05-08', '2028-05-08', '2026-03-12', '2026-06-12', 'Mega-top sandwich/salad prep. All pans holding temp.'),
        ('Conveyor Toaster', 'Cooking', 'Star', 'QCS3-1400BH', 'ST-2024-45671', 'Breakfast Station', 'operational', '2024-01-15', '2029-01-15', '2026-02-20', '2026-08-20', 'High-volume conveyor. Belt speed calibrated.'),
        ('Blast Chiller', 'Refrigeration', 'Irinox', 'MF130.2', 'IR-2023-34089', 'Bakery Prep Area', 'operational', '2023-08-22', '2028-08-22', '2026-03-01', '2026-06-01', 'Flash-freezes from 160F to 37F in 90 min. HACCP compliant.'),
        ('Combi Oven', 'Cooking', 'Rational', 'iCombi Pro 20-1/1', 'RA-2024-67234', 'Main Kitchen - Line A', 'operational', '2024-03-01', '2029-03-01', '2026-03-18', '2026-06-18', 'Self-cleaning model. CareControl descale done March 18.'),
        ('Commercial Meat Slicer', 'Prep', 'Berkel', '829A-PLUS', 'BK-2022-11456', 'Cold Prep Area', 'operational', '2022-12-10', '2027-12-10', '2026-03-08', '2026-06-08', 'Gravity-feed slicer. Blade sharpened and guard inspected.'),
        ('Salamander Broiler', 'Cooking', 'Garland', '?"SER', 'GL-2023-52891', 'Main Kitchen - Expo', 'operational', '2023-06-14', '2028-06-14', '2026-02-25', '2026-05-25', 'Wall-mounted infrared. Burner tubes cleaned.'),
        ('Reach-In Freezer', 'Refrigeration', 'Traulsen', 'G22010', 'TL-2022-79034', 'Pastry Station', 'out_of_service', '2022-04-20', '2027-04-20', '2026-01-15', '2026-04-01', 'Compressor failure. Awaiting replacement part from vendor.')
      ;
    `);
    console.log('  Seeded: equipment (17 rows)');

    // --- MAINTENANCE_SCHEDULES ---
    console.log('Seeding maintenance_schedules...');
    await client.query(`
      INSERT INTO maintenance_schedules (equipment_id, task_name, description, frequency, priority, last_completed, next_due, assigned_to, status, estimated_duration, notes) VALUES
        (1, 'Compressor Inspection', 'Check compressor pressures, oil level, and refrigerant charge', 'quarterly', 'high', '2026-02-10', '2026-05-10', 'James Walker', 'scheduled', '2 hours', 'Use gauges from toolkit B.'),
        (1, 'Door Gasket Inspection', 'Inspect walk-in door gaskets for tears and proper seal', 'monthly', 'medium', '2026-03-10', '2026-04-10', 'James Walker', 'scheduled', '30 minutes', 'Replace if dollar-bill test fails.'),
        (2, 'Oven Calibration', 'Verify thermostat accuracy with probe thermometer at 350F and 500F', 'quarterly', 'high', '2026-03-01', '2026-06-01', 'James Walker', 'scheduled', '1 hour', 'Log variance in calibration sheet.'),
        (3, 'Wash Arm Cleaning', 'Remove and flush upper and lower wash arms, check spray nozzles', 'monthly', 'medium', '2026-03-15', '2026-04-15', 'James Walker', 'scheduled', '45 minutes', 'Soak in delimer solution 15 min.'),
        (3, 'Sanitizer Concentration Check', 'Test final rinse sanitizer PPM with test strips', 'daily', 'critical', '2026-04-09', '2026-04-10', 'James Walker', 'scheduled', '10 minutes', 'Must read 150-200 PPM for high-temp unit.'),
        (4, 'Fryer Oil Filtration', 'Filter oil through built-in filtration system', 'daily', 'high', '2026-04-09', '2026-04-10', 'Maria Santos', 'scheduled', '20 minutes', 'Discard oil if TPC exceeds 24%.'),
        (4, 'Thermostat Calibration', 'Recalibrate all four well thermostats using reference thermometer', 'quarterly', 'high', '2026-01-20', '2026-04-20', 'James Walker', 'overdue', '1.5 hours', 'Well #3 reading 8F high — priority fix.'),
        (5, 'Griddle Surface Reseasoning', 'Clean and reseason chrome griddle surface', 'weekly', 'medium', '2026-04-06', '2026-04-13', 'Maria Santos', 'scheduled', '45 minutes', 'Use approved griddle polish only.'),
        (6, 'Ice Machine Descale', 'Run descaling cycle with nickel-safe cleaner and sanitize bin', 'quarterly', 'high', '2026-02-28', '2026-05-28', 'James Walker', 'scheduled', '3 hours', 'Takes full cycle. Plan during low-demand period.'),
        (6, 'Water Filter Replacement', 'Replace inline water filter cartridge', 'semi-annually', 'medium', '2026-02-28', '2026-08-28', 'James Walker', 'scheduled', '30 minutes', 'Use Everpure 4CB5-S replacement.'),
        (7, 'Evaporator Coil Cleaning', 'Clean evaporator coils and check drain line', 'quarterly', 'high', '2026-03-10', '2026-06-10', 'James Walker', 'scheduled', '1.5 hours', 'Use coil cleaner approved for food-service.'),
        (9, 'Mixer Gearbox Inspection', 'Inspect gearbox, check oil, listen for abnormal noise', 'quarterly', 'critical', '2026-01-05', '2026-04-05', 'James Walker', 'overdue', '2 hours', 'Grinding noise reported. May need rebuild.'),
        (10, 'Hood Filter Cleaning', 'Remove baffle filters, soak in degreaser, rinse and reinstall', 'weekly', 'high', '2026-04-06', '2026-04-13', 'Maria Santos', 'scheduled', '1 hour', 'Rotate spare filter set during cleaning.'),
        (10, 'Ansul System Inspection', 'Annual inspection of fire suppression system per NFPA 96', 'annually', 'critical', '2025-06-20', '2026-06-20', 'Certified Vendor', 'scheduled', '4 hours', 'Must be done by licensed fire protection company.'),
        (13, 'Blast Chiller Probe Calibration', 'Calibrate core and air probes against reference', 'semi-annually', 'high', '2026-03-01', '2026-09-01', 'James Walker', 'scheduled', '1 hour', 'Document in HACCP calibration log.'),
        (14, 'Combi Oven Descale', 'Run automatic descale cycle with Rational descaling tablets', 'monthly', 'high', '2026-03-18', '2026-04-18', 'James Walker', 'scheduled', '2 hours', 'Use 3 tablets per cycle for full descale.'),
        (15, 'Slicer Blade Sharpening', 'Sharpen blade using built-in sharpener, inspect guard and interlock', 'monthly', 'high', '2026-03-08', '2026-04-08', 'James Walker', 'scheduled', '30 minutes', 'Ensure lockout/tagout before service.')
      ;
    `);
    console.log('  Seeded: maintenance_schedules (17 rows)');

    // --- WORK_ORDERS ---
    console.log('Seeding work_orders...');
    await client.query(`
      INSERT INTO work_orders (title, description, equipment_id, priority, status, assigned_to, requested_by, due_date, completed_date, estimated_cost, actual_cost, notes) VALUES
        ('Fryer Thermostat Calibration', 'Well #3 thermostat reading 8F above setpoint. Recalibrate all four wells.', 4, 'high', 'in_progress', 'James Walker', 'Maria Santos', '2026-04-20', NULL, 150.00, NULL, 'Parts on hand. Scheduled for Tuesday AM.'),
        ('Mixer Gearbox Diagnosis', '60-qt mixer making grinding noise at speed 2. Diagnose and quote repair.', 9, 'critical', 'in_progress', 'James Walker', 'Maria Santos', '2026-04-12', NULL, 500.00, NULL, 'May need full gearbox rebuild. Get quote from Hobart service.'),
        ('Reach-In Freezer Compressor Replacement', 'Compressor failed on Traulsen reach-in at pastry station. Unit down.', 17, 'critical', 'waiting_for_parts', 'James Walker', 'David Chen', '2026-04-15', NULL, 1800.00, NULL, 'Replacement compressor ordered from Traulsen. ETA April 12.'),
        ('Dishwasher Delime Treatment', 'Scheduled quarterly deliming of dishwasher heat elements and rinse arms.', 3, 'medium', 'completed', 'James Walker', 'Maria Santos', '2026-03-15', '2026-03-15', 75.00, 68.50, 'Completed on schedule. No issues found.'),
        ('Hood System Semi-Annual Deep Clean', 'Professional deep cleaning of entire exhaust hood plenum and ductwork.', 10, 'high', 'scheduled', 'ABC Hood Cleaning', 'David Chen', '2026-04-25', NULL, 2200.00, NULL, 'Vendor scheduled for Sunday overnight.'),
        ('Walk-In Freezer Door Hinge Repair', 'Bottom hinge on walk-in freezer door is loose, door not sealing properly.', 1, 'high', 'completed', 'James Walker', 'Maria Santos', '2026-02-15', '2026-02-12', 120.00, 95.00, 'Replaced hinge pin and tightened mounting bolts.'),
        ('Ice Machine Water Filter Swap', 'Replace Everpure water filter cartridge on ice machine.', 6, 'medium', 'completed', 'James Walker', 'James Walker', '2026-03-01', '2026-02-28', 85.00, 82.00, 'Filter replaced. TDS reading normal post-swap.'),
        ('Combi Oven Software Update', 'Rational released firmware v3.2.1 with improved self-cleaning cycle.', 14, 'low', 'scheduled', 'Rational Service', 'David Chen', '2026-04-30', NULL, 0.00, NULL, 'Warranty-covered service visit. No charge.'),
        ('Griddle Thermocouple Replacement', 'Left-side thermocouple intermittently dropping signal. Replace.', 5, 'medium', 'completed', 'James Walker', 'Maria Santos', '2026-03-10', '2026-03-07', 65.00, 58.00, 'Replaced with Vulcan OEM thermocouple.'),
        ('Steam Table Element Replacement', 'Well #2 heating element not reaching setpoint. Replace element.', 8, 'medium', 'completed', 'James Walker', 'Maria Santos', '2026-02-20', '2026-02-18', 110.00, 105.00, 'Duke OEM element installed. Heating to temp in 12 min now.'),
        ('Blast Chiller Drain Blockage', 'Condensate drain line partially blocked. Water pooling on floor.', 13, 'high', 'completed', 'James Walker', 'Maria Santos', '2026-03-05', '2026-03-03', 45.00, 40.00, 'Cleared blockage with compressed air. Added drain treatment.'),
        ('Annual Ansul System Inspection', 'Mandatory NFPA 96 fire suppression inspection for all kitchen hoods.', 10, 'critical', 'scheduled', 'FireGuard Services', 'David Chen', '2026-06-20', NULL, 1500.00, NULL, 'Contract with FireGuard. Must pass for insurance compliance.'),
        ('Slicer Motor Inspection', 'Preventive check on slicer motor bearings and drive belt tension.', 15, 'medium', 'scheduled', 'James Walker', 'Maria Santos', '2026-04-15', NULL, 50.00, NULL, 'Add to next Tuesday maintenance window.'),
        ('Conveyor Toaster Belt Replacement', 'Belt showing wear marks and minor fraying on edges. Proactive replacement.', 12, 'low', 'waiting_for_parts', 'James Walker', 'Maria Santos', '2026-04-22', NULL, 135.00, NULL, 'Star OEM belt ordered. ETA April 14.'),
        ('Walk-In Refrigerator Fan Motor Lubrication', 'Evaporator fan motor squealing intermittently during defrost cycle.', 7, 'medium', 'scheduled', 'James Walker', 'James Walker', '2026-04-18', NULL, 35.00, NULL, 'Lubricate bearings. If noise persists, replace motor.')
      ;
    `);
    console.log('  Seeded: work_orders (15 rows)');

    // --- PARTS_INVENTORY ---
    console.log('Seeding parts_inventory...');
    await client.query(`
      INSERT INTO parts_inventory (name, part_number, category, compatible_equipment, quantity, minimum_stock, unit_cost, supplier, location, status, last_ordered, lead_time_days, notes) VALUES
        ('Walk-In Door Gasket (36x78)', 'KP-GK-3678', 'Gaskets & Seals', 'Kolpak Walk-In Freezer/Cooler', 4, 2, 89.50, 'Parts Town', 'Parts Room - Shelf A1', 'in_stock', '2026-01-15', 3, 'Universal fit for 36-inch Kolpak doors.'),
        ('Fryer Thermostat Assembly', 'PT-TH-55R', 'Controls', 'Pitco SSH55R Fryer', 2, 1, 124.00, 'Pitco Parts Direct', 'Parts Room - Shelf B3', 'in_stock', '2025-12-01', 7, 'Includes probe and mounting hardware.'),
        ('Everpure 4CB5-S Water Filter', 'EV-4CB5S', 'Filtration', 'Manitowoc Ice Machines', 6, 3, 78.00, 'WebstaurantStore', 'Parts Room - Shelf A2', 'in_stock', '2026-02-28', 2, 'Replace every 6 months or 9000 gallons.'),
        ('Dishwasher Wash Arm - Upper', 'HB-WA-44U', 'Wash Components', 'Hobart CL44eN', 1, 1, 156.00, 'Hobart Parts', 'Parts Room - Shelf C1', 'in_stock', '2025-11-10', 5, 'Stainless steel. Check spray nozzles on install.'),
        ('Dishwasher Wash Arm - Lower', 'HB-WA-44L', 'Wash Components', 'Hobart CL44eN', 1, 1, 142.00, 'Hobart Parts', 'Parts Room - Shelf C1', 'in_stock', '2025-11-10', 5, 'Order with upper arm for discount.'),
        ('Griddle Thermocouple (Type K)', 'VL-TC-972', 'Controls', 'Vulcan 972RX Griddle', 3, 2, 28.50, 'Parts Town', 'Parts Room - Shelf B2', 'in_stock', '2026-03-05', 3, '24-inch lead. Fits left and right positions.'),
        ('Compressor - Traulsen Reach-In', 'TL-COMP-2201', 'Compressors', 'Traulsen G22010 Freezer', 0, 1, 685.00, 'Traulsen OEM Parts', 'On Order', 'on_order', '2026-04-05', 10, 'Emergency order for pastry station unit. ETA April 12.'),
        ('Conveyor Toaster Belt', 'ST-BLT-1400', 'Belts & Chains', 'Star QCS3-1400BH', 0, 1, 67.00, 'Star Parts Depot', 'On Order', 'on_order', '2026-04-03', 8, 'Teflon-coated conveyor belt. 14-inch width.'),
        ('Mixer Gear Set (60-Qt)', 'HB-GR-600', 'Drive Components', 'Hobart HL600 Mixer', 0, 0, 420.00, 'Hobart Parts', 'Not Stocked', 'out_of_stock', '2025-06-15', 14, 'Special order only. Confirm gearbox diagnosis before ordering.'),
        ('Baffle Grease Filter (20x25)', 'CA-BF-2025', 'Ventilation', 'Captive-Aire Hood Systems', 8, 4, 45.00, 'Restaurant Equipment Supply', 'Parts Room - Shelf D1', 'in_stock', '2026-02-01', 4, 'Stainless steel baffle. Dishwasher safe.'),
        ('Steam Table Heating Element', 'DK-HE-305', 'Heating Elements', 'Duke E305M Steam Table', 2, 1, 92.00, 'Duke Manufacturing', 'Parts Room - Shelf B4', 'in_stock', '2026-02-10', 7, '1500W immersion element. Match wattage exactly.'),
        ('Rational Descaling Tablets (Tub/150)', 'RA-DT-150', 'Cleaning Supplies', 'Rational iCombi Pro Ovens', 1, 1, 189.00, 'Rational Online Store', 'Chemical Storage', 'in_stock', '2026-01-20', 5, 'Use 3 tablets per descale cycle.'),
        ('Refrigeration Door Closer - Spring', 'TR-DC-72', 'Hardware', 'True TSSU Prep Tables', 3, 2, 34.00, 'Parts Town', 'Parts Room - Shelf A3', 'in_stock', '2026-01-08', 3, 'Cartridge-style. Easy 5-minute swap.'),
        ('Ice Machine Sanitizer (Gallon)', 'MW-SAN-01', 'Cleaning Supplies', 'Manitowoc Ice Machines', 2, 1, 42.00, 'WebstaurantStore', 'Chemical Storage', 'in_stock', '2026-02-28', 2, 'Nickel-safe formula. Use during quarterly descale.'),
        ('Blodgett Oven Door Gasket', 'BL-GK-200', 'Gaskets & Seals', 'Blodgett DFG-200 Oven', 2, 1, 67.00, 'Parts Town', 'Parts Room - Shelf A1', 'in_stock', '2025-10-20', 3, 'High-temp fiberglass rope gasket.'),
        ('Slicer Sharpening Stones (Pair)', 'BK-SS-829', 'Blades & Cutters', 'Berkel 829A Slicer', 2, 1, 55.00, 'Berkel Parts', 'Parts Room - Shelf C3', 'in_stock', '2025-09-14', 10, 'Replace stones annually or when grooved.')
      ;
    `);
    console.log('  Seeded: parts_inventory (16 rows)');

    // --- DIAGNOSTIC_LOGS ---
    console.log('Seeding diagnostic_logs...');
    await client.query(`
      INSERT INTO diagnostic_logs (equipment_id, reported_issue, symptoms, diagnosis, severity, status, technician, resolution, resolved_at) VALUES
        (4, 'Fryer Well #3 Over-Temp', 'Oil temperature exceeding setpoint by 8 degrees. High-temp alarm triggering intermittently.', 'Thermostat calibration drift due to worn probe tip contact.', 'high', 'in_progress', 'James Walker', NULL, NULL),
        (9, 'Mixer Grinding Noise', 'Audible grinding/metal-on-metal noise when operating at speed 2. No noise at speed 1 or 3.', 'Preliminary: worn pinion gear in planetary drive. Full teardown needed to confirm.', 'critical', 'in_progress', 'James Walker', NULL, NULL),
        (17, 'Reach-In Freezer Not Cooling', 'Unit temperature rising. Internal reading 22F and climbing. Compressor not running.', 'Compressor motor winding failure. Confirmed with megohmmeter test — open winding on start circuit.', 'critical', 'waiting_for_parts', 'James Walker', NULL, NULL),
        (1, 'Walk-In Freezer Door Not Sealing', 'Frost buildup around bottom of door frame. Warm air infiltration visible on thermal camera.', 'Bottom door hinge pin worn, allowing door to sag 1/4 inch. Gasket contact lost at bottom.', 'high', 'resolved', 'James Walker', 'Replaced hinge pin and bushing. Adjusted door alignment. Gasket now sealing on all sides.', '2026-02-12 14:30:00'),
        (5, 'Griddle Cold Spot Left Side', 'Left third of griddle surface 40F cooler than rest. Uneven cooking results.', 'Left thermocouple intermittent signal loss causing burner to short-cycle.', 'medium', 'resolved', 'James Walker', 'Replaced thermocouple with Vulcan OEM part. Surface temp now uniform within 5F across entire griddle.', '2026-03-07 11:00:00'),
        (8, 'Steam Table Well #2 Lukewarm', 'Well #2 not reaching 165F holding temp. Food safety concern.', 'Heating element resistance measured at 45 ohms vs. spec 22 ohms. Element degraded.', 'high', 'resolved', 'James Walker', 'Installed new Duke OEM heating element. Well now reaches 180F in 12 minutes and holds at setpoint.', '2026-02-18 09:45:00'),
        (13, 'Blast Chiller Water on Floor', 'Puddle of water accumulating under blast chiller after each cycle.', 'Condensate drain line partially occluded with scale and debris buildup.', 'medium', 'resolved', 'James Walker', 'Cleared drain with compressed air and enzyme drain treatment. Added quarterly drain maintenance to schedule.', '2026-03-03 16:15:00'),
        (6, 'Ice Machine Low Production', 'Ice bin not filling to capacity. Production seems roughly 30% below rated output.', 'Water filter approaching end of life — flow rate reduced. Also found minor scale on evaporator plates.', 'medium', 'resolved', 'James Walker', 'Replaced water filter and ran full descale cycle. Production rate restored to rated 1200 lbs/day.', '2026-02-28 13:00:00'),
        (3, 'Dishwasher Spots on Glassware', 'Spots and film remaining on glassware after wash cycle. Plates cleaning fine.', 'Upper wash arm nozzle #3 partially clogged with calcium deposit. Rinse pressure slightly low.', 'low', 'resolved', 'James Walker', 'Cleared nozzle blockage and ran delime cycle. Adjusted rinse aid dispenser from 3 to 4. Glassware now spotless.', '2026-03-15 10:30:00'),
        (7, 'Walk-In Cooler Fan Squealing', 'Intermittent squealing noise from evaporator fan during defrost cycle transitions.', 'Fan motor bearings dry. Noise occurs when motor restarts after defrost heat cycle.', 'medium', 'open', 'James Walker', NULL, NULL),
        (14, 'Combi Oven Steam Generation Slow', 'Steam mode taking 3x longer than normal to reach full steam output.', 'Scale buildup in steam generator. CareControl auto-descale had been deferred 2 cycles.', 'medium', 'resolved', 'James Walker', 'Ran manual descale with 3 Rational tablets. Steam generation restored to normal timing. Reset descale counter.', '2026-03-18 15:00:00'),
        (2, 'Oven Temperature Variance', 'Upper deck running 15F above setpoint per independent thermometer check.', 'Thermostat calibration drift. Within serviceable range — no component failure.', 'low', 'resolved', 'James Walker', 'Recalibrated thermostat. Upper and lower decks now within 3F of setpoint at 350F and 500F test points.', '2026-03-01 11:30:00'),
        (10, 'Exhaust Hood Grease Drip', 'Grease dripping from front edge of hood onto line cook station.', 'Grease gutter overflow due to blocked drain channel. One baffle filter installed backwards.', 'medium', 'resolved', 'Maria Santos', 'Cleared grease drain channel, corrected filter orientation. Cleaned entire gutter system.', '2026-03-20 08:00:00'),
        (16, 'Salamander Uneven Heating', 'Left side of salamander not browning as well as right side.', 'Left infrared burner tube partially clogged with carbon deposits from splatter.', 'low', 'resolved', 'James Walker', 'Cleaned both burner tubes with wire brush. Even radiant output confirmed with IR thermometer.', '2026-02-25 14:00:00'),
        (12, 'Toaster Belt Slipping', 'Bread items exiting toaster unevenly toasted. Belt appears to stall briefly.', 'Belt stretched and glazed from heat exposure. Tension adjustment at maximum.', 'low', 'waiting_for_parts', 'James Walker', NULL, NULL)
      ;
    `);
    console.log('  Seeded: diagnostic_logs (15 rows)');

    // --- COMPLIANCE_RECORDS ---
    console.log('Seeding compliance_records...');
    await client.query(`
      INSERT INTO compliance_records (equipment_id, regulation_name, category, status, last_inspection, next_inspection, inspector, findings, corrective_actions, deadline, documentation_url, notes) VALUES
        (10, 'NFPA 96 - Ventilation Control and Fire Protection', 'Fire Safety', 'compliant', '2025-06-20', '2026-06-20', 'FireGuard Services - Tom Brennan', 'All hood suppression nozzles clear. Fusible links intact. Ductwork grease buildup within acceptable limits.', 'None required.', NULL, '/docs/compliance/nfpa96-2025.pdf', 'Annual inspection. Next due June 2026.'),
        (1, 'FDA Food Code 3-501.16 - Cold Holding', 'Food Safety', 'compliant', '2026-03-10', '2026-06-10', 'County Health Dept - Lisa Tran', 'Walk-in freezer maintaining -5F to 0F range. Door seal intact. Thermometer calibrated.', 'None required.', NULL, '/docs/compliance/cold-holding-mar2026.pdf', 'Quarterly temp verification.'),
        (7, 'FDA Food Code 3-501.16 - Cold Holding', 'Food Safety', 'compliant', '2026-03-10', '2026-06-10', 'County Health Dept - Lisa Tran', 'Walk-in cooler at 36F. All zones within 33-40F range. FIFO labeling observed.', 'None required.', NULL, '/docs/compliance/cold-holding-cooler-mar2026.pdf', 'Quarterly temp verification.'),
        (3, 'FDA Food Code 4-501.114 - Sanitization', 'Sanitation', 'compliant', '2026-03-15', '2026-04-15', 'James Walker (Internal)', 'Final rinse temp 180F. Sanitizer concentration N/A (high-temp unit). Wash temp 150F.', 'None required.', NULL, '/docs/compliance/dishwasher-sanitation-mar2026.pdf', 'Monthly internal check.'),
        (4, 'FDA Food Code 3-401.11 - Cooking Temperatures', 'Food Safety', 'needs_review', '2026-01-20', '2026-04-20', 'James Walker (Internal)', 'Well #3 thermostat reading 8F above setpoint. Other wells within 2F.', 'Recalibrate well #3 thermostat. Retest within 30 days.', '2026-04-20', '/docs/compliance/fryer-temp-jan2026.pdf', 'Corrective action in progress — see WO #1.'),
        (11, 'FDA Food Code 3-501.16 - Cold Holding', 'Food Safety', 'compliant', '2026-03-12', '2026-06-12', 'County Health Dept - Lisa Tran', 'Prep table base at 38F. All pan positions holding below 41F.', 'None required.', NULL, '/docs/compliance/prep-table-cold-mar2026.pdf', 'Quarterly check.'),
        (13, 'HACCP - Critical Control Point: Rapid Cooling', 'Food Safety', 'compliant', '2026-03-01', '2026-09-01', 'James Walker (Internal)', 'Blast chiller cooling 160F to 37F in 88 min (spec: 90 min max). Core probe calibrated.', 'None required.', NULL, '/docs/compliance/haccp-chiller-mar2026.pdf', 'Semi-annual CCP verification.'),
        (10, 'Local Fire Code - Kitchen Hood Cleaning', 'Fire Safety', 'compliant', '2026-01-15', '2026-07-15', 'ABC Hood Cleaning - Mike Rivera', 'Ductwork grease thickness < 2mm on all surfaces. Fans operational. Access panels secured.', 'None required.', NULL, '/docs/compliance/hood-clean-jan2026.pdf', 'Semi-annual deep clean per local fire code.'),
        (14, 'EPA - Energy Star Commercial Kitchen Equipment', 'Environmental', 'compliant', '2026-03-18', '2027-03-18', 'Rational Service - Anna Kowalski', 'Energy consumption within Energy Star rated parameters. Self-cleaning water usage verified.', 'None required.', NULL, '/docs/compliance/energy-star-combi-2026.pdf', 'Annual verification during service visit.'),
        (6, 'NSF/ANSI 12 - Automatic Ice Making Equipment', 'Sanitation', 'compliant', '2026-02-28', '2026-08-28', 'James Walker (Internal)', 'Ice machine sanitized. Bin interior clean. Water filter replaced. Ice sample tested — no coliform detected.', 'None required.', NULL, '/docs/compliance/ice-nsf12-feb2026.pdf', 'Semi-annual per NSF 12.'),
        (15, 'OSHA 29 CFR 1910.212 - Machine Guarding', 'Workplace Safety', 'compliant', '2026-03-08', '2026-09-08', 'Maria Santos (Internal)', 'Blade guard functioning. Interlock switch tested — blade stops within 1 second of guard lift. Non-slip feet secure.', 'None required.', NULL, '/docs/compliance/slicer-osha-mar2026.pdf', 'Semi-annual guard inspection.'),
        (2, 'NFPA 86 - Ovens and Furnaces', 'Fire Safety', 'compliant', '2025-08-01', '2026-08-01', 'FireGuard Services - Tom Brennan', 'Gas shutoff valve functional. Flame failure device tested and operational. Flue clear.', 'None required.', NULL, '/docs/compliance/nfpa86-oven-2025.pdf', 'Annual inspection.'),
        (9, 'OSHA 29 CFR 1910.212 - Machine Guarding', 'Workplace Safety', 'needs_review', '2026-01-05', '2026-04-05', 'Maria Santos (Internal)', 'Bowl guard interlock operational. However, gearbox noise noted — potential for unexpected stoppage under load.', 'Complete gearbox diagnosis and repair before clearing for full operation.', '2026-04-15', '/docs/compliance/mixer-osha-jan2026.pdf', 'Linked to WO #2 for gearbox repair.'),
        (17, 'FDA Food Code 3-501.16 - Cold Holding', 'Food Safety', 'non_compliant', '2026-04-01', '2026-04-15', 'James Walker (Internal)', 'Unit out of service — compressor failure. Temperature 22F and rising at time of inspection. Contents relocated.', 'Emergency repair in progress. All perishables moved to walk-in freezer.', '2026-04-15', '/docs/compliance/reach-in-temp-apr2026.pdf', 'Non-compliant until repair complete. See WO #3.'),
        (8, 'FDA Food Code 3-501.16 - Hot Holding', 'Food Safety', 'compliant', '2026-02-18', '2026-05-18', 'County Health Dept - Lisa Tran', 'All five wells holding at 165F or above. Thermometers calibrated. Covers in use.', 'None required.', NULL, '/docs/compliance/steam-table-hot-feb2026.pdf', 'Quarterly temp verification. Post element repair.')
      ;
    `);
    console.log('  Seeded: compliance_records (15 rows)');

    // --- VENDORS ---
    console.log('Seeding vendors...');
    await client.query(`
      INSERT INTO vendors (name, contact_person, email, phone, address, specialization, rating, total_orders, on_time_delivery_rate, average_response_time, contract_status, contract_start, contract_end, notes) VALUES
        ('Parts Town', 'Rachel Kim', 'rachel.kim@partstown.com', '(800) 438-8898', '1049 N. Industrial Dr, Addison, IL 60101', 'OEM Replacement Parts', 4.80, 47, 96.50, '1 business day', 'active', '2025-01-01', '2027-01-01', 'Primary parts supplier. Same-day shipping on most items.'),
        ('Hobart Parts & Service', 'Derek Thompson', 'dthompson@hobartservice.com', '(888) 446-2278', '701 S Ridge Ave, Troy, OH 45374', 'Hobart Equipment Service & Parts', 4.60, 12, 91.00, '2 business days', 'active', '2025-03-01', '2026-12-31', 'Factory-authorized service. Use for warranty and complex repairs.'),
        ('WebstaurantStore', 'Customer Service', 'support@webstaurantstore.com', '(717) 392-7472', '2205 Old Philadelphia Pike, Lancaster, PA 17602', 'General Restaurant Supplies', 4.50, 35, 94.00, '1 business day', 'active', '2024-06-01', '2026-06-01', 'Best pricing on consumables and filters. Free shipping over $49.'),
        ('FireGuard Services', 'Tom Brennan', 'tbrennan@fireguardservices.com', '(555) 234-8901', '340 Industrial Pkwy, Unit 12, Local City, ST 55401', 'Fire Suppression & Hood Inspection', 4.90, 8, 100.00, '4 hours', 'active', '2025-07-01', '2026-06-30', 'Licensed NFPA 96 inspector. Handles Ansul system semi-annual.'),
        ('ABC Hood Cleaning', 'Mike Rivera', 'mike@abchoodcleaning.com', '(555) 345-6789', '89 Commerce Blvd, Local City, ST 55402', 'Exhaust Hood & Ductwork Cleaning', 4.70, 6, 100.00, '2 business days', 'active', '2025-01-15', '2027-01-15', 'Night crew available for minimal disruption.'),
        ('Rational USA Service', 'Anna Kowalski', 'a.kowalski@rational-online.com', '(888) 320-7274', '1701 Golf Rd, Suite 200, Rolling Meadows, IL 60008', 'Rational Combi Oven Service', 4.85, 4, 100.00, '1 business day', 'active', '2024-03-01', '2029-03-01', 'Warranty service for iCombi Pro. ConnectedCooking remote diagnostics.'),
        ('Pitco Parts Direct', 'Gary Schultz', 'gschultz@pitco.com', '(800) 553-8024', '88 Industrial Park Dr, Bow, NH 03304', 'Pitco Fryer Parts', 4.40, 9, 88.50, '3 business days', 'active', '2025-06-01', '2027-06-01', 'OEM parts only. Discount on bulk thermostat orders.'),
        ('Traulsen OEM Parts', 'Sandra Lee', 'slee@traulsen.com', '(800) 825-8220', '4401 Blue Mound Rd, Fort Worth, TX 76106', 'Traulsen Refrigeration Parts', 4.30, 5, 85.00, '3 business days', 'active', '2025-04-01', '2027-04-01', 'Lead time can be long on compressors. Order early.'),
        ('Restaurant Equipment Supply Co.', 'Bill Paterson', 'bill@rescosupply.com', '(555) 456-7890', '1205 Restaurant Row, Local City, ST 55403', 'General Kitchen Equipment & Smallwares', 4.20, 22, 90.00, '2 business days', 'active', '2025-02-01', '2026-12-31', 'Local vendor. Good for same-day pickup on in-stock items.'),
        ('Duke Manufacturing Parts', 'Linda Chow', 'lchow@dukemfg.com', '(800) 735-3853', '2305 N Broadway, St. Louis, MO 63102', 'Duke Steam Table & Holding Equipment', 4.35, 3, 92.00, '2 business days', 'active', '2025-09-01', '2027-09-01', 'Direct factory support for E305M steam table.'),
        ('CoolTech Refrigeration Services', 'Ahmad Patel', 'apatel@cooltechrefrig.com', '(555) 567-8901', '450 HVAC Lane, Local City, ST 55404', 'Commercial Refrigeration Repair', 4.55, 15, 93.50, '4 hours', 'active', '2025-05-01', '2027-05-01', 'Emergency service available 24/7. $150 after-hours surcharge.'),
        ('Star Manufacturing Parts', 'Jennifer Moss', 'jmoss@star-mfg.com', '(800) 264-7827', '10 Sunnen Dr, St. Louis, MO 63143', 'Star Toaster & Countertop Parts', 4.25, 4, 87.00, '3 business days', 'active', '2025-08-01', '2027-08-01', 'Conveyor belts usually in stock. Check before ordering.'),
        ('Berkel Parts & Service', 'Carlos Ruiz', 'cruiz@berkelparts.com', '(800) 348-0251', '3200 Whipple Ave NW, Canton, OH 44718', 'Berkel Slicer & Prep Equipment', 4.15, 3, 90.00, '5 business days', 'active', '2025-10-01', '2027-10-01', 'Sharpening stones ship from warehouse — allow extra time.'),
        ('Eco-Chem Solutions', 'Nancy Bright', 'nbright@ecochem.com', '(555) 678-9012', '780 Green Industrial Pkwy, Local City, ST 55405', 'Cleaning Chemicals & Sanitizers', 4.60, 18, 95.00, '1 business day', 'active', '2025-03-15', '2027-03-15', 'EPA-approved products. Bulk pricing on descalers and degreasers.'),
        ('National Kitchen Equipment Brokers', 'Steve Hartman', 'shartman@nkeb.com', '(555) 789-0123', '2100 Equipment Exchange Dr, Dallas, TX 75247', 'Used & Refurbished Equipment', 3.90, 2, 80.00, '5 business days', 'inactive', '2024-01-01', '2025-12-31', 'Contract expired. Renew only if needed for used equipment sourcing.')
      ;
    `);
    console.log('  Seeded: vendors (15 rows)');

    // --- ENERGY_LOGS ---
    console.log('Seeding energy_logs...');
    await client.query(`
      INSERT INTO energy_logs (equipment_id, reading_date, energy_consumption, unit, cost, peak_usage_time, efficiency_rating, temperature_setting, operating_hours, anomaly_detected, notes) VALUES
        (1, '2026-04-01', 185.40, 'kWh', 22.25, '14:00-16:00', 92.50, '-5F', 24.00, false, 'Normal operation. Consistent with seasonal baseline.'),
        (1, '2026-03-01', 178.20, 'kWh', 21.38, '13:00-15:00', 93.10, '-5F', 24.00, false, 'Slightly lower than April due to cooler ambient temp.'),
        (7, '2026-04-01', 124.60, 'kWh', 14.95, '11:00-14:00', 91.80, '36F', 24.00, false, 'Normal. Lunch rush causes higher load.'),
        (7, '2026-03-01', 118.30, 'kWh', 14.20, '11:00-14:00', 92.40, '36F', 24.00, false, 'Consistent reading.'),
        (6, '2026-04-01', 98.50, 'kWh', 11.82, '10:00-14:00', 88.70, '12F (ice)', 18.00, false, 'Harvest cycles running normally.'),
        (6, '2026-03-01', 112.80, 'kWh', 13.54, '10:00-15:00', 82.30, '12F (ice)', 20.00, true, 'Anomaly: higher consumption pre-filter change. Resolved Feb 28.'),
        (17, '2026-04-01', 0.00, 'kWh', 0.00, 'N/A', 0.00, 'N/A', 0.00, true, 'Unit out of service — compressor failure.'),
        (17, '2026-03-01', 68.40, 'kWh', 8.21, '06:00-10:00', 78.50, '-10F', 24.00, true, 'Anomaly: consumption 18% above baseline. Compressor struggling pre-failure.'),
        (2, '2026-04-01', 42.30, 'kWh', 5.08, '06:00-09:00, 16:00-20:00', 94.20, '350-500F', 10.00, false, 'Dual peak usage for breakfast and dinner prep.'),
        (14, '2026-04-01', 38.70, 'kWh', 4.64, '07:00-10:00, 15:00-19:00', 95.80, '265-480F', 8.00, false, 'iCombi Pro highly efficient. Self-cleaning uses 2.1 kWh per cycle.'),
        (4, '2026-04-01', 56.20, 'kWh', 6.74, '11:00-14:00, 17:00-21:00', 89.10, '350F', 12.00, false, 'Four wells running lunch and dinner service.'),
        (5, '2026-04-01', 34.80, 'kWh', 4.18, '06:00-10:00, 11:00-14:00', 91.50, '375F', 10.00, false, 'Griddle usage peaks at breakfast.'),
        (3, '2026-04-01', 28.90, 'kWh', 3.47, '10:00-14:00, 19:00-22:00', 93.00, '150F wash / 180F rinse', 6.00, false, 'Two main dishwashing windows per day.'),
        (13, '2026-04-01', 22.10, 'kWh', 2.65, '14:00-16:00', 96.20, '160F to 37F', 3.00, false, 'Low duty cycle. 4-5 blast chill runs per day.'),
        (11, '2026-04-01', 82.40, 'kWh', 9.89, '08:00-22:00', 90.30, '38F', 24.00, false, 'Continuous operation. Lid openings during service increase load.'),
        (8, '2026-04-01', 18.50, 'kWh', 2.22, '10:30-14:00, 16:30-20:00', 91.00, '180F', 7.00, false, 'Steam table heated for lunch and dinner service windows.')
      ;
    `);
    console.log('  Seeded: energy_logs (16 rows)');

    // --- COST_RECORDS ---
    console.log('Seeding cost_records...');
    await client.query(`
      INSERT INTO cost_records (equipment_id, category, description, amount, labor_cost, parts_cost, vendor_id, work_order_id, date, fiscal_quarter, notes) VALUES
        (1, 'Repair', 'Walk-in freezer door hinge replacement', 95.00, 60.00, 35.00, NULL, 6, '2026-02-12', 'Q1-2026', 'In-house repair. Parts from stock.'),
        (6, 'Maintenance', 'Ice machine water filter replacement', 82.00, 15.00, 67.00, 3, 7, '2026-02-28', 'Q1-2026', 'Scheduled maintenance. Filter from WebstaurantStore.'),
        (6, 'Maintenance', 'Ice machine quarterly descale and sanitize', 57.00, 45.00, 12.00, NULL, NULL, '2026-02-28', 'Q1-2026', 'Sanitizer from existing stock.'),
        (5, 'Repair', 'Griddle thermocouple replacement', 58.00, 30.00, 28.00, 1, 9, '2026-03-07', 'Q1-2026', 'Vulcan OEM part from Parts Town.'),
        (8, 'Repair', 'Steam table heating element replacement', 105.00, 45.00, 60.00, 10, 10, '2026-02-18', 'Q1-2026', 'Duke OEM element. 1-hour install.'),
        (13, 'Repair', 'Blast chiller drain line clearing', 40.00, 35.00, 5.00, NULL, 11, '2026-03-03', 'Q1-2026', 'Compressed air and enzyme treatment.'),
        (3, 'Maintenance', 'Dishwasher quarterly deliming', 68.50, 45.00, 23.50, NULL, 4, '2026-03-15', 'Q1-2026', 'Delimer chemical from Eco-Chem.'),
        (10, 'Service Contract', 'Hood system semi-annual deep cleaning', 2200.00, 0.00, 0.00, 5, NULL, '2026-01-15', 'Q1-2026', 'ABC Hood Cleaning contract service.'),
        (10, 'Inspection', 'NFPA 96 annual fire suppression inspection', 850.00, 0.00, 0.00, 4, NULL, '2025-06-20', 'Q2-2025', 'FireGuard Services annual contract.'),
        (14, 'Maintenance', 'Combi oven descale treatment', 18.00, 0.00, 18.00, 6, NULL, '2026-03-18', 'Q1-2026', 'Self-service descale. 3 Rational tablets used.'),
        (17, 'Repair', 'Reach-in freezer compressor replacement (estimated)', 1800.00, 450.00, 1350.00, 8, 3, '2026-04-12', 'Q2-2026', 'Estimate pending completion. Compressor on order.'),
        (9, 'Diagnosis', 'Mixer gearbox diagnostic labor', 120.00, 120.00, 0.00, NULL, 2, '2026-04-08', 'Q2-2026', 'Initial diagnosis. Full teardown quote pending.'),
        (2, 'Maintenance', 'Convection oven calibration and gasket inspection', 75.00, 60.00, 15.00, NULL, NULL, '2026-03-01', 'Q1-2026', 'Routine quarterly calibration. Gaskets OK.'),
        (15, 'Maintenance', 'Slicer blade sharpening and safety inspection', 35.00, 30.00, 5.00, NULL, NULL, '2026-03-08', 'Q1-2026', 'Monthly sharpening. Guard and interlock tested.'),
        (7, 'Maintenance', 'Walk-in cooler evaporator coil cleaning', 85.00, 60.00, 25.00, NULL, NULL, '2026-03-10', 'Q1-2026', 'Quarterly coil clean. Drain line clear.'),
        (4, 'Parts', 'Fryer thermostat assembly (stock replenishment)', 248.00, 0.00, 248.00, 7, NULL, '2025-12-01', 'Q4-2025', 'Two units ordered for stock. Pitco OEM.')
      ;
    `);
    console.log('  Seeded: cost_records (16 rows)');

    // --- TECHNICIANS ---
    console.log('Seeding technicians...');
    await client.query(`
      INSERT INTO technicians (name, email, phone, specialization, certification, experience_years, availability_status, current_workload, max_workload, hourly_rate, rating, jobs_completed, notes) VALUES
        ('James Walker', 'james.walker@kitchen.com', '(555) 100-2001', 'General Kitchen Equipment', 'EPA 608 Universal, CFESA Master Technician, ServSafe Manager', 12, 'available', 3, 5, 45.00, 4.85, 312, 'Lead technician. Handles most in-house repairs and preventive maintenance.'),
        ('Roberto Diaz', 'roberto.diaz@kitchen.com', '(555) 100-2002', 'Refrigeration & HVAC', 'EPA 608 Universal, HVAC-R Journeyman, CFESA Certified', 8, 'available', 2, 5, 42.00, 4.70, 198, 'Refrigeration specialist. Backup for James on complex cooling systems.'),
        ('Sarah Mitchell', 'sarah.mitchell@kitchen.com', '(555) 100-2003', 'Electrical & Controls', 'Master Electrician License, CFESA Certified, OSHA 30-Hour', 10, 'available', 1, 5, 48.00, 4.90, 245, 'Electrical specialist. Handles all control board diagnostics and wiring.'),
        ('Marcus Johnson', 'marcus.johnson@kitchen.com', '(555) 100-2004', 'Gas Equipment & Plumbing', 'Gas Fitter License, Backflow Prevention Cert, CFESA Certified', 15, 'on_leave', 0, 5, 50.00, 4.75, 410, 'Senior tech. Currently on leave until April 20. Gas line specialist.'),
        ('Emily Chen', 'emily.chen@kitchen.com', '(555) 100-2005', 'Preventive Maintenance', 'CFESA Certified, ServSafe Manager, EPA 608 Type II', 5, 'available', 4, 6, 38.00, 4.60, 156, 'Handles scheduled PM tasks and filter replacements. Very thorough.'),
        ('David Kowalski', 'david.kowalski@kitchen.com', '(555) 100-2006', 'Refrigeration & Ice Machines', 'EPA 608 Universal, Manitowoc Certified Tech, CFESA Certified', 7, 'available', 2, 5, 40.00, 4.55, 178, 'Ice machine and walk-in specialist. Trained on Manitowoc and Hoshizaki.'),
        ('Angela Torres', 'angela.torres@kitchen.com', '(555) 100-2007', 'Cooking Equipment', 'CFESA Certified, Gas Fitter License, Vulcan Factory Trained', 9, 'busy', 5, 5, 44.00, 4.80, 267, 'Fryer, griddle, and oven specialist. At max workload this week.'),
        ('Tom Brennan', 'tom.brennan@fireguardservices.com', '(555) 234-8901', 'Fire Suppression Systems', 'NFPA 96 Certified Inspector, Fire Protection Engineer PE', 20, 'available', 1, 3, 85.00, 4.95, 520, 'External contractor — FireGuard Services. Ansul system specialist.'),
        ('Mike Rivera', 'mike@abchoodcleaning.com', '(555) 345-6789', 'Exhaust Hood Cleaning', 'IKECA Certified Hood Cleaner, NFPA 96 Compliance', 12, 'available', 0, 4, 65.00, 4.70, 340, 'External contractor — ABC Hood Cleaning. Night crew leader.'),
        ('Anna Kowalski', 'a.kowalski@rational-online.com', '(555) 274-0001', 'Rational Combi Ovens', 'Rational Factory Certified Service Engineer Level 3', 6, 'available', 1, 4, 75.00, 4.85, 190, 'External — Rational USA. Handles warranty service and firmware updates.'),
        ('Kevin Park', 'kevin.park@kitchen.com', '(555) 100-2008', 'Dishwashers & Sanitation Equipment', 'Hobart Certified Technician, EPA 608 Type I, CFESA Certified', 6, 'available', 1, 5, 39.00, 4.50, 142, 'Dishwasher and warewashing specialist. Trained on Hobart and Ecolab systems.'),
        ('Patricia Gomez', 'patricia.gomez@kitchen.com', '(555) 100-2009', 'General Maintenance', 'CFESA Certified, OSHA 10-Hour, Certified Maintenance Mechanic', 4, 'available', 2, 5, 36.00, 4.40, 98, 'Junior technician. Handles routine tasks and assists senior techs.'),
        ('Ahmad Patel', 'apatel@cooltechrefrig.com', '(555) 567-8901', 'Commercial Refrigeration', 'EPA 608 Universal, CFESA Master, Certified Refrigeration Tech', 18, 'available', 2, 6, 70.00, 4.65, 480, 'External — CoolTech Refrigeration. 24/7 emergency service available.'),
        ('Lisa Tran', 'ltran@countyhealthdept.gov', '(555) 890-1234', 'Health & Safety Inspection', 'Registered Environmental Health Specialist (REHS), ServSafe Instructor', 14, 'available', 0, 10, 0.00, 4.90, 850, 'County Health Dept inspector. Not a repair tech — inspection role only.'),
        ('Chris Daniels', 'chris.daniels@kitchen.com', '(555) 100-2010', 'Bakery & Prep Equipment', 'CFESA Certified, Hobart Factory Trained (Mixers), Berkel Certified', 8, 'available', 1, 5, 41.00, 4.65, 205, 'Mixer, slicer, and bakery equipment specialist. Handles gearbox rebuilds.')
      ;
    `);
    console.log('  Seeded: technicians (15 rows)');

    console.log('\nDatabase seed completed successfully!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

seed();
