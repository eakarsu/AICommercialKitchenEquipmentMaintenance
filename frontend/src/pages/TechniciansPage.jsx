import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

const availabilityBadgeColors = {
  available: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  on_job: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  off_duty: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  on_leave: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const detailFields = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'certification', label: 'Certification' },
  { key: 'experience_years', label: 'Experience (Years)' },
  { key: 'availability_status', label: 'Availability', type: 'badge' },
  { key: 'current_workload', label: 'Current Workload' },
  { key: 'max_workload', label: 'Max Workload' },
  { key: 'hourly_rate', label: 'Hourly Rate' },
  { key: 'rating', label: 'Rating' },
  { key: 'jobs_completed', label: 'Jobs Completed' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'specialization', label: 'Specialization', type: 'text' },
  { key: 'certification', label: 'Certification', type: 'textarea' },
  { key: 'experience_years', label: 'Experience (Years)', type: 'number' },
  {
    key: 'availability_status',
    label: 'Availability Status',
    type: 'select',
    options: [
      { value: 'available', label: 'Available' },
      { value: 'on_job', label: 'On Job' },
      { value: 'off_duty', label: 'Off Duty' },
      { value: 'on_leave', label: 'On Leave' },
    ],
  },
  { key: 'current_workload', label: 'Current Workload', type: 'number' },
  { key: 'max_workload', label: 'Max Workload', type: 'number' },
  { key: 'hourly_rate', label: 'Hourly Rate', type: 'number' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const availabilityFilterOptions = [
  { value: '', label: 'All Availability' },
  { value: 'available', label: 'Available' },
  { value: 'on_job', label: 'On Job' },
  { value: 'off_duty', label: 'Off Duty' },
  { value: 'on_leave', label: 'On Leave' },
];

function AvailabilityBadge({ status }) {
  if (!status) return <span className="text-slate-500">--</span>;
  const colors = availabilityBadgeColors[status] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors} capitalize`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function WorkloadBar({ current, max }) {
  const cur = Number(current) || 0;
  const mx = Number(max) || 1;
  const pct = Math.min(100, Math.round((cur / mx) * 100));
  const barColor =
    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">
        {cur}/{mx}
      </span>
    </div>
  );
}

function RatingStars({ rating }) {
  const r = Number(rating) || 0;
  const fullStars = Math.floor(r);
  const hasHalf = r - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`full-${i}`} className="text-amber-400 text-sm">&#9733;</span>
      ))}
      {hasHalf && <span className="text-amber-400 text-sm">&#9734;</span>}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`empty-${i}`} className="text-slate-600 text-sm">&#9733;</span>
      ))}
      <span className="text-xs text-slate-400 ml-1">{r.toFixed(1)}</span>
    </div>
  );
}

export default function TechniciansPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.getTechnicians();
      setItems(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load technicians: ' + err.message);
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
      (item.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesAvailability = !availabilityFilter || item.availability_status === availabilityFilter;
    return matchesSearch && matchesAvailability;
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
    if (!window.confirm('Are you sure you want to delete this technician?')) return;
    try {
      await api.deleteTechnician(id);
      toast.success('Technician deleted successfully');
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
      const result = await api.aiScheduleTechnician(item.id || item._id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
      toast.error('AI scheduling failed: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editItem) {
        await api.updateTechnician(editItem.id || editItem._id, data);
        toast.success('Technician updated successfully');
      } else {
        await api.createTechnician(data);
        toast.success('Technician created successfully');
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
          <h1 className="text-2xl font-bold text-slate-100">Technicians</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage technicians and their schedules
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
            placeholder="Search technicians by name, specialization, or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors appearance-none cursor-pointer min-w-[180px]"
          >
            {availabilityFilterOptions.map((opt) => (
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
              <p className="text-sm text-slate-400">Loading technicians...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <HiMagnifyingGlass className="text-2xl text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">No technicians found</p>
            <p className="text-xs text-slate-500 mt-1">
              {items.length === 0
                ? 'Get started by adding your first technician.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Specialization
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Availability
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Workload
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Rating
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Jobs Completed
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
                      {item.name || '--'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden md:table-cell">
                      {item.specialization || '--'}
                    </td>
                    <td className="px-5 py-4">
                      <AvailabilityBadge status={item.availability_status} />
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <WorkloadBar current={item.current_workload} max={item.max_workload} />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <RatingStars rating={item.rating} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 hidden lg:table-cell">
                      {item.jobs_completed != null ? item.jobs_completed : '--'}
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
              Showing {filtered.length} of {items.length} technicians
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
        title="Technician Details"
        item={selectedItem}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Schedule"
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
        title={editItem ? 'Edit Technician' : 'Add Technician'}
        fields={formFields}
        initialData={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
