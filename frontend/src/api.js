const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password, role) => request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
  getMe: () => request('/auth/me'),

  // Equipment
  getEquipment: () => request('/equipment'),
  getEquipmentById: (id) => request(`/equipment/${id}`),
  createEquipment: (data) => request('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  updateEquipment: (id, data) => request(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEquipment: (id) => request(`/equipment/${id}`, { method: 'DELETE' }),
  aiAnalyzeEquipment: (id) => request(`/equipment/${id}/ai-analyze`, { method: 'POST' }),

  // Maintenance
  getMaintenance: () => request('/maintenance'),
  getMaintenanceById: (id) => request(`/maintenance/${id}`),
  createMaintenance: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  updateMaintenance: (id, data) => request(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaintenance: (id) => request(`/maintenance/${id}`, { method: 'DELETE' }),
  aiPredictMaintenance: (id) => request(`/maintenance/${id}/ai-predict`, { method: 'POST' }),

  // Work Orders
  getWorkOrders: () => request('/work-orders'),
  getWorkOrderById: (id) => request(`/work-orders/${id}`),
  createWorkOrder: (data) => request('/work-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkOrder: (id, data) => request(`/work-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkOrder: (id) => request(`/work-orders/${id}`, { method: 'DELETE' }),
  aiPrioritizeWorkOrder: (id) => request(`/work-orders/${id}/ai-prioritize`, { method: 'POST' }),

  // Parts
  getParts: () => request('/parts'),
  getPartById: (id) => request(`/parts/${id}`),
  createPart: (data) => request('/parts', { method: 'POST', body: JSON.stringify(data) }),
  updatePart: (id, data) => request(`/parts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePart: (id) => request(`/parts/${id}`, { method: 'DELETE' }),
  aiReorderPart: (id) => request(`/parts/${id}/ai-reorder`, { method: 'POST' }),

  // Diagnostics
  getDiagnostics: () => request('/diagnostics'),
  getDiagnosticById: (id) => request(`/diagnostics/${id}`),
  createDiagnostic: (data) => request('/diagnostics', { method: 'POST', body: JSON.stringify(data) }),
  updateDiagnostic: (id, data) => request(`/diagnostics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDiagnostic: (id) => request(`/diagnostics/${id}`, { method: 'DELETE' }),
  aiDiagnose: (id) => request(`/diagnostics/${id}/ai-diagnose`, { method: 'POST' }),

  // Compliance
  getCompliance: () => request('/compliance'),
  getComplianceById: (id) => request(`/compliance/${id}`),
  createCompliance: (data) => request('/compliance', { method: 'POST', body: JSON.stringify(data) }),
  updateCompliance: (id, data) => request(`/compliance/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCompliance: (id) => request(`/compliance/${id}`, { method: 'DELETE' }),
  aiCheckCompliance: (id) => request(`/compliance/${id}/ai-check`, { method: 'POST' }),

  // Vendors
  getVendors: () => request('/vendors'),
  getVendorById: (id) => request(`/vendors/${id}`),
  createVendor: (data) => request('/vendors', { method: 'POST', body: JSON.stringify(data) }),
  updateVendor: (id, data) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVendor: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
  aiEvaluateVendor: (id) => request(`/vendors/${id}/ai-evaluate`, { method: 'POST' }),

  // Energy
  getEnergy: () => request('/energy'),
  getEnergyById: (id) => request(`/energy/${id}`),
  createEnergy: (data) => request('/energy', { method: 'POST', body: JSON.stringify(data) }),
  updateEnergy: (id, data) => request(`/energy/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEnergy: (id) => request(`/energy/${id}`, { method: 'DELETE' }),
  aiOptimizeEnergy: (id) => request(`/energy/${id}/ai-optimize`, { method: 'POST' }),

  // Costs
  getCosts: () => request('/costs'),
  getCostById: (id) => request(`/costs/${id}`),
  createCost: (data) => request('/costs', { method: 'POST', body: JSON.stringify(data) }),
  updateCost: (id, data) => request(`/costs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCost: (id) => request(`/costs/${id}`, { method: 'DELETE' }),
  aiAnalyzeCosts: () => request('/costs/ai-analyze', { method: 'POST' }),

  // Technicians
  getTechnicians: () => request('/technicians'),
  getTechnicianById: (id) => request(`/technicians/${id}`),
  createTechnician: (data) => request('/technicians', { method: 'POST', body: JSON.stringify(data) }),
  updateTechnician: (id, data) => request(`/technicians/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTechnician: (id) => request(`/technicians/${id}`, { method: 'DELETE' }),
  aiScheduleTechnician: (id) => request(`/technicians/${id}/ai-schedule`, { method: 'POST' }),

  // AI Center
  aiDiagnosticAssistant: (data) => request('/ai-center/diagnostic-assistant', { method: 'POST', body: JSON.stringify(data) }),
  aiPredictiveAnalytics: (data) => request('/ai-center/predictive-analytics', { method: 'POST', body: JSON.stringify(data) }),
  aiCostOptimizer: (data) => request('/ai-center/cost-optimizer', { method: 'POST', body: JSON.stringify(data) }),
  aiComplianceChecker: (data) => request('/ai-center/compliance-checker', { method: 'POST', body: JSON.stringify(data) }),
  aiEnergyAdvisor: (data) => request('/ai-center/energy-advisor', { method: 'POST', body: JSON.stringify(data) }),
  aiReportGenerator: (data) => request('/ai-center/report-generator', { method: 'POST', body: JSON.stringify(data) }),
  aiSmartChat: (data) => request('/ai-center/smart-chat', { method: 'POST', body: JSON.stringify(data) }),
};
