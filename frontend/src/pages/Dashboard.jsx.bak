import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import {
  HiWrenchScrewdriver,
  HiClipboardDocumentList,
  HiCalendarDays,
  HiCube,
  HiCpuChip,
  HiUserGroup,
  HiArrowRight,
  HiSparkles,
  HiPlusCircle,
  HiCog6Tooth,
  HiMagnifyingGlassCircle,
  HiRocketLaunch,
} from 'react-icons/hi2';

function getPriorityBadge(priority) {
  switch (priority?.toLowerCase()) {
    case 'emergency':
    case 'critical':
      return 'badge-danger';
    case 'high':
      return 'badge-warning';
    case 'medium':
      return 'badge-info';
    case 'low':
      return 'badge-success';
    default:
      return 'badge-info';
  }
}

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case 'operational':
    case 'compliant':
    case 'completed':
    case 'resolved':
      return 'badge-success';
    case 'needs_maintenance':
    case 'overdue':
    case 'pending':
      return 'badge-warning';
    case 'out_of_service':
    case 'critical':
    case 'cancelled':
      return 'badge-danger';
    case 'open':
    case 'in_progress':
    case 'investigating':
      return 'badge-info';
    default:
      return 'badge-info';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatus(status) {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [parts, setParts] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eq, wo, mt, pt, dg, tc] = await Promise.all([
          api.getEquipment(),
          api.getWorkOrders(),
          api.getMaintenance(),
          api.getParts(),
          api.getDiagnostics(),
          api.getTechnicians(),
        ]);
        setEquipment(eq);
        setWorkOrders(wo);
        setMaintenance(mt);
        setParts(pt);
        setDiagnostics(dg);
        setTechnicians(tc);
      } catch (err) {
        toast.error('Failed to load dashboard data: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Compute stats
  const operationalCount = equipment.filter(e => e.status === 'operational').length;
  const needsMaintenanceCount = equipment.filter(e => e.status === 'needs_maintenance').length;

  const activeWorkOrders = workOrders.filter(
    wo => wo.status === 'open' || wo.status === 'in_progress'
  );

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingMaintenance = maintenance.filter(m => {
    const due = new Date(m.next_due);
    return due >= now && due <= sevenDaysFromNow;
  });

  const lowStockParts = parts.filter(p => p.quantity <= p.minimum_stock);

  const openDiagnostics = diagnostics.filter(
    d => d.status === 'open' || d.status === 'investigating'
  );

  const availableTechnicians = technicians.filter(t => t.status === 'available');

  // Recent work orders (last 5, sorted by created_at desc)
  const recentWorkOrders = [...workOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Upcoming maintenance (next 5, sorted by next_due asc)
  const upcomingMaintenanceList = [...maintenance]
    .filter(m => new Date(m.next_due) >= now)
    .sort((a, b) => new Date(a.next_due) - new Date(b.next_due))
    .slice(0, 5);

  const stats = [
    {
      label: 'Total Equipment',
      count: equipment.length,
      sub: `${operationalCount} operational / ${needsMaintenanceCount} needs maintenance`,
      icon: HiWrenchScrewdriver,
      color: 'blue',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Active Work Orders',
      count: activeWorkOrders.length,
      sub: `of ${workOrders.length} total`,
      icon: HiClipboardDocumentList,
      color: 'amber',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      label: 'Upcoming Maintenance',
      count: upcomingMaintenance.length,
      sub: 'next 7 days',
      icon: HiCalendarDays,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Low Stock Parts',
      count: lowStockParts.length,
      sub: `of ${parts.length} total parts`,
      icon: HiCube,
      color: 'red',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
    },
    {
      label: 'Open Diagnostics',
      count: openDiagnostics.length,
      sub: `of ${diagnostics.length} total`,
      icon: HiCpuChip,
      color: 'purple',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      label: 'Available Technicians',
      count: availableTechnicians.length,
      sub: `of ${technicians.length} total`,
      icon: HiUserGroup,
      color: 'cyan',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
    },
  ];

  const quickActions = [
    {
      label: 'Equipment Inventory',
      description: 'View and manage all kitchen equipment',
      path: '/equipment',
      icon: HiWrenchScrewdriver,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 hover:bg-blue-500/20',
      border: 'border-blue-500/20 hover:border-blue-500/40',
    },
    {
      label: 'Schedule Maintenance',
      description: 'Plan and track maintenance schedules',
      path: '/maintenance',
      icon: HiCalendarDays,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
    },
    {
      label: 'Create Work Order',
      description: 'Submit new repair or service requests',
      path: '/work-orders',
      icon: HiPlusCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 hover:bg-amber-500/20',
      border: 'border-amber-500/20 hover:border-amber-500/40',
    },
    {
      label: 'AI Diagnostics',
      description: 'Run AI-powered equipment diagnostics',
      path: '/diagnostics',
      icon: HiMagnifyingGlassCircle,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
    },
    {
      label: 'AI Center',
      description: 'Access all AI-powered tools and insights',
      path: '/ai-center',
      icon: HiSparkles,
      gradient: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Overview of your kitchen equipment maintenance operations
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`stat-card ${stat.bg} ${stat.border} transition-all duration-300 hover:shadow-lg`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-2">{stat.count}</p>
                  <p className="text-slate-500 text-xs mt-1">{stat.sub}</p>
                </div>
                <div className={`${stat.iconBg} p-3 rounded-xl`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Recent Work Orders + Upcoming Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HiClipboardDocumentList className="h-5 w-5 text-amber-400" />
              Recent Work Orders
            </h2>
            <button
              onClick={() => navigate('/work-orders')}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all <HiArrowRight className="h-4 w-4" />
            </button>
          </div>
          {recentWorkOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">No work orders yet</div>
          ) : (
            <div className="table-container border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorkOrders.map((wo) => (
                    <tr key={wo.id} onClick={() => navigate('/work-orders')}>
                      <td className="text-slate-200 font-medium max-w-[180px] truncate">
                        {wo.title}
                      </td>
                      <td>
                        <span className={getPriorityBadge(wo.priority)}>
                          {formatStatus(wo.priority)}
                        </span>
                      </td>
                      <td>
                        <span className={getStatusBadge(wo.status)}>
                          {formatStatus(wo.status)}
                        </span>
                      </td>
                      <td className="text-slate-400 text-sm">{formatDate(wo.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Maintenance */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <HiCalendarDays className="h-5 w-5 text-emerald-400" />
              Upcoming Maintenance
            </h2>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View all <HiArrowRight className="h-4 w-4" />
            </button>
          </div>
          {upcomingMaintenanceList.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No upcoming maintenance scheduled
            </div>
          ) : (
            <div className="table-container border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Equipment</th>
                    <th>Due</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMaintenanceList.map((m) => (
                    <tr key={m.id} onClick={() => navigate('/maintenance')}>
                      <td className="text-slate-200 font-medium max-w-[160px] truncate">
                        {m.task_name}
                      </td>
                      <td className="text-slate-400 text-sm max-w-[120px] truncate">
                        {m.equipment_name}
                      </td>
                      <td className="text-slate-400 text-sm">{formatDate(m.next_due)}</td>
                      <td>
                        <span className={getPriorityBadge(m.priority)}>
                          {formatStatus(m.priority)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            if (action.gradient) {
              return (
                <div
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="relative overflow-hidden rounded-xl p-5 cursor-pointer transition-all duration-300
                             bg-gradient-to-br from-purple-600/20 to-pink-600/20
                             border border-purple-500/30 hover:border-purple-500/60
                             hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02]
                             group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 group-hover:from-purple-600/10 group-hover:to-pink-600/10 transition-all duration-300"></div>
                  <div className="relative">
                    <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 p-3 rounded-xl w-fit mb-3">
                      <Icon className="h-6 w-6 text-purple-300" />
                    </div>
                    <h3 className="text-white font-semibold text-sm">{action.label}</h3>
                    <p className="text-purple-300/60 text-xs mt-1">{action.description}</p>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`rounded-xl p-5 cursor-pointer transition-all duration-300
                            ${action.bg} border ${action.border}
                            hover:shadow-lg hover:scale-[1.02] group`}
              >
                <div className={`${action.bg.split(' ')[0]} p-3 rounded-xl w-fit mb-3`}>
                  <Icon className={`h-6 w-6 ${action.color}`} />
                </div>
                <h3 className="text-white font-semibold text-sm">{action.label}</h3>
                <p className="text-slate-500 text-xs mt-1">{action.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
