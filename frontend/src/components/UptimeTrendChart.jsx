import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b'];

export default function UptimeTrendChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/uptime-trend', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-400 text-sm">{error}</div>;
  if (!data) return <div className="text-slate-500 text-sm">Loading uptime data...</div>;

  // Merge series into single data array keyed by day
  const merged = [];
  const days = data.series[0]?.points.length || 0;
  for (let i = 0; i < days; i++) {
    const row = { day: data.series[0].points[i].day };
    data.series.forEach(s => { row[s.equipment] = s.points[i].uptime; });
    merged.push(row);
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5">
      <h3 className="text-lg font-semibold text-slate-100 mb-1">{data.title}</h3>
      <p className="text-xs text-slate-500 mb-4">Unit: {data.unit}</p>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={merged}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
            <YAxis domain={[60, 100]} stroke="#64748b" fontSize={11} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {data.series.map((s, i) => (
              <Line key={s.equipment} type="monotone" dataKey={s.equipment} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
