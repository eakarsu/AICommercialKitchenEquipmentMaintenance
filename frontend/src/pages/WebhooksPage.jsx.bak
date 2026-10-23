import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { HiBolt, HiPlus, HiTrash, HiPlay } from 'react-icons/hi2';

const emptyForm = { name: '', url: '', events: '', active: true };

export default function WebhooksPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWebhooks();
      setItems(Array.isArray(data) ? data : (data.webhooks || data.items || data.data || []));
    } catch (err) {
      toast.error('Failed to load webhooks');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...form,
        events: form.events.split(',').map(s => s.trim()).filter(Boolean),
      };
      await api.createWebhook(body);
      toast.success('Webhook created');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try { await api.deleteWebhook(id); toast.success('Deleted'); load(); }
    catch (err) { toast.error('Failed'); }
  };

  const handleTest = async (id) => {
    setTesting(id);
    setTestResult(null);
    try {
      const data = await api.testWebhook(id);
      setTestResult({ id, ok: true, data });
      toast.success('Test dispatched');
    } catch (err) {
      setTestResult({ id, ok: false, data: { error: err.message } });
      toast.error('Test failed');
    }
    setTesting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HiBolt className="text-violet-400" /> Webhooks
          </h2>
          <p className="text-sm text-slate-400 mt-1">Outbound webhook registry</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm shadow-lg shadow-violet-500/20"
        >
          <HiPlus /> {showForm ? 'Cancel' : 'New Webhook'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700/50 rounded-xl p-5 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">URL</label>
            <input
              type="url"
              value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })}
              required
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Events (comma-separated)</label>
            <input
              value={form.events}
              onChange={e => setForm({ ...form, events: e.target.value })}
              placeholder="maintenance.completed, equipment.failure"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              className="rounded"
            />
            Active
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      {testResult && (
        <div className={`bg-slate-900 border rounded-xl p-4 ${testResult.ok ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
          <div className={`text-sm font-semibold ${testResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            Test #{testResult.id}: {testResult.ok ? 'OK' : 'Failed'}
          </div>
          <pre className="mt-2 text-xs text-slate-400 overflow-auto max-h-60">
            {JSON.stringify(testResult.data, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading webhooks...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No webhooks</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">URL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Events</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {items.map(w => (
                <tr key={w.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">{w.url}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{Array.isArray(w.events) ? w.events.join(', ') : (w.events || '—')}</td>
                  <td className="px-4 py-3 text-sm">
                    {w.active
                      ? <span className="text-emerald-400">yes</span>
                      : <span className="text-slate-500">no</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleTest(w.id)}
                      disabled={testing === w.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded text-slate-300 hover:text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
                    >
                      <HiPlay /> {testing === w.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDelete(w.id)}
                      className="inline-flex items-center justify-center p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Delete"
                    ><HiTrash /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
