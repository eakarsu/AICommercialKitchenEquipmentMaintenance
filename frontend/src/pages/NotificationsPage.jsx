import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { HiBell, HiPlus, HiCheck, HiTrash, HiCheckCircle } from 'react-icons/hi2';

const typeStyles = {
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const emptyForm = { title: '', message: '', type: 'info', user_id: '' };

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      const list = Array.isArray(data) ? data : (data.notifications || data.items || data.data || []);
      setItems(list);
      try {
        const c = await api.getNotificationsUnreadCount();
        setUnread(c.count ?? c.unread ?? 0);
      } catch {
        setUnread(list.filter(n => !(n.read || n.is_read)).length);
      }
    } catch (err) {
      toast.error('Failed to load notifications');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { ...form };
      if (!body.user_id) delete body.user_id;
      await api.createNotification(body);
      toast.success('Notification created');
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to create');
    }
    setSubmitting(false);
  };

  const handleMarkRead = async (id) => {
    try { await api.markNotificationRead(id); load(); } catch (err) { toast.error('Failed'); }
  };
  const handleMarkAll = async () => {
    try { await api.markAllNotificationsRead(); toast.success('All marked read'); load(); } catch (err) { toast.error('Failed'); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try { await api.deleteNotification(id); toast.success('Deleted'); load(); } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <HiBell className="text-violet-400" /> Notifications
          </h2>
          <p className="text-sm text-slate-400 mt-1">{unread} unread</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm border border-slate-700"
          >
            <HiCheckCircle /> Mark all read
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm shadow-lg shadow-violet-500/20"
          >
            <HiPlus /> {showForm ? 'Cancel' : 'New Notification'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-700/50 rounded-xl p-5 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Message</label>
            <textarea
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              required
              rows={3}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">User ID (optional)</label>
              <input
                value={form.user_id}
                onChange={e => setForm({ ...form, user_id: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No notifications</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {items.map(n => (
                <tr key={n.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-sm text-slate-200 font-medium">{n.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{n.message}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${typeStyles[n.type] || typeStyles.info}`}>
                      {n.type || 'info'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(n.read || n.is_read) ? <span className="text-slate-500">read</span> : <span className="text-emerald-400">unread</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {!(n.read || n.is_read) && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="inline-flex items-center justify-center p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title="Mark read"
                      ><HiCheck /></button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
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
