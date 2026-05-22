import React, { useEffect, useState } from 'react';
import { HiPlus, HiTrash, HiPencil, HiCheck, HiXMark } from 'react-icons/hi2';

const emptyForm = { equipment: '', interval_days: 30, task: '', priority: 'medium' };

function authFetch(path, opts = {}) {
  const token = localStorage.getItem('token');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  }).then(async r => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return body;
  });
}

export default function MaintenanceRulesEditor() {
  const [rules, setRules] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    authFetch('/api/custom-views/maintenance-rules')
      .then(d => setRules(d.rules || []))
      .catch(e => setError(e.message));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await authFetch('/api/custom-views/maintenance-rules', { method: 'POST', body: JSON.stringify(form) });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    try {
      await authFetch(`/api/custom-views/maintenance-rules/${id}`, { method: 'DELETE' });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleEditSave = async (id) => {
    try {
      await authFetch(`/api/custom-views/maintenance-rules/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (err) { setError(err.message); }
  };

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({ equipment: rule.equipment, interval_days: rule.interval_days, task: rule.task, priority: rule.priority });
  };

  const priorityBadge = (p) => {
    const styles = {
      high: 'bg-red-500/15 text-red-400 border-red-500/30',
      medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    return styles[p] || styles.medium;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Maintenance Rules (Intervals)</h3>
        <button
          onClick={() => { setShowForm(s => !s); setForm(emptyForm); setEditingId(null); }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 text-sm border border-violet-500/30"
        >
          <HiPlus /> {showForm ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {error && <div className="text-red-400 text-xs mb-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 mb-4 grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
          <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 md:col-span-1" placeholder="Equipment" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} required />
          <input type="number" min="1" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200" placeholder="Interval days" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} required />
          <input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 md:col-span-2" placeholder="Task" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} required />
          <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <div className="md:col-span-5 flex justify-end">
            <button type="submit" className="px-3 py-1.5 rounded bg-violet-500 hover:bg-violet-600 text-white text-sm">Create rule</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-800">
              <th className="py-2 pr-3">Equipment</th>
              <th className="py-2 pr-3">Interval</th>
              <th className="py-2 pr-3">Task</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} className="border-b border-slate-800/60">
                {editingId === r.id ? (
                  <>
                    <td className="py-2 pr-3"><input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 w-full" value={form.equipment} onChange={e => setForm({ ...form, equipment: e.target.value })} /></td>
                    <td className="py-2 pr-3"><input type="number" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 w-20" value={form.interval_days} onChange={e => setForm({ ...form, interval_days: e.target.value })} /></td>
                    <td className="py-2 pr-3"><input className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 w-full" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} /></td>
                    <td className="py-2 pr-3">
                      <select className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => handleEditSave(r.id)} className="p-1.5 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 mr-1"><HiCheck /></button>
                      <button onClick={() => { setEditingId(null); setForm(emptyForm); }} className="p-1.5 rounded bg-slate-700/50 text-slate-300 hover:bg-slate-700"><HiXMark /></button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-3 text-slate-200">{r.equipment}</td>
                    <td className="py-2 pr-3 text-slate-400">every {r.interval_days} days</td>
                    <td className="py-2 pr-3 text-slate-400">{r.task}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${priorityBadge(r.priority)}`}>{r.priority}</span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => startEdit(r)} className="p-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 mr-1"><HiPencil /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25"><HiTrash /></button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan="5" className="text-center text-slate-500 py-6 text-sm">No rules defined.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
