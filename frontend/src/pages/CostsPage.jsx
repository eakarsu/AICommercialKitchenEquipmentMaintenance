import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel, HiSparkles } from 'react-icons/hi2';

const categoryBadgeColors = {
  repair: 'bg-red-500/15 text-red-400 border border-red-500/30',
  emergency: 'bg-red-500/15 text-red-400 border border-red-500/30',
  preventive: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  inspection: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  replacement: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

const detailFields = [
  { key: 'description', label: 'Description' },
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'category', label: 'Category', type: 'badge' },
  { key: 'amount', label: 'Amount' },
  { key: 'labor_cost', label: 'Labor Cost' },
  { key: 'parts_cost', label: 'Parts Cost' },
  { key: 'vendor_id', label: 'Vendor ID' },
  { key: 'work_order_id', label: 'Work Order ID' },
  { key: 'date', label: 'Date' },
  { key: 'fiscal_quarter', label: 'Fiscal Quarter' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'number' },
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'repair', label: 'Repair' },
      { value: 'replacement', label: 'Replacement' },
      { value: 'preventive', label: 'Preventive' },
      { value: 'inspection', label: 'Inspection' },
      { value: 'emergency', label: 'Emergency' },
    ],
  },
  { key: 'description', label: 'Description', type: 'text', required: true },
  { key: 'amount', label: 'Amount', type: 'number', required: true },
  { key: 'labor_cost', label: 'Labor Cost', type: 'number' },
  { key: 'parts_cost', label: 'Parts Cost', type: 'number' },
  { key: 'vendor_id', label: 'Vendor ID', type: 'number' },
  { key: 'work_order_id', label: 'Work Order ID', type: 'number' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'fiscal_quarter', label: 'Fiscal Quarter', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const categoryFilterOptions = [
  { value: '', label: 'All Categories' },
  { value: 'repair', label: 'Repair' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'emergency', label: 'Emergency' },
];

function CategoryBadge({ category }) {
  if (!category) return <span className="text-slate-500">--</span>;
  const colors = categoryBadgeColors[category] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors} capitalize`}>
      {category.replace(/_/g, ' ')}
    </span>
  );
}

function formatCurrency(val) {
  if (val == null || val === '') return '--';
  return '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCurrentQuarter() {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

export default function CostsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getCosts();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load costs: ' + err.message);
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
      (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Summary stats
  const stats = useMemo(() => {
    const totalCosts = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const avgCost = items.length > 0 ? totalCosts / items.length : 0;

    // Highest category by spending
    const categoryTotals = {};
    items.forEach((i) => {
      if (i.category) {
        categoryTotals[i.category] = (categoryTotals[i.category] || 0) + (Number(i.amount) || 0);
      }
    });
    const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    // This quarter costs
    const currentQ = getCurrentQuarter();
    const thisQuarterCosts = items
      .filter((i) => i.fiscal_quarter === currentQ)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    return { totalCosts, avgCost, highestCategory, thisQuarterCosts };
  }, [items]);

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowDetail(false);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cost record?')) return;
    try {
      await api.deleteCost(id);
      toast.success('Cost record deleted successfully');
      setShowDetail(false);
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  const handleAI = async () => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const result = await api.aiAnalyzeCosts();
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
      toast.error('AI analysis failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updateCost(editItem.id || editItem._id, data);
        toast.success('Cost record updated successfully');
      } else {
        await api.createCost(data);
        toast.success('Cost record created successfully');
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
          <h1 className="text-2xl font-bold text-slate-100">Costs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track and analyze maintenance costs across all equipment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
          >
            {aiLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <HiSparkles className="text-lg" />
                AI Cost Analysis
              </>
            )}
          </button>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
          >
            <HiPlus className="text-lg" />
            Add New
          </button>
        </div>
      </div>

      {/* AI Response Display */}
      {aiResult && (
        <AIResponseDisplay result={aiResult} />
      )}

      {/* Summary Stats */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total Costs</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.totalCosts)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Average Cost</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.avgCost)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Highest Category</p>
            <p className="text-2xl font-bold text-slate-100 capitalize">
              {stats.highestCategory ? stats.highestCategory[0] : '--'}
            </p>
            {stats.highestCategory && (
              <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(stats.highestCategory[1])}</p>
            )}
          </div>
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">This Quarter</p>
            <p className="text-2xl font-bold text-slate-100">{formatCurrency(stats.thisQuarterCosts)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{getCurrentQuarter()}</p>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search costs by description, equipment, or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none cursor-pointer min-w-[180px]"
          >
            {categoryFilterOptions.map((opt) => (
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
              <p className="text-sm text-slate-400">Loading costs...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <HiMagnifyingGlass className="text-2xl text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No cost records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {items.length === 0
                ? 'Get started by adding your first cost record.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Equipment
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Labor Cost
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Parts Cost
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Date
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
                      {item.description || '--'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">
                      {item.equipment_name || '--'}
                    </td>
                    <td className="px-5 py-4">
                      <CategoryBadge category={item.category} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-200 text-right font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 text-right hidden lg:table-cell">
                      {formatCurrency(item.labor_cost)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 text-right hidden lg:table-cell">
                      {formatCurrency(item.parts_cost)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">
                      {item.date || '--'}
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
              Showing {filtered.length} of {items.length} cost records
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal - No AI button, only Edit and Delete */}
      <DetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedItem(null);
        }}
        title="Cost Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Cost Record' : 'Add Cost Record'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
