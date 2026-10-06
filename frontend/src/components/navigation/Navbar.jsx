import React from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  LayoutDashboard,
  BedDouble,
  Sparkles,
  Wrench,
  Activity,
  ListTodo,
  RefreshCw,
  RotateCcw,
  Zap,
  Play,
  Pause,
} from 'lucide-react';

export default function Navbar() {
  const {
    activeTab,
    setActiveTab,
    isOnline,
    metrics,
    simulationActive,
    setSimulationActive,
    triggerCheckout,
    resetSystem,
    refreshData,
  } = useHotel();

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms Grid', icon: BedDouble },
    { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles, badge: metrics.dirtyCount },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, badge: metrics.maintenanceCount },
    { id: 'traces', label: 'Agent Traces', icon: Activity },
    { id: 'tasks', label: 'Tasks Board', icon: ListTodo },
  ];

  return (
    <header className="bg-[#222222] text-white border-b border-neutral-800 sticky top-0 z-40 shadow-md">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ff385c] flex items-center justify-center font-bold text-white shadow-md shadow-rose-900/30">
            <Zap size={20} className="fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-white">Voyage Ops</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Autonomous
              </span>
            </div>
            <p className="text-xs text-neutral-400">Multi-Agent Hotel Operations Platform</p>
          </div>
        </div>

        {/* Quick Action Buttons & Status Indicators */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Backend Health Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                : 'bg-amber-950/60 text-amber-400 border-amber-800/80'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isOnline ? 'PostgreSQL Connected' : 'Mock Client Mode'}
          </span>

          {/* Simulation Toggle */}
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              simulationActive
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            {simulationActive ? <Pause size={13} /> : <Play size={13} />}
            <span>{simulationActive ? 'Live Simulation Active' : 'Start Simulation'}</span>
          </button>

          {/* Trigger Checkout Button */}
          <button
            onClick={() => triggerCheckout(1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#ff385c] text-white hover:bg-rose-600 transition-all shadow-sm active:scale-95"
          >
            <Zap size={13} />
            <span>Trigger Checkout</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={refreshData}
            title="Refresh State"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
          >
            <RefreshCw size={15} />
          </button>

          {/* Reset System Button */}
          <button
            onClick={resetSystem}
            title="Reset Database to Initial Seed State"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950/50 hover:text-rose-400 text-neutral-400 border border-neutral-700 transition-colors"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-neutral-800/80">
        <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner font-bold border border-white/10'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-[#ff385c]' : 'text-neutral-500'} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-[#ff385c] text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
