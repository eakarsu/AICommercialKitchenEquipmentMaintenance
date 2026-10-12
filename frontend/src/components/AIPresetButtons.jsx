import React from 'react';

export default function AIPresetButtons({ presets, onSelect, disabled = false }) {
  return (
    <div className="ai-complete-presets rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">Complete examples</span>
        <span className="text-[11px] text-slate-500">Fills every field</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={disabled || preset.disabled}
            onClick={() => onSelect(preset.values)}
            className="rounded-lg border border-violet-500/25 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:border-violet-400/60 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
