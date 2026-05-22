import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HiHome,
  HiWrench,
  HiCalendarDays,
  HiClipboardDocumentList,
  HiCube,
  HiCpuChip,
  HiShieldCheck,
  HiTruck,
  HiBolt,
  HiCurrencyDollar,
  HiUsers,
  HiSparkles,
  HiBeaker,
  HiBell,
  HiSquares2X2,
  HiArrowRightOnRectangle,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';
import { TbChefHat } from 'react-icons/tb';

const navItems = [
  { label: 'Dashboard', path: '/', icon: HiHome },
  { label: 'Equipment', path: '/equipment', icon: HiWrench },
  { label: 'Maintenance', path: '/maintenance', icon: HiCalendarDays },
  { label: 'Work Orders', path: '/work-orders', icon: HiClipboardDocumentList },
  { label: 'Parts Inventory', path: '/parts', icon: HiCube },
  { label: 'Diagnostics', path: '/diagnostics', icon: HiCpuChip },
  { label: 'Compliance', path: '/compliance', icon: HiShieldCheck },
  { label: 'Vendors', path: '/vendors', icon: HiTruck },
  { label: 'Energy', path: '/energy', icon: HiBolt },
  { label: 'Cost Analytics', path: '/costs', icon: HiCurrencyDollar },
  { label: 'Technicians', path: '/technicians', icon: HiUsers },
  { label: 'Kitchen Views', path: '/custom-views', icon: HiSquares2X2 },
  { label: 'Parts Triage', path: '/parts-triage', icon: HiCube },
];

const aiItems = [
  { label: 'AI Center', path: '/ai-center', icon: HiSparkles },
  { label: 'AI Lab', path: '/ai-lab', icon: HiBeaker },
];

const systemItems = [
  { label: 'Notifications', path: '/notifications', icon: HiBell },
  { label: 'Webhooks', path: '/webhooks', icon: HiBolt },
];

const routeTitles = {
  '/': 'Dashboard',
  '/equipment': 'Equipment',
  '/maintenance': 'Maintenance',
  '/work-orders': 'Work Orders',
  '/parts': 'Parts Inventory',
  '/diagnostics': 'Diagnostics',
  '/compliance': 'Compliance',
  '/vendors': 'Vendors',
  '/energy': 'Energy',
  '/costs': 'Cost Analytics',
  '/technicians': 'Technicians',
  '/custom-views': 'Kitchen Views',
  '/parts-triage': 'Parts Triage',
  '/ai-center': 'AI Center',
  '/ai-lab': 'AI Lab',
  '/notifications': 'Notifications',
  '/webhooks': 'Webhooks',
};

export default function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const pageTitle = useMemo(() => {
    const exactMatch = routeTitles[location.pathname];
    if (exactMatch) return exactMatch;
    const match = Object.entries(routeTitles).find(([path]) =>
      path !== '/' && location.pathname.startsWith(path)
    );
    return match ? match[1] : 'Dashboard';
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-[260px]';

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarWidth} flex-shrink-0 bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-300 ease-in-out relative z-30`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700/50 gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
            <TbChefHat className="text-white text-lg" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-opacity duration-200">
              KitchenAI Pro
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${active
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r" />
                )}
                <Icon className={`text-lg flex-shrink-0 transition-colors duration-200 ${active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 mx-3 border-t border-slate-700/50" />

          {/* System Items */}
          {systemItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${active
                    ? 'bg-violet-500/15 text-violet-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r" />
                )}
                <Icon className={`text-lg flex-shrink-0 transition-colors duration-200 ${active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-3 mx-3 border-t border-slate-700/50" />

          {/* AI Items */}
          {aiItems.map((aiItem) => {
            const Icon = aiItem.icon;
            const active = isActive(aiItem.path);
            return (
              <Link
                key={aiItem.path}
                to={aiItem.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${active
                    ? 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-purple-300'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/60'
                  }`}
                title={collapsed ? aiItem.label : undefined}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-violet-400 to-purple-400 rounded-r" />
                )}
                <div className={`p-0.5 rounded-md flex-shrink-0 ${active ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-violet-600/50 to-purple-600/50 group-hover:from-violet-500 group-hover:to-purple-500'} transition-all duration-200`}>
                  <Icon className="text-sm text-white" />
                </div>
                {!collapsed && (
                  <span className="whitespace-nowrap overflow-hidden bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent font-semibold">
                    {aiItem.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-slate-700/50 p-2 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-all duration-200 text-sm"
          >
            {collapsed ? (
              <HiChevronRight className="text-lg" />
            ) : (
              <>
                <HiChevronLeft className="text-lg" />
                <span className="whitespace-nowrap">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 flex-shrink-0 z-20">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-200">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role || 'admin'}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm"
              title="Logout"
            >
              <HiArrowRightOnRectangle className="text-lg" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
