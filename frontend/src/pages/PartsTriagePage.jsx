import { useState } from 'react';
import { api } from '../api';
import AIResponseDisplay from '../components/AIResponseDisplay';
import AIPresetButtons from '../components/AIPresetButtons';
import toast from 'react-hot-toast';

const presets = [
  {
    label: 'Combi oven fault',
    values: JSON.stringify({ equipment_type: 'Rational combi oven', symptom: 'E03 steam generation fault after two deferred descale cycles', downtime_hours: 6, part_on_hand: false, rush_shipping_available: true }, null, 2),
  },
  {
    label: 'Freezer compressor',
    values: JSON.stringify({ equipment_type: 'Traulsen reach-in freezer', symptom: 'Compressor will not start; start winding tests open; cabinet is warming', downtime_hours: 10, part_on_hand: false, rush_shipping_available: true }, null, 2),
  },
  {
    label: 'Fryer control',
    values: JSON.stringify({ equipment_type: 'Pitco four-well fryer', symptom: 'Well #3 runs 8°F above setpoint and trips the high-limit intermittently', downtime_hours: 2, part_on_hand: true, rush_shipping_available: false }, null, 2),
  },
];

export default function PartsTriagePage() {
  const [payload, setPayload] = useState(presets[0].values);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    let input;
    try {
      input = JSON.parse(payload || '{}');
    } catch (failure) {
      const message = `Enter valid JSON: ${failure.message}`;
      setError(message);
      setResult({ success: false, error: message });
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await api.aiPartsTriage(input));
    } catch (failure) {
      const message = failure.message || 'Parts triage failed. Please try again.';
      setError(message);
      setResult({ success: false, error: message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Parts Triage</h1>
          <p className="mt-1 text-sm text-slate-400">Prioritize the right part and shipping path from complete operating context.</p>
        </div>
        <button className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={run} disabled={loading}>
          {loading ? 'Running triage…' : error ? 'Retry Triage' : 'Run Triage'}
        </button>
      </div>
      <AIPresetButtons presets={presets} disabled={loading} onSelect={(value) => { setPayload(value); setResult(null); setError(''); }} />
      <label className="block text-sm font-medium text-slate-300" htmlFor="parts-triage-payload">Equipment and parts context</label>
      <textarea id="parts-triage-payload" className="w-full min-h-48 bg-slate-900 border border-slate-700 rounded p-3 font-mono text-sm" value={payload} onChange={(event) => setPayload(event.target.value)} disabled={loading} />
      {loading && <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 text-sm text-violet-200" role="status">Analyzing parts urgency and availability…</div>}
      {result && !loading && <AIResponseDisplay result={result} />}
    </div>
  );
}