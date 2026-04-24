import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

function getCategoryBadge(category) {
  switch (category?.toLowerCase()) {
    case 'health':
    case 'food_safety':
      return 'badge-danger';
    case 'safety':
    case 'fire':
      return 'badge-warning';
    case 'environmental':
      return 'badge-success';
    default:
      return 'badge-info';
  }
}

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'non_compliant':
    case 'expired':
      return 'badge-danger';
    case 'pending_review':
      return 'badge-warning';
    case 'compliant':
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
  { key: 'regulation_name', label: 'Regulation' },
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'last_inspection', label: 'Last Inspection' },
  { key: 'next_inspection', label: 'Next Inspection' },
  { key: 'inspector', label: 'Inspector' },
  { key: 'findings', label: 'Findings', type: 'textarea' },
  { key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'documentation_url', label: 'Documentation URL' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'number', required: true },
  { key: 'regulation_name', label: 'Regulation Name', type: 'text', required: true },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'health', label: 'Health' },
      { value: 'safety', label: 'Safety' },
      { value: 'fire', label: 'Fire' },
      { value: 'environmental', label: 'Environmental' },
      { value: 'food_safety', label: 'Food Safety' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'compliant', label: 'Compliant' },
      { value: 'non_compliant', label: 'Non-Compliant' },
      { value: 'pending_review', label: 'Pending Review' },
      { value: 'expired', label: 'Expired' },
    ],
  },
  { key: 'last_inspection', label: 'Last Inspection', type: 'date' },
  { key: 'next_inspection', label: 'Next Inspection', type: 'date' },
  { key: 'inspector', label: 'Inspector', type: 'text' },
  { key: 'findings', label: 'Findings', type: 'textarea' },
  { key: 'corrective_actions', label: 'Corrective Actions', type: 'textarea' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function CompliancePage() {
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
      const data = await api.getCompliance();
      setItems(data);
    } catch (err) {
      toast.error('Failed to load compliance records: ' + err.message);
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
      (item.regulation_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.inspector || '').toLowerCase().includes(search.toLowerCase());
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
    if (!window.confirm('Are you sure you want to delete this compliance record?')) return;
    try {
      await api.deleteCompliance(id);
      toast.success('Compliance record deleted successfully');
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
        await api.updateCompliance(editItem.id, data);
        toast.success('Compliance record updated successfully');
      } else {
        await api.createCompliance(data);
        toast.success('Compliance record created successfully');
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
      const result = await api.aiCheckCompliance(item.id);
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
          <p className="text-slate-400 text-sm">Loading compliance records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compliance</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track regulatory compliance and AI-powered compliance checks
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add Compliance
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by regulation, equipment, or inspector..."
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
            <option value="compliant">Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="pending_review">Pending Review</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Regulation</th>
              <th>Equipment</th>
              <th>Category</th>
              <th>Status</th>
              <th>Next Inspection</th>
              <th>Deadline</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-slate-500 py-8">
                  No compliance records found
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)} className="cursor-pointer">
                  <td className="text-slate-200 font-medium">{item.regulation_name || '—'}</td>
                  <td className="text-slate-300">{item.equipment_name || '—'}</td>
                  <td>
                    <span className={getCategoryBadge(item.category)}>
                      {formatStatus(item.category)}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadge(item.status)}>
                      {formatStatus(item.status)}
                    </span>
                  </td>
                  <td className="text-slate-400 text-sm">{formatDate(item.next_inspection)}</td>
                  <td className="text-slate-400 text-sm">{formatDate(item.deadline)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <div className="text-xs text-slate-500">
        Showing {filtered.length} of {items.length} compliance records
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedItem(null); setAiResult(null); }}
        title="Compliance Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Compliance Check"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit Compliance Record' : 'New Compliance Record'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
