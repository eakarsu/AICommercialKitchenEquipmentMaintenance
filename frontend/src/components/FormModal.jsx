import { useState, useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';

export default function FormModal({
  isOpen,
  onClose,
  title,
  fields,
  initialData,
  onSubmit,
}) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;
    const data = {};
    (fields || []).forEach(field => {
      if (initialData && initialData[field.key] != null) {
        data[field.key] = initialData[field.key];
      } else {
        data[field.key] = field.type === 'number' ? '' : '';
      }
    });
    setFormData(data);
    setSubmitting(false);
  }, [isOpen, initialData, fields]);

  if (!isOpen) return null;

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      // Convert number fields
      const processed = { ...formData };
      (fields || []).forEach(field => {
        if (field.type === 'number' && processed[field.key] !== '') {
          processed[field.key] = Number(processed[field.key]);
        }
      });
      await onSubmit(processed);
    } catch (err) {
      // Allow parent to handle errors
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formData[field.key] ?? '';
    const baseInputClass =
      'w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            className={baseInputClass + ' appearance-none cursor-pointer'}
            required={field.required}
          >
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
            {(field.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            rows={4}
            className={baseInputClass + ' resize-none'}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className={baseInputClass}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.required}
            className={baseInputClass}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-100">{title || 'Form'}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <HiXMark className="text-xl" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {(fields || []).map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 flex-shrink-0 bg-slate-900/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium shadow-lg shadow-violet-500/20 transition-all"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                initialData ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
