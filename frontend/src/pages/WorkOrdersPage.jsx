import { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

const priorityBadge = {
  emergency: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  low: 'bg-green-500/15 text-green-400 border border-green-500/30',
};

const statusBadge = {
  open: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  assigned: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const detailFields = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'priority', label: 'Priority', type: 'badge' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'assigned_to', label: 'Assigned To' },
  { key: 'requested_by', label: 'Requested By' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'completed_date', label: 'Completed Date' },
  { key: 'estimated_cost', label: 'Estimated Cost' },
  { key: 'actual_cost', label: 'Actual Cost' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'equipment_id', label: 'Equipment ID', type: 'number' },
  {
    key: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'emergency', label: 'Emergency' },
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
      { value: 'assigned', label: 'Assigned' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  { key: 'assigned_to', label: 'Assigned To', type: 'text' },
  { key: 'requested_by', label: 'Requested By', type: 'text' },
  { key: 'due_date', label: 'Due Date', type: 'date' },
  { key: 'estimated_cost', label: 'Estimated Cost', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function WorkOrdersPage() {
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
      setLoading(true);
      const data = await api.getWorkOrders();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load work orders');
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
      (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
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
    if (!window.confirm('Are you sure you want to delete this work order?')) return;
    try {
      await api.deleteWorkOrder(id);
      toast.success('Work order deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete work order');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updateWorkOrder(editItem.id || editItem._id, data);
        toast.success('Work order updated');
      } else {
        await api.createWorkOrder(data);
        toast.success('Work order created');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update work order' : 'Failed to create work order');
      throw err;
    }
  };

  const handleAI = async (item) => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const result = await api.aiPrioritizeWorkOrder(item.id || item._id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const getBadgeClass = (type, value) => {
    if (!value) return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    const v = String(value).toLowerCase();
    if (type === 'priority') return priorityBadge[v] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    return statusBadge[v] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Work Orders</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage and track maintenance work orders
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add Work Order
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Equipment</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400">Loading work orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No work orders found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id || item._id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-200 font-medium">{item.title || '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.equipment_name || '--'}</td>
                    <td className="px-6 py-4">
                      {item.priority ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getBadgeClass('priority', item.priority)}`}>
                          {String(item.priority).replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getBadgeClass('status', item.status)}`}>
                          {String(item.status).replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.assigned_to || '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.due_date || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Row count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            {filtered.length} work order{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedItem(null); setAiResult(null); }}
        title="Work Order Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Prioritize"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit Work Order' : 'New Work Order'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
