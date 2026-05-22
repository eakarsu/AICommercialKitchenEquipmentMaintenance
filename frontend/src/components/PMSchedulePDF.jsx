import React, { useEffect, useState } from 'react';
import { HiArrowDownTray, HiDocumentText } from 'react-icons/hi2';

export default function PMSchedulePDF() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/pm-schedule-pdf', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, []);

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename.replace(/\.pdf$/, '.txt');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return <div className="text-slate-500 text-sm">Generating PM schedule...</div>;

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HiDocumentText className="text-violet-400 text-xl" />
          <h3 className="text-lg font-semibold text-slate-100">Preventive Maintenance Schedule</h3>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 text-sm border border-violet-500/30"
        >
          <HiArrowDownTray /> Download
        </button>
      </div>
      <div className="text-xs text-slate-500 mb-3">
        File: <span className="text-slate-400">{data.filename}</span> • {data.pages} page(s) • {data.rule_count} rule(s)
      </div>
      <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
{data.content}
      </pre>
    </div>
  );
}
