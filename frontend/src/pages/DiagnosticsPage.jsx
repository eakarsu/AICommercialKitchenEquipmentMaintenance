import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

function getSeverityBadge(severity) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'badge-danger';
    case 'high':
      return 'badge-warning';
    case 'medium':
      return 'badge-success';
    case 'low':
      return 'badge-info';
    default:
      return 'badge-info';
  }
}

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'open':
    case 'investigating':
      return 'badge-info';
    case 'resolved':
    case 'closed':
      return 'badge-success';
    default:
      return 'badge-info';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatus(value) {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const detailFields = [
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'reported_issue', label: 'Reported Issue' },
  { key: 'symptoms', label: 'Symptoms', type: 'textarea' },
  { key: 'diagnosis', label: 'Diagnosis', type: 'textarea' },
  { key: 'severity', label: 'Severity', type: 'badge' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'technician', label: 'Technician' },
  { key: 'resolution', label: 'Resolution', type: 'textarea' },
  { key: 'resolved_at', label: 'Resolved At' },
  { key: 'created_at', label: 'Created At' },
];

const formFields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'number', required: true },
  { key: 'reported_issue', label: 'Reported Issue', type: 'text', required: true },
  { key: 'symptoms', label: 'Symptoms', type: 'textarea' },
  { key: 'diagnosis', label: 'Diagnosis', type: 'textarea' },
  {
    key: 'severity',
    label: 'Severity',
    type: 'select',
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'investigating', label: 'Investigating' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  { key: 'technician', label: 'Technician', type: 'text' },
  { key: 'resolution', label: 'Resolution', type: 'textarea' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function DiagnosticsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fetchItems = async () => {
    try {
      const data = await api.getDiagnostics();
      setItems(data);
    } catch (err) {
      toast.error('Failed to load diagnostics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter(item => {
    const matchesSearch =
      !search ||
      (item.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.reported_issue || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.technician || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleAdd = () => {
    setEditItem(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this diagnostic?')) return;
    try {
      await api.deleteDiagnostic(id);
      toast.success('Diagnostic deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updateDiagnostic(editItem.id, data);
        toast.success('Diagnostic updated successfully');
      } else {
        await api.createDiagnostic(data);
        toast.success('Diagnostic created successfully');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
      throw err;
    }
  };

  const handleAI = async (item) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api.aiDiagnose(item.id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Diagnostics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage equipment diagnostics and AI-powered troubleshooting
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add Diagnostic
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by equipment, issue, or technician..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-slate-800 border border-slate-700/50 rounded-xl text-sm text-slate-200 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Reported Issue</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Technician</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-slate-500 py-8">
                  No diagnostics found
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                  <td className="text-slate-200 font-medium">{item.equipment_name || '—'}</td>
                  <td className="text-slate-300 max-w-[200px] truncate">{item.reported_issue || '—'}</td>
                  <td>
                    <span className={getSeverityBadge(item.severity)}>
                      {formatStatus(item.severity)}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadge(item.status)}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  <td className="text-slate-400">{item.technician || '—'}</td>
                  <td className="text-slate-400 text-sm">{formatDate(item.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="text-xs text-slate-500">
        Showing {filtered.length} of {items.length} diagnostics
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedItem(null); setAiResult(null); }}
        title="Diagnostic Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Diagnose"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit Diagnostic' : 'New Diagnostic'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
