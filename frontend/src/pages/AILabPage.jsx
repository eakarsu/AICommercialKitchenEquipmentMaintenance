import React, { useState, useEffect } from 'react';
import { api } from '../api';
import AIResponseDisplay from '../components/AIResponseDisplay';
import toast from 'react-hot-toast';
import {
  HiSparkles,
  HiBeaker,
  HiCpuChip,
  HiCube,
  HiShieldCheck,
  HiCurrencyDollar,
  HiUsers,
  HiBolt,
  HiClipboardDocumentCheck,
  HiClock,
  HiClipboardDocumentList,
  HiVideoCamera,
  HiExclamationTriangle,
} from 'react-icons/hi2';

const inputClass = 'w-full rounded-xl bg-slate-900/60 border border-slate-600/50 text-slate-200 placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all';
const selectClass = 'w-full rounded-xl bg-slate-900/60 border border-slate-600/50 text-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 transition-all appearance-none cursor-pointer';
const btnClass = 'w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <HiSparkles className="text-violet-400 text-sm animate-pulse" />
        </div>
      </div>
      <span className="ml-4 text-sm text-slate-400 animate-pulse">AI is analyzing...</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accent, children, loading, result }) {
  return (
    <div className="relative rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 overflow-hidden transition-all duration-300 hover:border-violet-500/40">
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${accent} shadow-lg flex-shrink-0`}>
            <Icon className="text-white text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="space-y-4">{children}</div>
        {loading && <LoadingSpinner />}
        {result && !loading && (
          <div className="mt-5">
            <AIResponseDisplay result={result} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AILabPage() {
  const [equipmentList, setEquipmentList] = useState([]);
  const [partsList, setPartsList] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [eq, p] = await Promise.all([api.getEquipment(), api.getParts()]);
        setEquipmentList(Array.isArray(eq) ? eq : eq.data || []);
        setPartsList(Array.isArray(p) ? p : p.data || []);
      } catch (e) {
        // soft fail
      }
    })();
  }, []);

  // FMEA
  const [fmeaEquipType, setFmeaEquipType] = useState('');
  const [fmeaFailure, setFmeaFailure] = useState('');
  const [fmeaLoading, setFmeaLoading] = useState(false);
  const [fmeaResult, setFmeaResult] = useState(null);

  const runFMEA = async () => {
    if (!fmeaEquipType.trim() || !fmeaFailure.trim()) {
      return toast.error('Equipment type and failure description are required');
    }
    setFmeaLoading(true);
    setFmeaResult(null);
    try {
      const res = await api.aiFailureModeAnalysis({
        equipment_type: fmeaEquipType,
        failure_description: fmeaFailure,
        maintenance_history: [],
      });
      setFmeaResult(res);
    } catch (err) {
      toast.error('FMEA failed: ' + err.message);
      setFmeaResult({ error: err.message });
    } finally {
      setFmeaLoading(false);
    }
  };

  // Parts Obsolescence
  const [obsPartsText, setObsPartsText] = useState('');
  const [obsLoading, setObsLoading] = useState(false);
  const [obsResult, setObsResult] = useState(null);

  const runObsolescence = async () => {
    let parts;
    try {
      if (obsPartsText.trim()) {
        parts = JSON.parse(obsPartsText);
        if (!Array.isArray(parts)) throw new Error('Must be JSON array');
      } else {
        parts = partsList.slice(0, 10).map(p => ({
          id: p.id,
          part_number: p.part_number,
          name: p.name,
          category: p.category,
          manufacturer: p.manufacturer,
        }));
      }
    } catch (err) {
      return toast.error('Invalid parts JSON: ' + err.message);
    }
    if (!parts.length) return toast.error('No parts to analyze');
    setObsLoading(true);
    setObsResult(null);
    try {
      const res = await api.aiPartsObsolescence({ parts_list: parts });
      setObsResult(res);
    } catch (err) {
      toast.error('Obsolescence analysis failed: ' + err.message);
      setObsResult({ error: err.message });
    } finally {
      setObsLoading(false);
    }
  };

  // Advanced Compliance
  const [complianceEquipId, setComplianceEquipId] = useState('');
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceResult, setComplianceResult] = useState(null);

  const runCompliance = async () => {
    if (!complianceEquipId) return toast.error('Equipment ID is required');
    setComplianceLoading(true);
    setComplianceResult(null);
    try {
      const res = await api.aiAdvancedComplianceCheck({ equipment_id: Number(complianceEquipId) });
      setComplianceResult(res);
    } catch (err) {
      toast.error('Compliance check failed: ' + err.message);
      setComplianceResult({ error: err.message });
    } finally {
      setComplianceLoading(false);
    }
  };

  // Predictive Failure
  const [predEquip, setPredEquip] = useState('');
  const [predLoading, setPredLoading] = useState(false);
  const [predResult, setPredResult] = useState(null);

  const runPredictive = async () => {
    setPredLoading(true);
    setPredResult(null);
    try {
      const ids = predEquip.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.aiPredictiveFailure({ equipment_ids: ids });
      setPredResult(res);
    } catch (err) {
      toast.error('Prediction failed: ' + err.message);
      setPredResult({ error: err.message });
    } finally {
      setPredLoading(false);
    }
  };

  // Auto-Parts Ordering
  const [autoOrderTimeframe, setAutoOrderTimeframe] = useState('last_quarter');
  const [autoOrderLoading, setAutoOrderLoading] = useState(false);
  const [autoOrderResult, setAutoOrderResult] = useState(null);

  const runAutoOrder = async () => {
    setAutoOrderLoading(true);
    setAutoOrderResult(null);
    try {
      const res = await api.aiAutoPartsOrder({
        timeframe: autoOrderTimeframe,
        focus: 'parts_inventory_reorder',
      });
      setAutoOrderResult(res);
    } catch (err) {
      toast.error('Auto-order analysis failed: ' + err.message);
      setAutoOrderResult({ error: err.message });
    } finally {
      setAutoOrderLoading(false);
    }
  };

  // Technician Optimizer
  const [techQuery, setTechQuery] = useState('');
  const [techLoading, setTechLoading] = useState(false);
  const [techResult, setTechResult] = useState(null);

  const runTechOptimizer = async () => {
    if (!techQuery.trim()) return toast.error('Describe the assignment scenario');
    setTechLoading(true);
    setTechResult(null);
    try {
      const res = await api.aiTechnicianOptimizer({
        message: `Optimize technician assignment: ${techQuery}. Match available technician skills, certifications, location and availability with the work-order requirements.`,
        context: 'technician dispatch optimizer',
      });
      setTechResult(res);
    } catch (err) {
      toast.error('Optimizer failed: ' + err.message);
      setTechResult({ error: err.message });
    } finally {
      setTechLoading(false);
    }
  };

  // Energy Cost Analyzer
  const [energyEquipId, setEnergyEquipId] = useState('');
  const [energyLoading, setEnergyLoading] = useState(false);
  const [energyResult, setEnergyResult] = useState(null);

  const runEnergy = async () => {
    setEnergyLoading(true);
    setEnergyResult(null);
    try {
      const res = await api.aiEnergyCostAnalyzer({
        equipment_id: energyEquipId ? Number(energyEquipId) : undefined,
      });
      setEnergyResult(res);
    } catch (err) {
      toast.error('Energy analysis failed: ' + err.message);
      setEnergyResult({ error: err.message });
    } finally {
      setEnergyLoading(false);
    }
  };

  // Warranty Manager
  const [warrantyType, setWarrantyType] = useState('compliance_status');
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantyResult, setWarrantyResult] = useState(null);

  const runWarranty = async () => {
    setWarrantyLoading(true);
    setWarrantyResult(null);
    try {
      const res = await api.aiWarrantyManager({
        report_type: warrantyType,
        date_range: 'last_year',
        focus: 'warranty_expiration_and_claims_management',
      });
      setWarrantyResult(res);
    } catch (err) {
      toast.error('Warranty report failed: ' + err.message);
      setWarrantyResult({ error: err.message });
    } finally {
      setWarrantyLoading(false);
    }
  };

  // Maintenance History Dashboard
  const [historyType, setHistoryType] = useState('maintenance_summary');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);

  const runHistory = async () => {
    setHistoryLoading(true);
    setHistoryResult(null);
    try {
      const res = await api.aiMaintenanceHistoryDashboard({
        report_type: historyType,
        date_range: 'last_year',
      });
      setHistoryResult(res);
    } catch (err) {
      toast.error('History analysis failed: ' + err.message);
      setHistoryResult({ error: err.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Compliance Audit Generator
  const [auditEquipId, setAuditEquipId] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  const runAudit = async () => {
    setAuditLoading(true);
    setAuditResult(null);
    try {
      const res = await api.aiComplianceAuditGenerator({
        equipment_id: auditEquipId ? Number(auditEquipId) : undefined,
      });
      setAuditResult(res);
    } catch (err) {
      toast.error('Audit failed: ' + err.message);
      setAuditResult({ error: err.message });
    } finally {
      setAuditLoading(false);
    }
  };

  // Remote Diagnostic
  const [remoteEquipType, setRemoteEquipType] = useState('');
  const [remoteSymptoms, setRemoteSymptoms] = useState('');
  const [remoteQuery, setRemoteQuery] = useState('');
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteResult, setRemoteResult] = useState(null);

  const runRemote = async () => {
    if (!remoteQuery.trim()) return toast.error('Describe the issue from the field');
    setRemoteLoading(true);
    setRemoteResult(null);
    try {
      const res = await api.aiRemoteDiagnostic({
        query: `[REMOTE FIELD SUPPORT] ${remoteQuery}`,
        equipment_type: remoteEquipType || undefined,
        symptoms: remoteSymptoms || undefined,
      });
      setRemoteResult(res);
    } catch (err) {
      toast.error('Remote diagnostic failed: ' + err.message);
      setRemoteResult({ error: err.message });
    } finally {
      setRemoteLoading(false);
    }
  };

  // Work Order Summarizer
  const [woSumStatus, setWoSumStatus] = useState('');
  const [woSumLoading, setWoSumLoading] = useState(false);
  const [woSumResult, setWoSumResult] = useState(null);
  const runWoSummarizer = async () => {
    setWoSumLoading(true);
    setWoSumResult(null);
    try {
      const res = await api.aiWorkOrderSummarizer({ status_filter: woSumStatus || undefined });
      setWoSumResult(res);
    } catch (err) {
      toast.error('Summarizer failed: ' + err.message);
      setWoSumResult({ error: err.message });
    } finally {
      setWoSumLoading(false);
    }
  };

  // Vendor Selection Advisor
  const [vendorEquipType, setVendorEquipType] = useState('');
  const [vendorScope, setVendorScope] = useState('');
  const [vendorBudget, setVendorBudget] = useState('');
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorResult, setVendorResult] = useState(null);
  const runVendorAdvisor = async () => {
    if (!vendorScope.trim()) return toast.error('Scope of work is required');
    setVendorLoading(true);
    setVendorResult(null);
    try {
      const res = await api.aiVendorSelectionAdvisor({
        equipment_type: vendorEquipType || undefined,
        scope_of_work: vendorScope,
        budget_ceiling: vendorBudget || undefined,
      });
      setVendorResult(res);
    } catch (err) {
      toast.error('Vendor advisor failed: ' + err.message);
      setVendorResult({ error: err.message });
    } finally {
      setVendorLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-violet-700 shadow-xl shadow-fuchsia-500/20">
            <HiBeaker className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
              AI Lab
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Advanced AI tools: FMEA, parts obsolescence, predictive failure, auto-ordering, technician optimization, warranty management, and remote support.
            </p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-fuchsia-500/50 via-violet-500/30 to-transparent mt-6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FMEA */}
        <FeatureCard
          icon={HiCpuChip}
          title="Failure Mode & Effects Analysis (FMEA)"
          description="Comprehensive FMEA with severity, occurrence, detectability scores and root-cause analysis."
          accent="from-cyan-500 to-blue-600"
          loading={fmeaLoading}
          result={fmeaResult}
        >
          <input
            className={inputClass}
            placeholder="Equipment type (e.g., Walk-in Cooler)"
            value={fmeaEquipType}
            onChange={e => setFmeaEquipType(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Failure description..."
            value={fmeaFailure}
            onChange={e => setFmeaFailure(e.target.value)}
          />
          <button className={btnClass} onClick={runFMEA} disabled={fmeaLoading}>
            <HiSparkles /> Run FMEA
          </button>
        </FeatureCard>

        {/* Parts Obsolescence */}
        <FeatureCard
          icon={HiCube}
          title="Parts Obsolescence Detector"
          description="Identifies end-of-life parts, suggests aftermarket alternatives and procurement actions."
          accent="from-amber-500 to-orange-600"
          loading={obsLoading}
          result={obsResult}
        >
          <textarea
            className={`${inputClass} resize-none font-mono text-xs`}
            rows={4}
            placeholder='Optional: paste parts JSON array, e.g. [{"part_number":"P-1","name":"Compressor"}]'
            value={obsPartsText}
            onChange={e => setObsPartsText(e.target.value)}
          />
          <p className="text-xs text-slate-500">Empty = analyze first 10 parts from inventory ({partsList.length} loaded)</p>
          <button className={btnClass} onClick={runObsolescence} disabled={obsLoading}>
            <HiSparkles /> Detect Obsolescence
          </button>
        </FeatureCard>

        {/* Advanced Compliance */}
        <FeatureCard
          icon={HiShieldCheck}
          title="NSF/ANSI/HACCP Compliance Check"
          description="Deep-dive compliance against NSF/ANSI standards, HACCP CCPs and FDA food-safety regs."
          accent="from-emerald-500 to-teal-600"
          loading={complianceLoading}
          result={complianceResult}
        >
          <select className={selectClass} value={complianceEquipId} onChange={e => setComplianceEquipId(e.target.value)}>
            <option value="">Select equipment...</option>
            {equipmentList.map(e => (
              <option key={e.id} value={e.id}>#{e.id} {e.name} ({e.type})</option>
            ))}
          </select>
          <button className={btnClass} onClick={runCompliance} disabled={complianceLoading}>
            <HiSparkles /> Run Compliance Check
          </button>
        </FeatureCard>

        {/* Predictive Failure */}
        <FeatureCard
          icon={HiExclamationTriangle}
          title="Predictive Failure Diagnosis"
          description="ML-style prediction of pending failures using historical maintenance, performance and usage data."
          accent="from-rose-500 to-red-600"
          loading={predLoading}
          result={predResult}
        >
          <input
            className={inputClass}
            placeholder="Equipment IDs (comma-separated; empty = all)"
            value={predEquip}
            onChange={e => setPredEquip(e.target.value)}
          />
          <button className={btnClass} onClick={runPredictive} disabled={predLoading}>
            <HiSparkles /> Predict Failures
          </button>
        </FeatureCard>

        {/* Auto-Parts Ordering */}
        <FeatureCard
          icon={HiCurrencyDollar}
          title="Auto-Parts Ordering Assistant"
          description="Analyzes parts usage rates, predicts inventory needs and recommends purchase orders."
          accent="from-lime-500 to-green-600"
          loading={autoOrderLoading}
          result={autoOrderResult}
        >
          <select className={selectClass} value={autoOrderTimeframe} onChange={e => setAutoOrderTimeframe(e.target.value)}>
            <option value="last_month">Last Month</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="last_year">Last Year</option>
          </select>
          <button className={btnClass} onClick={runAutoOrder} disabled={autoOrderLoading}>
            <HiSparkles /> Generate Reorder Plan
          </button>
        </FeatureCard>

        {/* Technician Assignment Optimizer */}
        <FeatureCard
          icon={HiUsers}
          title="Technician Assignment Optimizer"
          description="Matches technician skills, certifications, location and availability to work orders."
          accent="from-blue-500 to-indigo-600"
          loading={techLoading}
          result={techResult}
        >
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Describe the open work orders, skill needs, and constraints..."
            value={techQuery}
            onChange={e => setTechQuery(e.target.value)}
          />
          <button className={btnClass} onClick={runTechOptimizer} disabled={techLoading}>
            <HiSparkles /> Optimize Assignment
          </button>
        </FeatureCard>

        {/* Energy Cost Analyzer */}
        <FeatureCard
          icon={HiBolt}
          title="Energy Cost Analyzer"
          description="Tracks consumption, identifies inefficient machines and recommends upgrades with ROI."
          accent="from-yellow-500 to-amber-600"
          loading={energyLoading}
          result={energyResult}
        >
          <select className={selectClass} value={energyEquipId} onChange={e => setEnergyEquipId(e.target.value)}>
            <option value="">All equipment</option>
            {equipmentList.map(e => (
              <option key={e.id} value={e.id}>#{e.id} {e.name}</option>
            ))}
          </select>
          <button className={btnClass} onClick={runEnergy} disabled={energyLoading}>
            <HiSparkles /> Analyze Energy
          </button>
        </FeatureCard>

        {/* Warranty Manager */}
        <FeatureCard
          icon={HiClipboardDocumentCheck}
          title="Warranty Claims Manager"
          description="Tracks warranty periods, flags expiring coverage and drafts claim documentation."
          accent="from-purple-500 to-fuchsia-600"
          loading={warrantyLoading}
          result={warrantyResult}
        >
          <select className={selectClass} value={warrantyType} onChange={e => setWarrantyType(e.target.value)}>
            <option value="compliance_status">Coverage Status Report</option>
            <option value="cost_analysis">Claim Cost Forecast</option>
            <option value="equipment_health">Equipment Coverage Health</option>
          </select>
          <button className={btnClass} onClick={runWarranty} disabled={warrantyLoading}>
            <HiSparkles /> Generate Warranty Report
          </button>
        </FeatureCard>

        {/* Maintenance History Dashboard */}
        <FeatureCard
          icon={HiClock}
          title="Maintenance History Dashboard"
          description="Visual timeline of service history, downtime and recurring-issue trend analysis."
          accent="from-sky-500 to-cyan-600"
          loading={historyLoading}
          result={historyResult}
        >
          <select className={selectClass} value={historyType} onChange={e => setHistoryType(e.target.value)}>
            <option value="maintenance_summary">Maintenance Summary</option>
            <option value="cost_analysis">Cost Trends</option>
            <option value="equipment_health">Equipment Health Trends</option>
          </select>
          <button className={btnClass} onClick={runHistory} disabled={historyLoading}>
            <HiSparkles /> Generate Dashboard
          </button>
        </FeatureCard>

        {/* Compliance Audit Generator */}
        <FeatureCard
          icon={HiClipboardDocumentList}
          title="Compliance Audit Generator"
          description="Auto-generates regulatory reports for health inspectors with cert status and incident logs."
          accent="from-orange-500 to-rose-600"
          loading={auditLoading}
          result={auditResult}
        >
          <select className={selectClass} value={auditEquipId} onChange={e => setAuditEquipId(e.target.value)}>
            <option value="">All equipment</option>
            {equipmentList.map(e => (
              <option key={e.id} value={e.id}>#{e.id} {e.name}</option>
            ))}
          </select>
          <button className={btnClass} onClick={runAudit} disabled={auditLoading}>
            <HiSparkles /> Generate Audit Pack
          </button>
        </FeatureCard>

        {/* Remote Diagnostic */}
        <FeatureCard
          icon={HiVideoCamera}
          title="Remote Diagnostic Support"
          description="Field-support mode for remote technicians guiding on-site staff through diagnostics."
          accent="from-teal-500 to-emerald-600"
          loading={remoteLoading}
          result={remoteResult}
        >
          <input
            className={inputClass}
            placeholder="Equipment type"
            value={remoteEquipType}
            onChange={e => setRemoteEquipType(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Visible symptoms / readings..."
            value={remoteSymptoms}
            onChange={e => setRemoteSymptoms(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Field technician question..."
            value={remoteQuery}
            onChange={e => setRemoteQuery(e.target.value)}
          />
          <button className={btnClass} onClick={runRemote} disabled={remoteLoading}>
            <HiSparkles /> Get Remote Guidance
          </button>
        </FeatureCard>

        {/* Work Order Summarizer */}
        <FeatureCard
          icon={HiClipboardDocumentList}
          title="Work Order Summarizer"
          description="Aggregates recent work orders into KPIs, top issues and prioritized recommendations."
          accent="from-indigo-500 to-blue-600"
          loading={woSumLoading}
          result={woSumResult}
        >
          <select className={selectClass} value={woSumStatus} onChange={e => setWoSumStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className={btnClass} onClick={runWoSummarizer} disabled={woSumLoading}>
            <HiSparkles /> Summarize Work Orders
          </button>
        </FeatureCard>

        {/* Vendor Selection Advisor */}
        <FeatureCard
          icon={HiUsers}
          title="Vendor Selection Advisor"
          description="Ranks vendors against scope, budget and equipment fit using your vendor pool."
          accent="from-pink-500 to-rose-600"
          loading={vendorLoading}
          result={vendorResult}
        >
          <input
            className={inputClass}
            placeholder="Equipment type (optional)"
            value={vendorEquipType}
            onChange={e => setVendorEquipType(e.target.value)}
          />
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="Scope of work..."
            value={vendorScope}
            onChange={e => setVendorScope(e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Budget ceiling (optional)"
            value={vendorBudget}
            onChange={e => setVendorBudget(e.target.value)}
          />
          <button className={btnClass} onClick={runVendorAdvisor} disabled={vendorLoading}>
            <HiSparkles /> Recommend Vendors
          </button>
        </FeatureCard>
      </div>
    </div>
  );
}
