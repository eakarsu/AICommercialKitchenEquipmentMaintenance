import React, { useState } from 'react';
import { api } from '../api';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import {
  HiSparkles,
  HiCpuChip,
  HiChartBar,
  HiCurrencyDollar,
  HiShieldCheck,
  HiBolt,
  HiDocumentText,
  HiChatBubbleLeftRight,
} from 'react-icons/hi2';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <HiSparkles className="text-violet-400 text-sm animate-pulse" />
        </div>
      </div>
      <span className="ml-4 text-sm text-slate-400 animate-pulse">AI is thinking...</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accentFrom, accentTo, borderAccent, children, loading, result }) {
  return (
    <div className={`relative group rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 overflow-hidden transition-all duration-300 hover:border-${borderAccent}/40 hover:shadow-lg hover:shadow-${borderAccent}/5`}>
      {/* Top accent line */}
      <div className={`h-1 bg-gradient-to-r ${accentFrom} ${accentTo}`} />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} shadow-lg flex-shrink-0`}>
            <Icon className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Form content */}
        <div className="space-y-4">
          {children}
        </div>

        {/* Loading */}
        {loading && <LoadingSpinner />}

        {/* Result */}
        {result && !loading && (
          <div className="mt-5">
            <AIResponseDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AICenterPage() {
  // Diagnostic Assistant
  const [diagEquipType, setDiagEquipType] = useState('');
  const [diagSymptoms, setDiagSymptoms] = useState('');
  const [diagQuery, setDiagQuery] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState(null);

  // Predictive Analytics
  const [predIds, setPredIds] = useState('');
  const [predLoading, setPredLoading] = useState(false);
  const [predResult, setPredResult] = useState(null);

  // Cost Optimizer
  const [costTimeframe, setCostTimeframe] = useState('last_quarter');
  const [costLoading, setCostLoading] = useState(false);
  const [costResult, setCostResult] = useState(null);

  // Compliance Checker
  const [compEquipId, setCompEquipId] = useState('');
  const [compLoading, setCompLoading] = useState(false);
  const [compResult, setCompResult] = useState(null);

  // Energy Advisor
  const [energyEquipId, setEnergyEquipId] = useState('');
  const [energyLoading, setEnergyLoading] = useState(false);
  const [energyResult, setEnergyResult] = useState(null);

  // Report Generator
  const [reportType, setReportType] = useState('maintenance_summary');
  const [reportRange, setReportRange] = useState('last_month');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  // Smart Chat
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const inputClass = 'w-full rounded-xl bg-slate-900/60 border border-slate-600/50 text-slate-200 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all';
  const selectClass = 'w-full rounded-xl bg-slate-900/60 border border-slate-600/50 text-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all appearance-none cursor-pointer';
  const btnAiClass = 'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-violet-500/25';

  // Handlers
  async function handleDiagnostic() {
    if (!diagQuery.trim()) return toast.error('Please describe the problem');
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const res = await api.aiDiagnosticAssistant({
        query: diagQuery,
        equipment_type: diagEquipType || undefined,
        symptoms: diagSymptoms || undefined,
      });
      setDiagResult(res);
    } catch (err) {
      toast.error(err.message);
      setDiagResult({ success: false, error: err.message });
    } finally {
      setDiagLoading(false);
    }
  }

  async function handlePredictive() {
    setPredLoading(true);
    setPredResult(null);
    try {
      const equipment_ids = predIds.trim()
        ? predIds.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const res = await api.aiPredictiveAnalytics({ equipment_ids });
      setPredResult(res);
    } catch (err) {
      toast.error(err.message);
      setPredResult({ success: false, error: err.message });
    } finally {
      setPredLoading(false);
    }
  }

  async function handleCostOptimizer() {
    setCostLoading(true);
    setCostResult(null);
    try {
      const res = await api.aiCostOptimizer({ timeframe: costTimeframe });
      setCostResult(res);
    } catch (err) {
      toast.error(err.message);
      setCostResult({ success: false, error: err.message });
    } finally {
      setCostLoading(false);
    }
  }

  async function handleCompliance() {
    setCompLoading(true);
    setCompResult(null);
    try {
      const res = await api.aiComplianceChecker({
        equipment_id: compEquipId ? Number(compEquipId) : undefined,
      });
      setCompResult(res);
    } catch (err) {
      toast.error(err.message);
      setCompResult({ success: false, error: err.message });
    } finally {
      setCompLoading(false);
    }
  }

  async function handleEnergy() {
    setEnergyLoading(true);
    setEnergyResult(null);
    try {
      const res = await api.aiEnergyAdvisor({
        equipment_id: energyEquipId ? Number(energyEquipId) : undefined,
      });
      setEnergyResult(res);
    } catch (err) {
      toast.error(err.message);
      setEnergyResult({ success: false, error: err.message });
    } finally {
      setEnergyLoading(false);
    }
  }

  async function handleReport() {
    setReportLoading(true);
    setReportResult(null);
    try {
      const res = await api.aiReportGenerator({
        report_type: reportType,
        date_range: reportRange,
      });
      setReportResult(res);
    } catch (err) {
      toast.error(err.message);
      setReportResult({ success: false, error: err.message });
    } finally {
      setReportLoading(false);
    }
  }

  async function handleChat(e) {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = chatMessage.trim();
    setChatMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await api.aiSmartChat({
        message: msg,
        context: 'commercial kitchen equipment maintenance',
      });
      const aiContent = typeof res.response === 'string'
        ? res.response
        : JSON.stringify(res.response);
      setChatMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
    } catch (err) {
      toast.error(err.message);
      setChatMessages(prev => [
        ...prev,
        { role: 'ai', content: `Error: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative mb-10">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 right-0 w-96 h-60 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-xl shadow-violet-500/20">
              <HiSparkles className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                AI Command Center
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                Harness the power of AI for your kitchen operations
              </p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-violet-500/50 via-purple-500/30 to-transparent mt-6" />
        </div>
      </div>

      {/* Top Row - 3 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* A. AI Diagnostic Assistant */}
        <FeatureCard
          icon={HiCpuChip}
          title="AI Diagnostic Assistant"
          description="Describe equipment issues and get AI-powered diagnostic recommendations"
          accentFrom="from-cyan-500"
          accentTo="to-blue-600"
          borderAccent="cyan-500"
          loading={diagLoading}
          result={diagResult}
        >
          <input
            type="text"
            className={inputClass}
            placeholder="Equipment type (e.g., Walk-in Cooler)"
            value={diagEquipType}
            onChange={e => setDiagEquipType(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Symptoms (e.g., unusual noise, temperature fluctuation)"
            value={diagSymptoms}
            onChange={e => setDiagSymptoms(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Describe the problem in detail..."
            value={diagQuery}
            onChange={e => setDiagQuery(e.target.value)}
          />
          <button className={btnAiClass} onClick={handleDiagnostic} disabled={diagLoading}>
            <HiSparkles className="text-base" />
            Run Diagnostic
          </button>
        </FeatureCard>

        {/* B. Predictive Analytics */}
        <FeatureCard
          icon={HiChartBar}
          title="Predictive Analytics"
          description="Forecast equipment failures and maintenance needs before they happen"
          accentFrom="from-violet-500"
          accentTo="to-purple-600"
          borderAccent="violet-500"
          loading={predLoading}
          result={predResult}
        >
          <input
            type="text"
            className={inputClass}
            placeholder="Equipment IDs (comma-separated, optional)"
            value={predIds}
            onChange={e => setPredIds(e.target.value)}
          />
          <p className="text-xs text-slate-500">Leave empty to analyze all equipment</p>
          <button className={btnAiClass} onClick={handlePredictive} disabled={predLoading}>
            <HiSparkles className="text-base" />
            Run Analysis
          </button>
        </FeatureCard>

        {/* C. Cost Optimizer */}
        <FeatureCard
          icon={HiCurrencyDollar}
          title="Cost Optimizer"
          description="Identify cost-saving opportunities and optimize your maintenance budget"
          accentFrom="from-emerald-500"
          accentTo="to-teal-600"
          borderAccent="emerald-500"
          loading={costLoading}
          result={costResult}
        >
          <label className="block">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Timeframe</span>
            <select
              className={selectClass}
              value={costTimeframe}
              onChange={e => setCostTimeframe(e.target.value)}
            >
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="last_year">Last Year</option>
              <option value="all_time">All Time</option>
            </select>
          </label>
          <button className={btnAiClass} onClick={handleCostOptimizer} disabled={costLoading}>
            <HiSparkles className="text-base" />
            Run Analysis
          </button>
        </FeatureCard>
      </div>

      {/* Middle Row - 3 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* D. Compliance Checker */}
        <FeatureCard
          icon={HiShieldCheck}
          title="Compliance Checker"
          description="Verify equipment meets health, safety, and regulatory compliance standards"
          accentFrom="from-amber-500"
          accentTo="to-orange-600"
          borderAccent="amber-500"
          loading={compLoading}
          result={compResult}
        >
          <input
            type="number"
            className={inputClass}
            placeholder="Equipment ID (optional, leave empty for all)"
            value={compEquipId}
            onChange={e => setCompEquipId(e.target.value)}
          />
          <button className={btnAiClass} onClick={handleCompliance} disabled={compLoading}>
            <HiSparkles className="text-base" />
            Run Analysis
          </button>
        </FeatureCard>

        {/* E. Energy Advisor */}
        <FeatureCard
          icon={HiBolt}
          title="Energy Advisor"
          description="Analyze energy consumption patterns and get efficiency recommendations"
          accentFrom="from-yellow-500"
          accentTo="to-amber-600"
          borderAccent="yellow-500"
          loading={energyLoading}
          result={energyResult}
        >
          <input
            type="number"
            className={inputClass}
            placeholder="Equipment ID (optional, leave empty for all)"
            value={energyEquipId}
            onChange={e => setEnergyEquipId(e.target.value)}
          />
          <button className={btnAiClass} onClick={handleEnergy} disabled={energyLoading}>
            <HiSparkles className="text-base" />
            Run Analysis
          </button>
        </FeatureCard>

        {/* F. Report Generator */}
        <FeatureCard
          icon={HiDocumentText}
          title="Report Generator"
          description="Generate comprehensive AI-powered reports for any aspect of operations"
          accentFrom="from-rose-500"
          accentTo="to-pink-600"
          borderAccent="rose-500"
          loading={reportLoading}
          result={reportResult}
        >
          <label className="block">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Report Type</span>
            <select
              className={selectClass}
              value={reportType}
              onChange={e => setReportType(e.target.value)}
            >
              <option value="maintenance_summary">Maintenance Summary</option>
              <option value="cost_analysis">Cost Analysis</option>
              <option value="compliance_status">Compliance Status</option>
              <option value="equipment_health">Equipment Health</option>
              <option value="energy_report">Energy Report</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date Range</span>
            <select
              className={selectClass}
              value={reportRange}
              onChange={e => setReportRange(e.target.value)}
            >
              <option value="last_week">Last Week</option>
              <option value="last_month">Last Month</option>
              <option value="last_quarter">Last Quarter</option>
              <option value="last_year">Last Year</option>
            </select>
          </label>
          <button className={btnAiClass} onClick={handleReport} disabled={reportLoading}>
            <HiSparkles className="text-base" />
            Generate Report
          </button>
        </FeatureCard>
      </div>

      {/* Bottom Row - Smart Chat full width */}
      <div className="relative rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 overflow-hidden hover:border-indigo-500/40 transition-all duration-300">
        {/* Top accent line */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg flex-shrink-0">
              <HiChatBubbleLeftRight className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Smart Chat Assistant</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ask anything about kitchen equipment maintenance, troubleshooting, best practices, and more
              </p>
            </div>
          </div>

          {/* Chat conversation area */}
          <div className="rounded-xl bg-slate-900/50 border border-slate-700/40 mb-4 min-h-[200px] max-h-[420px] overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                  <HiChatBubbleLeftRight className="text-indigo-400 text-3xl" />
                </div>
                <p className="text-slate-400 text-sm font-medium mb-1">Start a conversation</p>
                <p className="text-slate-500 text-xs max-w-md">
                  Ask about equipment diagnostics, maintenance schedules, compliance requirements, energy optimization, or any other kitchen operations topic.
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/15'
                      : 'bg-slate-800/80 border border-slate-700/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {msg.role === 'ai' && <HiSparkles className="text-violet-400 text-xs" />}
                    <span className={`text-xs font-semibold uppercase tracking-wider ${
                      msg.role === 'user' ? 'text-violet-200' : 'text-violet-400'
                    }`}>
                      {msg.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-5 py-3">
                  <div className="flex items-center gap-2">
                    <HiSparkles className="text-violet-400 text-xs" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat input */}
          <form onSubmit={handleChat} className="flex gap-3">
            <input
              type="text"
              className={`${inputClass} flex-1`}
              placeholder="Type your message..."
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatMessage.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <HiSparkles className="text-base" />
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
