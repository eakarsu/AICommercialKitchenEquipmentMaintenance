const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

app.use(cors());
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
