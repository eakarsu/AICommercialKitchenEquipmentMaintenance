import { HiXMark, HiPencilSquare, HiTrash, HiSparkles } from 'react-icons/hi2';
import AIResponseDisplay from './AIResponseDisplay';

const badgeColors = {
  // Status
  operational: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  good: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  passed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'in stock': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',

  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  scheduled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'in progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'in_progress': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  open: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  assigned: 'bg-blue-500/15 text-blue-400 border-blue-500/30',

  'needs repair': 'bg-red-500/15 text-red-400 border-red-500/30',
  'out of service': 'bg-red-500/15 text-red-400 border-red-500/30',
  overdue: 'bg-red-500/15 text-red-400 border-red-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  fail: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  'low stock': 'bg-red-500/15 text-red-400 border-red-500/30',
  'out of stock': 'bg-red-500/15 text-red-400 border-red-500/30',
  inactive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',

  // Priority
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-green-500/15 text-green-400 border-green-500/30',
  urgent: 'bg-red-500/15 text-red-400 border-red-500/30',
};

function isBadgeField(type, key) {
  if (type === 'badge') return true;
  const k = (key || '').toLowerCase();
  return ['status', 'priority', 'severity', 'level', 'condition'].some(s => k.includes(s));
}

function Badge({ value }) {
  if (!value) return <span className="text-slate-500">--</span>;
  const str = String(value).toLowerCase();
  const colors = badgeColors[str] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors} capitalize`}>
      {String(value).replace(/_/g, ' ')}
    </span>
  );
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-500">--</span>;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

export default function DetailModal({
  isOpen,
  onClose,
  title,
  item,
  fields,
  onEdit,
  onDelete,
  onAI,
  aiLabel = 'AI Analyze',
  aiLoading = false,
  aiResult,
}) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">{title || 'Details'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <HiXMark className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {(fields || []).map(field => {
              const value = item[field.key];
              const showBadge = isBadgeField(field.type, field.key);

              return (
                <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    {field.label}
                  </p>
                  <div className="text-sm text-slate-200">
                    {showBadge ? <Badge value={value} /> : formatValue(value)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Result */}
          {aiResult && (
            <div className="pt-2">
              <AIResponseDisplay result={aiResult} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 flex-shrink-0 bg-slate-900/80">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors text-sm font-medium"
              >
                <HiPencilSquare className="text-base" />
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item.id || item._id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors text-sm font-medium"
              >
                <HiTrash className="text-base" />
                Delete
              </button>
            )}
          </div>

          {onAI && (
            <button
              onClick={() => onAI(item)}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <HiSparkles className="text-base" />
                  {aiLabel}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
