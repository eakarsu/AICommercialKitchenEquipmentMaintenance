import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import EquipmentPage from './pages/EquipmentPage';
import MaintenancePage from './pages/MaintenancePage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import PartsPage from './pages/PartsPage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import CompliancePage from './pages/CompliancePage';
import VendorsPage from './pages/VendorsPage';
import EnergyPage from './pages/EnergyPage';
import CostsPage from './pages/CostsPage';
import TechniciansPage from './pages/TechniciansPage';
import AICenterPage from './pages/AICenterPage';
import AILabPage from './pages/AILabPage';
import NotificationsPage from './pages/NotificationsPage';
import WebhooksPage from './pages/WebhooksPage';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
        success: { iconTheme: { primary: '#10b981', secondary: '#e2e8f0' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#e2e8f0' } },
      }} />
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/work-orders" element={<WorkOrdersPage />} />
          <Route path="/parts" element={<PartsPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/energy" element={<EnergyPage />} />
          <Route path="/costs" element={<CostsPage />} />
          <Route path="/technicians" element={<TechniciansPage />} />
          <Route path="/ai-center" element={<AICenterPage />} />
          <Route path="/ai-lab" element={<AILabPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </>
  );
}
