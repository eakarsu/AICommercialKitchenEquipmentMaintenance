import { HiSparkles, HiLightBulb, HiExclamationTriangle, HiCheckCircle, HiXCircle, HiInformationCircle } from 'react-icons/hi2';

const statusColors = {
  score: { bg: 'from-violet-500/20 to-purple-500/20', bar: 'from-violet-500 to-purple-500', text: 'text-violet-300' },
  rating: { bg: 'from-blue-500/20 to-cyan-500/20', bar: 'from-blue-500 to-cyan-500', text: 'text-blue-300' },
  risk: { bg: 'from-red-500/20 to-orange-500/20', bar: 'from-red-500 to-orange-500', text: 'text-red-300' },
};

function getSpecialType(key) {
  const k = key.toLowerCase();
  if (['score', 'rating', 'risk'].some(s => k.includes(s))) return 'metric';
  if (['recommendation', 'suggestion', 'tip'].some(s => k.includes(s))) return 'recommendation';
  if (['warning', 'alert', 'critical'].some(s => k.includes(s))) return 'warning';
  return null;
}

function getMetricColor(key) {
  const k = key.toLowerCase();
  for (const [keyword, colors] of Object.entries(statusColors)) {
    if (k.includes(keyword)) return colors;
  }
  return statusColors.score;
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

function MetricCard({ label, value, keyName }) {
  const colors = getMetricColor(keyName);
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const maxVal = numVal <= 1 ? 1 : numVal <= 10 ? 10 : 100;
  const pct = Math.min(100, (numVal / maxVal) * 100);

  return (
    <div className={`rounded-xl bg-gradient-to-br ${colors.bg} border border-slate-700/50 p-4`}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors.text} mb-2`}>{value}</p>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colors.bar} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RecommendationCard({ label, value }) {
  const items = Array.isArray(value) ? value : [value];
  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <HiLightBulb className="text-amber-400 text-lg flex-shrink-0" />
        <p className="text-sm font-semibold text-amber-300">{label}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-amber-400/60 mt-0.5">&#8226;</span>
            <p className="text-sm text-slate-300">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningCard({ label, value }) {
  const items = Array.isArray(value) ? value : [value];
  return (
    <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <HiExclamationTriangle className="text-red-400 text-lg flex-shrink-0" />
        <p className="text-sm font-semibold text-red-300">{label}</p>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-red-400/60 mt-0.5">&#8226;</span>
            <p className="text-sm text-slate-300">{typeof item === 'object' ? JSON.stringify(item) : String(item)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStringResponse(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentParagraph = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm text-slate-300 leading-relaxed">
          {currentParagraph.join(' ')}
        </p>
      );
      currentParagraph = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      return;
    }

    // Heading: ## or **bold**
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      flushParagraph();
      const headingText = trimmed.replace(/^#{2,3}\s*/, '');
      elements.push(
        <h3 key={`h-${i}`} className="text-base font-semibold text-violet-300 mt-4 mb-2 first:mt-0">
          {headingText}
        </h3>
      );
      return;
    }

    if (/^\*\*(.+?)\*\*:?$/.test(trimmed)) {
      flushParagraph();
      const boldText = trimmed.replace(/^\*\*(.+?)\*\*:?$/, '$1');
      elements.push(
        <h4 key={`h4-${i}`} className="text-sm font-semibold text-slate-200 mt-3 mb-1">
          {boldText}
        </h4>
      );
      return;
    }

    // Bullet points
    if (/^[-*]\s/.test(trimmed)) {
      flushParagraph();
      const bulletText = trimmed.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={`b-${i}`} className="flex items-start gap-2 ml-2">
          <span className="text-violet-400 mt-1 flex-shrink-0">&#8226;</span>
          <p className="text-sm text-slate-300">{formatInlineText(bulletText)}</p>
        </div>
      );
      return;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      flushParagraph();
      const num = trimmed.match(/^(\d+)/)[1];
      const listText = trimmed.replace(/^\d+[.)]\s+/, '');
      elements.push(
        <div key={`n-${i}`} className="flex items-start gap-2 ml-2">
          <span className="text-violet-400 font-semibold text-xs mt-0.5 w-5 flex-shrink-0">{num}.</span>
          <p className="text-sm text-slate-300">{formatInlineText(listText)}</p>
        </div>
      );
      return;
    }

    // Regular text
    currentParagraph.push(trimmed);
  });

  flushParagraph();
  return <div className="space-y-1.5">{elements}</div>;
}

function formatInlineText(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-200 font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderObjectResponse(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const entries = Object.entries(obj);
  const metrics = [];
  const recommendations = [];
  const warnings = [];
  const sections = [];

  entries.forEach(([key, value]) => {
    const special = getSpecialType(key);
    const label = formatKey(key);

    if (special === 'metric' && (typeof value === 'number' || (typeof value === 'string' && !isNaN(value)))) {
      metrics.push({ key, label, value });
    } else if (special === 'recommendation') {
      recommendations.push({ key, label, value });
    } else if (special === 'warning') {
      warnings.push({ key, label, value });
    } else {
      sections.push({ key, label, value });
    }
  });

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {metrics.map(m => (
            <MetricCard key={m.key} label={m.label} value={m.value} keyName={m.key} />
          ))}
        </div>
      )}

      {/* Warning cards */}
      {warnings.map(w => (
        <WarningCard key={w.key} label={w.label} value={w.value} />
      ))}

      {/* Regular sections */}
      {sections.map(({ key, label, value }) => (
        <RenderValue key={key} label={label} value={value} />
      ))}

      {/* Recommendation cards */}
      {recommendations.map(r => (
        <RecommendationCard key={r.key} label={r.label} value={r.value} />
      ))}
    </div>
  );
}

function RenderValue({ label, value }) {
  if (value === null || value === undefined) return null;

  // Boolean
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-2 py-1">
        {value
          ? <HiCheckCircle className="text-emerald-400 text-lg" />
          : <HiXCircle className="text-red-400 text-lg" />
        }
        <span className="text-sm text-slate-300">{label}</span>
      </div>
    );
  }

  // Number
  if (typeof value === 'number') {
    return (
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-lg font-bold text-violet-300">{value.toLocaleString()}</span>
      </div>
    );
  }

  // String
  if (typeof value === 'string') {
    return (
      <div className="rounded-lg bg-slate-800/30 border border-slate-700/40 p-3">
        <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-1">{label}</p>
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
          {renderStringResponse(value)}
        </div>
      </div>
    );
  }

  // Array
  if (Array.isArray(value)) {
    return (
      <div className="rounded-lg bg-slate-800/30 border border-slate-700/40 p-3">
        <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-1.5">
          {value.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-violet-400/70 mt-0.5 flex-shrink-0 text-xs">{i + 1}.</span>
              <div className="text-sm text-slate-300">
                {typeof item === 'object' ? renderObjectResponse(item) : String(item)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Nested object
  if (typeof value === 'object') {
    return (
      <div className="rounded-lg bg-slate-800/30 border border-slate-700/40 p-3">
        <p className="text-xs font-medium text-violet-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="pl-3 border-l-2 border-violet-500/20 space-y-2">
          {Object.entries(value).map(([k, v]) => (
            <RenderValue key={k} label={formatKey(k)} value={v} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function AIResponseDisplay({ result }) {
  if (!result) return null;

  // Error state
  if (!result.success) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <HiExclamationTriangle className="text-red-400 text-xl" />
          </div>
          <h3 className="text-base font-semibold text-red-300">Analysis Failed</h3>
        </div>
        <p className="text-sm text-slate-400">
          {result.error || result.response || 'An error occurred during AI analysis. Please try again.'}
        </p>
      </div>
    );
  }

  const response = result.response;
  const isString = typeof response === 'string';

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-indigo-500/5 border border-violet-500/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/15 to-purple-500/15 border-b border-violet-500/20 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
            <HiSparkles className="text-white text-sm" />
          </div>
          <h3 className="text-sm font-semibold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
            AI Analysis
          </h3>
        </div>
        {result.model && (
          <div className="flex items-center gap-1.5">
            <HiInformationCircle className="text-slate-500 text-xs" />
            <span className="text-xs text-slate-500 font-mono">{result.model}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {isString ? renderStringResponse(response) : renderObjectResponse(response)}
      </div>

      {/* Usage footer */}
      {result.usage && (
        <div className="border-t border-violet-500/10 bg-slate-900/30 px-5 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Tokens used</span>
          <div className="flex items-center gap-3">
            {result.usage.prompt_tokens != null && (
              <span className="text-[11px] text-slate-500">
                Prompt: <span className="text-slate-400 font-mono">{result.usage.prompt_tokens.toLocaleString()}</span>
              </span>
            )}
            {result.usage.completion_tokens != null && (
              <span className="text-[11px] text-slate-500">
                Completion: <span className="text-slate-400 font-mono">{result.usage.completion_tokens.toLocaleString()}</span>
              </span>
            )}
            {result.usage.total_tokens != null && (
              <span className="text-[11px] text-violet-400 font-mono font-semibold">
                {result.usage.total_tokens.toLocaleString()} total
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
