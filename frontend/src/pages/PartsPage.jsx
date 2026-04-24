import { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

const statusBadge = {
  in_stock: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  low_stock: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  out_of_stock: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const detailFields = [
  { key: 'name', label: 'Name' },
  { key: 'part_number', label: 'Part Number' },
  { key: 'category', label: 'Category' },
  { key: 'compatible_equipment', label: 'Compatible Equipment' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'minimum_stock', label: 'Minimum Stock' },
  { key: 'unit_cost', label: 'Unit Cost' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'last_ordered', label: 'Last Ordered' },
  { key: 'lead_time_days', label: 'Lead Time (Days)' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'part_number', label: 'Part Number', type: 'text', required: true },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'compatible_equipment', label: 'Compatible Equipment', type: 'text' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'minimum_stock', label: 'Minimum Stock', type: 'number' },
  { key: 'unit_cost', label: 'Unit Cost', type: 'number' },
  { key: 'supplier', label: 'Supplier', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'in_stock', label: 'In Stock' },
      { value: 'low_stock', label: 'Low Stock' },
      { value: 'out_of_stock', label: 'Out of Stock' },
    ],
  },
  { key: 'lead_time_days', label: 'Lead Time (Days)', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function PartsPage() {
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
      const data = await api.getParts();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load parts');
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
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.part_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.supplier || '').toLowerCase().includes(search.toLowerCase());
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
    if (!window.confirm('Are you sure you want to delete this part?')) return;
    try {
      await api.deletePart(id);
      toast.success('Part deleted');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete part');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updatePart(editItem.id || editItem._id, data);
        toast.success('Part updated');
      } else {
        await api.createPart(data);
        toast.success('Part created');
      }
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error(editItem ? 'Failed to update part' : 'Failed to create part');
      throw err;
    }
  };

  const handleAI = async (item) => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const result = await api.aiReorderPart(item.id || item._id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const getBadgeClass = (value) => {
    if (!value) return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    return statusBadge[String(value).toLowerCase()] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Parts Inventory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage spare parts and inventory levels
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add Part
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search parts..."
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
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Part Number</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Min Stock</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400">Loading parts...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                    No parts found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.id || item._id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-200 font-medium">{item.name || '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{item.part_number || '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.category || '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-200">{item.quantity != null ? item.quantity : '--'}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.minimum_stock != null ? item.minimum_stock : '--'}</td>
                    <td className="px-6 py-4">
                      {item.status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getBadgeClass(item.status)}`}>
                          {String(item.status).replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.supplier || '--'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Row count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-700/50 text-xs text-slate-500">
            {filtered.length} part{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedItem(null); setAiResult(null); }}
        title="Part Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Reorder Analysis"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditItem(null); }}
        title={editItem ? 'Edit Part' : 'New Part'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
