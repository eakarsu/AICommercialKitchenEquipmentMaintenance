import { useState } from 'react';
import { api } from '../api';

export default function PartsTriagePage() {
  const [payload, setPayload] = useState('{"equipment_type":"combi oven","symptom":"E03 steam generation fault","downtime_hours":6,"part_on_hand":false,"rush_shipping_available":true}');
  const [result, setResult] = useState(null);
  const run = async () => setResult(await api.aiPartsTriage(JSON.parse(payload || '{}')));
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Parts Triage</h1><button className="px-4 py-2 rounded bg-violet-600" onClick={run}>Run Triage</button></div>
      <textarea className="w-full min-h-48 bg-slate-900 border border-slate-700 rounded p-3" value={payload} onChange={(e) => setPayload(e.target.value)} />
      {result && <pre className="bg-slate-900 border border-slate-700 rounded p-4 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
