import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { HiPlus, HiMagnifyingGlass, HiFunnel } from 'react-icons/hi2';

const detailFields = [
  { key: 'name', label: 'Name' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'rating', label: 'Rating' },
  { key: 'total_orders', label: 'Total Orders' },
  { key: 'on_time_delivery_rate', label: 'On-Time Delivery Rate' },
  { key: 'average_response_time', label: 'Avg Response Time' },
  { key: 'contract_status', label: 'Contract Status', type: 'badge' },
  { key: 'contract_start', label: 'Contract Start' },
  { key: 'contract_end', label: 'Contract End' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const formFields = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'contact_person', label: 'Contact Person', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'specialization', label: 'Specialization', type: 'text' },
  { key: 'rating', label: 'Rating', type: 'number' },
  { key: 'on_time_delivery_rate', label: 'On-Time Delivery Rate', type: 'number' },
  { key: 'average_response_time', label: 'Avg Response Time', type: 'text' },
  {
    key: 'contract_status',
    label: 'Contract Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' },
      { value: 'terminated', label: 'Terminated' },
    ],
  },
  { key: 'contract_start', label: 'Contract Start', type: 'date' },
  { key: 'contract_end', label: 'Contract End', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const statusFilterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'pending', label: 'Pending' },
  { value: 'terminated', label: 'Terminated' },
];

function getContractBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    case 'expired':
    case 'terminated':
      return 'bg-red-500/15 text-red-400 border border-red-500/30';
    case 'pending':
      return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  }
}

function renderStars(rating) {
  if (rating == null) return <span className="text-slate-500">--</span>;
  const num = Number(rating);
  const full = Math.floor(num);
  const hasHalf = num - full >= 0.5;
  const stars = [];
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<span key={i} className="text-amber-400">&#9733;</span>);
    } else if (i === full && hasHalf) {
      stars.push(<span key={i} className="text-amber-400/50">&#9733;</span>);
    } else {
      stars.push(<span key={i} className="text-slate-600">&#9733;</span>);
    }
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-sm">
      {stars}
      <span className="ml-1 text-xs text-slate-400">({num})</span>
    </span>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await api.getVendors();
      setVendors(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filtering
  const filtered = vendors.filter((v) => {
    const matchesSearch =
      !search ||
      [v.name, v.contact_person, v.specialization]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' || v.contract_status?.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // CRUD handlers
  const handleCreate = () => {
    setEditingVendor(null);
    setFormOpen(true);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingVendor) {
        await api.updateVendor(editingVendor.id || editingVendor._id, data);
        toast.success('Vendor updated successfully');
      } else {
        await api.createVendor(data);
        toast.success('Vendor created successfully');
      }
      setFormOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.message || 'Failed to save vendor');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await api.deleteVendor(id);
      toast.success('Vendor deleted successfully');
      setDetailOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.message || 'Failed to delete vendor');
    }
  };

  const handleRowClick = (vendor) => {
    setSelectedVendor(vendor);
    setAiResult(null);
    setDetailOpen(true);
  };

  const handleAI = async (vendor) => {
    try {
      setAiLoading(true);
      setAiResult(null);
      const result = await api.aiEvaluateVendor(vendor.id || vendor._id);
      setAiResult(result);
    } catch (err) {
      setAiResult({ success: false, error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Vendors</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage vendor relationships and contracts
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
        >
          <HiPlus className="text-lg" />
          Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search vendors..."
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
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Specialization
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rating
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contract Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  On-Time Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                      <span className="text-sm text-slate-400">Loading vendors...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr
                    key={vendor.id || vendor._id}
                    onClick={() => handleRowClick(vendor)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">
                      {vendor.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {vendor.contact_person || <span className="text-slate-500">--</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {vendor.specialization || <span className="text-slate-500">--</span>}
                    </td>
                    <td className="px-6 py-4">{renderStars(vendor.rating)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getContractBadgeClass(
                          vendor.contract_status
                        )}`}
                      >
                        {vendor.contract_status?.replace(/_/g, ' ') || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {vendor.on_time_delivery_rate != null
                        ? `${vendor.on_time_delivery_rate}%`
                        : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && (
          <div className="px-6 py-3 border-t border-slate-700/50 bg-slate-900/30">
            <p className="text-xs text-slate-500">
              Showing {filtered.length} of {vendors.length} vendors
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Vendor Details"
        item={selectedVendor}
        fields={detailFields}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAI={handleAI}
        aiLabel="AI Evaluate Vendor"
        aiLoading={aiLoading}
        aiResult={aiResult}
      />

      {/* Form Modal */}
      <FormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingVendor ? 'Edit Vendor' : 'Add Vendor'}
        fields={formFields}
        initialData={editingVendor}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
