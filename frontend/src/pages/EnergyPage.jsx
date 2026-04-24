import { useState, useEffect } from 'react';
import { api } from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import { HiPlus, HiMagnifyingGlass, HiFunnel, HiBolt, HiExclamationTriangle } from 'react-icons/hi2';

const detailFields = [
  { key: 'equipment_name', label: 'Equipment' },
  { key: 'reading_date', label: 'Reading Date' },
  { key: 'energy_consumption', label: 'Energy Consumption' },
  { key: 'unit', label: 'Unit' },
  { key: 'cost', label: 'Cost ($)' },
  { key: 'peak_usage_time', label: 'Peak Usage Time' },
  { key: 'efficiency_rating', label: 'Efficiency Rating' },
  { key: 'temperature_setting', label: 'Temperature Setting' },
  { key: 'operating_hours', label: 'Operating Hours' },
  { key: 'anomaly_detected', label: 'Anomaly Detected' },
  { key: 'notes', label: 'Notes' },
];

const formFields = [
  { key: 'equipment_id', label: 'Equipment ID', type: 'number', required: true },
  { key: 'reading_date', label: 'Reading Date', type: 'date', required: true },
  { key: 'energy_consumption', label: 'Energy Consumption', type: 'number' },
  { key: 'unit', label: 'Unit', type: 'text', placeholder: 'kWh' },
  { key: 'cost', label: 'Cost ($)', type: 'number' },
  { key: 'peak_usage_time', label: 'Peak Usage Time', type: 'text' },
  { key: 'efficiency_rating', label: 'Efficiency Rating', type: 'number' },
  { key: 'temperature_setting', label: 'Temperature Setting', type: 'text' },
  { key: 'operating_hours', label: 'Operating Hours', type: 'number' },
  { key: 'anomaly_detected', label: 'Anomaly Detected', type: 'select', options: [
    { value: 'false', label: 'No' },
    { value: 'true', label: 'Yes' },
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

function getBadge(val) {
  if (val === true || val === 'true') return 'badge-danger';
  if (val === false || val === 'false') return 'badge-success';
  return 'badge-info';
}

export default function EnergyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const fetchItems = async () => {
    try {
      const data = await api.getEnergy();
      setItems(data);
    } catch (err) {
      toast.error('Failed to load energy logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      (item.equipment_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchAnomaly = anomalyFilter === 'all' ||
      (anomalyFilter === 'anomalies' && item.anomaly_detected);
    return matchSearch && matchAnomaly;
  });

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setAiResult(null);
    setShowDetail(true);
  };

  const handleCreate = async (data) => {
    try {
      if (data.anomaly_detected === 'true') data.anomaly_detected = true;
      else data.anomaly_detected = false;
      await api.createEnergy(data);
      toast.success('Energy log created');
      setShowForm(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditItem({ ...item, anomaly_detected: String(item.anomaly_detected) });
    setShowDetail(false);
    setShowForm(true);
  };

  const handleUpdate = async (data) => {
    try {
      if (data.anomaly_detected === 'true') data.anomaly_detected = true;
      else data.anomaly_detected = false;
      await api.updateEnergy(editItem.id, data);
      toast.success('Energy log updated');
      setShowForm(false);
      setEditItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this energy log?')) return;
    try {
      await api.deleteEnergy(id);
      toast.success('Energy log deleted');
      setShowDetail(false);
      fetchItems();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAI = async () => {
    setAiLoading(true);
    try {
      const result = await api.aiOptimizeEnergy(selectedItem.id);
      setAiResult(result);
    } catch (err) {
      toast.error('AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  // Summary stats
  const totalConsumption = items.reduce((sum, i) => sum + parseFloat(i.energy_consumption || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + parseFloat(i.cost || 0), 0);
  const avgEfficiency = items.length ? (items.reduce((sum, i) => sum + parseFloat(i.efficiency_rating || 0), 0) / items.length) : 0;
  const anomalyCount = items.filter(i => i.anomaly_detected).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <HiBolt className="text-yellow-400" />
            Energy Efficiency
          </h1>
          <p className="text-slate-400 text-sm mt-1">{items.length} energy logs recorded</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="btn-primary">
          <HiPlus className="w-5 h-5" /> Add Reading
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Consumption</p>
          <p className="text-2xl font-bold text-white mt-1">{totalConsumption.toFixed(1)} kWh</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total Cost</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${totalCost.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Efficiency</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{avgEfficiency.toFixed(1)}%</p>
        </div>
        <div className="stat-card">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Anomalies Detected</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{anomalyCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by equipment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <HiFunnel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select
            value={anomalyFilter}
            onChange={e => setAnomalyFilter(e.target.value)}
            className="select-field pl-9 pr-8"
          >
            <option value="all">All Readings</option>
            <option value="anomalies">Anomalies Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Date</th>
              <th>Consumption</th>
              <th>Cost</th>
              <th>Efficiency</th>
              <th>Operating Hours</th>
              <th>Anomaly</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No energy logs found</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id} onClick={() => handleRowClick(item)}>
                <td className="font-medium text-white">{item.equipment_name || `Equipment #${item.equipment_id}`}</td>
                <td>{item.reading_date ? new Date(item.reading_date).toLocaleDateString() : '-'}</td>
                <td>{item.energy_consumption} {item.unit || 'kWh'}</td>
                <td className="text-emerald-400">${parseFloat(item.cost || 0).toFixed(2)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${parseFloat(item.efficiency_rating) >= 80 ? 'bg-emerald-500' : parseFloat(item.efficiency_rating) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, parseFloat(item.efficiency_rating || 0))}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">{item.efficiency_rating}%</span>
                  </div>
                </td>
                <td>{item.operating_hours}h</td>
                <td>
                  {item.anomaly_detected ? (
                    <span className="badge-danger flex items-center gap-1 w-fit">
                      <HiExclamationTriangle className="w-3 h-3" /> Anomaly
                    </span>
                  ) : (
                    <span className="badge-success w-fit">Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selectedItem && (
        <DetailModal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title="Energy Log Details"
          item={{
            ...selectedItem,
            anomaly_detected: selectedItem.anomaly_detected ? 'Yes' : 'No',
            cost: `$${parseFloat(selectedItem.cost || 0).toFixed(2)}`,
            energy_consumption: `${selectedItem.energy_consumption} ${selectedItem.unit || 'kWh'}`,
            efficiency_rating: `${selectedItem.efficiency_rating}%`,
            operating_hours: `${selectedItem.operating_hours}h`,
          }}
          fields={detailFields}
          onEdit={() => handleEdit(selectedItem)}
          onDelete={() => handleDelete(selectedItem.id)}
          onAI={handleAI}
          aiLabel="AI Energy Optimization"
          aiLoading={aiLoading}
          aiResult={aiResult}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <FormModal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          title={editItem ? 'Edit Energy Log' : 'New Energy Reading'}
          fields={formFields}
          initialData={editItem}
          onSubmit={editItem ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
}
