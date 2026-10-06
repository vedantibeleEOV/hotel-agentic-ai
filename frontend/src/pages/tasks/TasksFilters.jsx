import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, Sparkles } from 'lucide-react';

export default function TasksFilters({
  filters,
  onFilterChange,
  floors = [],
  staffList = [],
}) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange('search', searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput, onFilterChange]);

  const TYPE_TABS = [
    { id: 'all', label: 'All' },
    { id: 'cleaning', label: 'Cleaning' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'inspection', label: 'Inspection' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Top Filter Row: Search & Type Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Box */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
          <input
            type="text"
            placeholder="Task, room, staff"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-[13px] bg-white border border-[#dddddd] rounded-xl text-[#222222] placeholder-[#717171] focus:outline-none focus:border-[#222222] focus:ring-1 focus:ring-[#222222] transition-all shadow-2xs"
          />
        </div>

        {/* Type Segmented Control */}
        <div className="inline-flex bg-[#f2f2f2] p-1 rounded-xl gap-1 overflow-x-auto select-none">
          {TYPE_TABS.map((tab) => {
            const isActive = (filters.type || 'all') === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange('type', tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white text-[#222222] shadow-xs'
                    : 'text-[#717171] hover:text-[#222222]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Filter Row: Dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Dropdown */}
        <div className="relative">
          <select
            value={filters.status_group || 'open'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'open' || val === 'all' || val === 'completed') {
                onFilterChange('status_group', val);
                onFilterChange('status', 'All');
              } else {
                onFilterChange('status_group', 'all');
                onFilterChange('status', val);
              }
            }}
            className="appearance-none bg-white border border-[#dddddd] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-[#222222] hover:border-[#222222] cursor-pointer focus:outline-none shadow-2xs"
          >
            <option value="open">Open tasks</option>
            <option value="all">Any status</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In repair / Cleaning</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
        </div>

        {/* Priority Dropdown */}
        <div className="relative">
          <select
            value={filters.priority || 'All'}
            onChange={(e) => onFilterChange('priority', e.target.value)}
            className="appearance-none bg-white border border-[#dddddd] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-[#222222] hover:border-[#222222] cursor-pointer focus:outline-none shadow-2xs"
          >
            <option value="All">Any priority</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
        </div>

        {/* AI or manual Dropdown (Disabled with Tooltip) */}
        <div className="relative group">
          <select
            disabled
            className="appearance-none bg-[#f7f7f7] border border-[#e5e5e5] text-[#a0a0a0] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium cursor-not-allowed select-none"
            title="Coming soon"
          >
            <option>All assignments (AI)</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a0a0a0] pointer-events-none"
          />
          {/* Tooltip */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex items-center gap-1 px-2.5 py-1 bg-[#222222] text-white text-[11px] font-medium rounded-md whitespace-nowrap z-40 shadow-md">
            <Sparkles size={11} className="text-amber-400" />
            Coming soon
          </div>
        </div>

        {/* SLA Dropdown */}
        <div className="relative">
          <select
            value={filters.sla || 'All'}
            onChange={(e) => onFilterChange('sla', e.target.value)}
            className="appearance-none bg-white border border-[#dddddd] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-[#222222] hover:border-[#222222] cursor-pointer focus:outline-none shadow-2xs"
          >
            <option value="All">Any SLA</option>
            <option value="At risk">At risk (&lt; 30m)</option>
            <option value="Breached">Breached</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
        </div>

        {/* Floors Dropdown */}
        <div className="relative">
          <select
            value={filters.floor || 'All'}
            onChange={(e) => onFilterChange('floor', e.target.value)}
            className="appearance-none bg-white border border-[#dddddd] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-[#222222] hover:border-[#222222] cursor-pointer focus:outline-none shadow-2xs"
          >
            <option value="All">All floors</option>
            {floors.map((fl) => (
              <option key={fl} value={fl}>
                Floor {fl}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
        </div>

        {/* Staff Dropdown */}
        <div className="relative">
          <select
            value={filters.staff_id || 'All'}
            onChange={(e) => onFilterChange('staff_id', e.target.value)}
            className="appearance-none bg-white border border-[#dddddd] rounded-xl px-3 py-1.5 pr-8 text-xs font-medium text-[#222222] hover:border-[#222222] cursor-pointer focus:outline-none shadow-2xs"
          >
            <option value="All">Any staff</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717171] pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
