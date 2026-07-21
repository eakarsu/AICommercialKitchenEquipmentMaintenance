const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('./config/runtime').validateRuntime();

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((value) => value.trim()).filter(Boolean);
app.use(cors({ origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('Origin not allowed')); }, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/work-orders', require('./routes/workOrders'));
app.use('/api/parts', require('./routes/parts'));
app.use('/api/diagnostics', require('./routes/diagnostics'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/energy', require('./routes/energy'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/ai-center', require('./routes/aiCenter'));
app.use('/api/ai', require('./routes/aiNew'));
// Audit-recommended additions (notifications, webhooks)
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/custom-views', require('./routes/customViews'));
app.use('/api/governed-maintenance', require('./routes/governedMaintenance'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use('/api/field-service-dispatcher', require('./routes/fieldServiceDispatcher')); // apply pass 6 — audit custom suggestion

app.use('/api/oem-manual-rag', require('./routes/oemManualRag')); // apply pass 6 — audit custom suggestion

app.use('/api/kitchen-telemetry', require('./routes/kitchenTelemetryStream')); // apply pass 6 — audit custom suggestion

app.use('/api/oem-mmr-white-label', require('./routes/oemMmrWhiteLabel')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});


// 404 (registered last so custom-views is reachable above)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});
