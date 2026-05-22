import React, { useEffect, useState } from 'react';

function colorFor(value, max) {
  const ratio = max ? value / max : 0;
  // Violet gradient: low = dark, high = bright
  const lightness = 20 + Math.round(ratio * 45); // 20-65%
  return `hsl(265, 70%, ${lightness}%)`;
}

export default function MaintenanceHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/maintenance-heatmap', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return <div className="text-slate-500 text-sm">Loading heatmap...</div>;

  const max = Math.max(...data.matrix.flatMap(r => r.counts));

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-1">{data.title}</h3>
      <p className="text-xs text-slate-500 mb-4">Equipment × Month - maintenance event counts</p>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-xs font-medium text-slate-500 text-left pr-2"></th>
              {data.x_axis.map(m => (
                <th key={m} className="text-xs text-slate-400 font-medium px-1 w-10">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr key={row.equipment}>
                <td className="text-xs text-slate-300 pr-3 py-1 whitespace-nowrap">{row.equipment}</td>
                {row.counts.map((v, ci) => (
                  <td
                    key={ci}
                    title={`${row.equipment} • ${data.x_axis[ci]}: ${v}`}
                    className="text-xs text-center text-white font-medium rounded"
                    style={{ background: colorFor(v, max), width: 38, height: 28 }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <span>Low</span>
        <div className="h-3 w-40 rounded" style={{ background: 'linear-gradient(to right, hsl(265,70%,20%), hsl(265,70%,65%))' }} />
        <span>High</span>
      </div>
    </div>
  );
}
