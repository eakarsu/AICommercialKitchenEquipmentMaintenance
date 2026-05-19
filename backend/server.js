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
app.use('/api/ai', require('./routes/aiNew'));
// Audit-recommended additions (notifications, webhooks)
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/custom-views', require('./routes/customViews'));

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


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-0-mounted-chat-style-ai-endpoints-despite-aicenter', require('./routes/gap_0_mounted_chat_style_ai_endpoints_despite_aicenter'));
app.use('/api/gap-no-ai-diagnostic-from-photo-error-code-lookup', require('./routes/gap_no_ai_diagnostic_from_photo_error_code_lookup'));
app.use('/api/gap-no-ai-predictive-failure-model-from-equipment-tele', require('./routes/gap_no_ai_predictive_failure_model_from_equipment_tele'));
app.use('/api/gap-no-ai-service-manual-q-a-for-technicians', require('./routes/gap_no_ai_service_manual_q_a_for_technicians'));
app.use('/api/gap-notification-routes-exist-but-no-sms-push-delivery', require('./routes/gap_notification_routes_exist_but_no_sms_push_delivery'));
app.use('/api/gap-no-direct-fsm-platform-api-client-servicetitan-hou', require('./routes/gap_no_direct_fsm_platform_api_client_servicetitan_hou'));
app.use('/api/gap-no-supplier-order-workflow-on-parts-catalog', require('./routes/gap_no_supplier_order_workflow_on_parts_catalog'));
app.use('/api/gap-no-mobile-technician-app-with-offline-mode', require('./routes/gap_no_mobile_technician_app_with_offline_mode'));
app.use('/api/gap-no-customer-self-service-repair-request-portal', require('./routes/gap_no_customer_self_service_repair_request_portal'));
app.use('/api/gap-no-iot-telemetry-stream-ingestion', require('./routes/gap_no_iot_telemetry_stream_ingestion'));

// 404 (registered last so custom-views is reachable above)
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});
