import React from 'react';
import { Search, Star, Clock, Wrench, ChevronDown } from 'lucide-react';

export default function RoomFilters({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters,
  floors = ['1', '2', '3', '4', '5'],
  byFloorStatus = {},
}) {
  const ROOM_TYPES = ['All', 'Deluxe King', 'Standard King', 'Suite', 'Executive'];
  const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
  const floorOptions = ['All', ...floors];

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {/* Search Input Box */}
      <div className="relative flex items-center min-w-[200px] flex-1 sm:flex-initial">
        <Search size={14} className="absolute left-3 text-[#6a6a6a] pointer-events-none" />
        <input
          type="text"
          placeholder="Room or guest"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full bg-white border border-[#dddddd] rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-[#222222] placeholder-[#929292] outline-none focus:border-[#222222] transition-all"
        />
      </div>

      {/* Floor Segmented Buttons with Attention Badges */}
      <div className="inline-flex bg-[#f2f2f2] p-1 rounded-lg gap-1">
        {floorOptions.map((f) => {
          const isSelected = String(filters.floor) === String(f);
          let attentionCount = 0;
          if (f !== 'All' && byFloorStatus && byFloorStatus[f]) {
            const flData = byFloorStatus[f];
            attentionCount =
              (flData.DIRTY || 0) +
              (flData.CLEANING || 0) +
              (flData.MAINTENANCE || 0) +
              (flData.INSPECTION || 0);
          }

          return (
            <button
              key={f}
              onClick={() => onFilterChange('floor', f)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-[#222222] shadow-2xs font-bold'
                  : 'text-[#6a6a6a] hover:text-[#222222]'
              }`}
            >
              <span>{f === 'All' ? 'All floors' : `F${f}`}</span>
              {attentionCount > 0 && (
                <span
                  title={`${attentionCount} room${attentionCount > 1 ? 's' : ''} needing attention (turnover / maintenance)`}
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight ${
                    isSelected
                      ? 'bg-[#874e00] text-white'
                      : 'bg-[#fcefd6] text-[#874e00]'
                  }`}
                >
                  {attentionCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Room Type Dropdown */}
      <div className="relative inline-flex items-center">
        <select
          value={filters.roomType}
          onChange={(e) => onFilterChange('roomType', e.target.value)}
          className="appearance-none bg-white border border-[#dddddd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#222222] outline-none cursor-pointer hover:border-[#222222] transition-all"
        >
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All room types' : t}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 text-[#6a6a6a] pointer-events-none" />
      </div>

      {/* Priority Dropdown */}
      <div className="relative inline-flex items-center">
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
          className="appearance-none bg-white border border-[#dddddd] rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-[#222222] outline-none cursor-pointer hover:border-[#222222] transition-all"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'Any priority' : `${p} Priority`}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-2.5 text-[#6a6a6a] pointer-events-none" />
      </div>

      {/* VIP Toggle Chip */}
      <button
        onClick={() => onFilterChange('vip', !filters.vip)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          filters.vip
            ? 'bg-[#222222] text-white border-[#222222]'
            : 'bg-white text-[#3f3f3f] border-[#dddddd] hover:border-[#222222]'
        }`}
      >
        <Star size={13} className={filters.vip ? 'fill-white' : ''} />
        <span>VIP</span>
      </button>

      {/* Arriving < 2h Toggle Chip */}
      <button
        onClick={() => onFilterChange('arrivingSoon', !filters.arrivingSoon)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          filters.arrivingSoon
            ? 'bg-[#222222] text-white border-[#222222]'
            : 'bg-white text-[#3f3f3f] border-[#dddddd] hover:border-[#222222]'
        }`}
      >
        <Clock size={13} />
        <span>Arriving &lt; 2h</span>
      </button>

      {/* Maintenance Open Toggle Chip */}
      <button
        onClick={() => onFilterChange('maintOpen', !filters.maintOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
          filters.maintOpen
            ? 'bg-[#222222] text-white border-[#222222]'
            : 'bg-white text-[#3f3f3f] border-[#dddddd] hover:border-[#222222]'
        }`}
      >
        <Wrench size={13} />
        <span>Maintenance open</span>
      </button>

      {/* Clear Filters Link */}
      {hasActiveFilters && (
        <button
          onClick={onResetFilters}
          className="text-xs font-medium text-[#222222] underline hover:text-[#ff385c] ml-1 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
