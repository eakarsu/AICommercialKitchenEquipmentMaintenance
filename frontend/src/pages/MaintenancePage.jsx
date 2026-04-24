import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

const statusBadgeColors = {
  scheduled: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  in_progress: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const priorityBadgeColors = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  low: 'bg-green-500/15 text-green-400 border border-green-500/30',
};

const detailFields = [
  { key: 'task_name', label: 'Task Name' },
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'priority', label: 'Priority', type: 'badge' },
  { key: 'last_completed', label: 'Last Completed' },
  { key: 'next_due', label: 'Next Due' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'estimated_duration', label: 'Estimated Duration' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'task_name', label: 'Task Name', type: 'text', required: true },
  { key: 'equipment_id', label: 'Equipment ID', type: 'number' },
  { key: 'description', label: 'Description', type: 'textarea' },
  {
    key: 'frequency',
    label: 'Frequency',
    type: 'select',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
  },
  { key: 'next_due', label: 'Next Due', type: 'date' },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'overdue', label: 'Overdue' },
    ],
  },
  { key: 'estimated_duration', label: 'Estimated Duration', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const statusFilterOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
];

function Badge({ value, colorMap }) {
  if (!value) return <span className="text-slate-500">--</span>;
  const colors = colorMap[value] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors} capitalize`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export default function MaintenancePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getMaintenance();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load maintenance tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      (item.task_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.assigned_to || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance task?')) return;
    try {
      await api.deleteMaintenance(id);
      toast.success('Maintenance task deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handleAI = async (item) => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const result = await api.aiPredictMaintenance(item.id || item._id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
      toast.error('AI prediction failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updateMaintenance(editItem.id || editItem._id, data);
        toast.success('Maintenance task updated successfully');
      } else {
        await api.createMaintenance(data);
        toast.success('Maintenance task created successfully');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
      throw err;
    }
  };

  const handleAddNew = () => {
    setEditItem(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Maintenance</h1>
          <p className="text-sm text-slate-400 mt-1">
            Schedule and track maintenance tasks for all equipment
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add New
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task name, equipment, or assignee..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none cursor-pointer min-w-[180px]"
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading maintenance tasks...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <HiMagnifyingGlass className="text-2xl text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No maintenance tasks found</p>
            <p className="text-xs text-slate-500 mt-1">
              {items.length === 0
                ? 'Get started by creating your first maintenance task.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Task Name
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Equipment
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Frequency
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Next Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((item) => (
                  <tr
                    key={item.id || item._id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 text-sm font-medium text-slate-200">
                      {item.task_name || '--'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">
                      {item.equipment_name || '--'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 capitalize hidden lg:table-cell">
                      {item.frequency || '--'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge value={item.priority} colorMap={priorityBadgeColors} />
                    </td>
                    <td className="px-5 py-4">
                      <Badge value={item.status} colorMap={statusBadgeColors} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden lg:table-cell">
                      {item.next_due || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!loading && filtered.length > 0 && (
          <div className="border-t border-slate-700/50 px-5 py-3 flex items-center justify-between bg-slate-900/50">
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {items.length} tasks
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedItem(null);
          setAiResult(null);
        }}
        title="Maintenance Task Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Predict Maintenance"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Maintenance Task' : 'Add Maintenance Task'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
