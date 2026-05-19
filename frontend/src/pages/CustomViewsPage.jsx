import React from 'react';
import UptimeTrendChart from '../components/UptimeTrendChart';
import MaintenanceHeatmap from '../components/MaintenanceHeatmap';
import PMSchedulePDF from '../components/PMSchedulePDF';
import MaintenanceRulesEditor from '../components/MaintenanceRulesEditor';
import { TbChefHat } from 'react-icons/tb';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <TbChefHat className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Kitchen Views</h2>
          <p className="text-sm text-slate-400">Custom operational views for commercial kitchen equipment maintenance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UptimeTrendChart />
        <MaintenanceHeatmap />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <MaintenanceRulesEditor />
        <PMSchedulePDF />
      </div>
    </div>
  );
}
