import React from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  LayoutDashboard,
  BedDouble,
  ListTodo,
  Sparkles,
  Wrench,
  Cpu,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  Workflow,
} from 'lucide-react';

export default function Sidebar() {
  const { activeTab, setActiveTab, metrics } = useHotel();

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'rooms', label: 'Rooms', icon: BedDouble },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'housekeeping', label: 'Housekeeping', icon: Sparkles },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'traces', label: 'AI Operations', icon: Cpu, dot: true },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, badge: metrics.criticalCount || 9 },
    { id: 'activity', label: 'Activity Log', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-white border-r border-[#dddddd] h-screen sticky top-0 flex flex-col justify-between p-4 flex-shrink-0 z-30 select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="w-8 h-8 rounded-xl bg-[#222222] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <Workflow size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base text-[#222222] tracking-tight leading-none">Voyage Ops</h1>
            <p className="text-xs text-[#6a6a6a] mt-0.5 font-medium truncate">Autonomous operations</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || (item.id === 'issues' && activeTab === 'maintenance') || (item.id === 'activity' && activeTab === 'traces');
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'issues') setActiveTab('maintenance');
                  else if (item.id === 'activity') setActiveTab('traces');
                  else setActiveTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#222222] text-white shadow-xs'
                    : 'text-[#3f3f3f] hover:bg-[#f2f2f2] hover:text-[#222222]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className={isActive ? 'text-white' : 'text-[#6a6a6a]'}
                  />
                  <span className={isActive ? 'text-white font-semibold' : 'text-[#3f3f3f]'}>
                    {item.label}
                  </span>
                </div>

                {/* Optional Status Indicators */}
                {item.dot && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}

                {item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-full bg-[#ff385c] text-white leading-none">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Autonomy Metric */}
      <div className="border-t border-[#ebebeb] pt-4 px-1">
        <p className="text-xs text-[#6a6a6a] font-medium">Autonomy today</p>
        <h3 className="text-2xl font-black text-[#222222] tracking-tight mt-0.5">96%</h3>
        <p className="text-[11px] text-[#6a6a6a] mt-0.5 font-normal leading-tight">
          of tasks handled without a person
        </p>
      </div>
    </aside>
  );
}
