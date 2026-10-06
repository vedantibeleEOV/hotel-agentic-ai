import React from 'react';

export const ROOM_STATUS_CONFIG = [
  { key: 'OCCUPIED', label: 'Occupied', fg: '#3f3f3f', bg: '#efefef' },
  { key: 'DIRTY', label: 'Dirty', fg: '#874e00', bg: '#fcefd6' },
  { key: 'CLEANING', label: 'Cleaning', fg: '#2657a0', bg: '#e7eefa' },
  { key: 'MAINTENANCE', label: 'Maintenance', fg: '#653886', bg: '#f1e9f7' },
  { key: 'INSPECTION', label: 'Inspection', fg: '#854d0e', bg: '#fef3c7' },
  { key: 'READY', label: 'Ready', fg: '#17693f', bg: '#e4f3ea' },
  { key: 'OUT_OF_ORDER', label: 'Out of order', fg: '#6a6a6a', bg: '#f5f5f5' },
];

export const ROOM_STATUS_COLORS = ROOM_STATUS_CONFIG.reduce((acc, item) => {
  acc[item.label] = { fg: item.fg, bg: item.bg };
  acc[item.key] = { fg: item.fg, bg: item.bg };
  return acc;
}, {});

export default function StatusChips({ selectedStatus, onSelectStatus, counts = {} }) {
  return (
    <div className="flex items-center gap-2 flex-wrap py-1">
      {ROOM_STATUS_CONFIG.map(({ key, label, fg, bg }) => {
        const isSelected = selectedStatus === label || selectedStatus === key;
        const count = counts[key] !== undefined ? counts[key] : (counts[label] !== undefined ? counts[label] : 0);

        return (
          <button
            key={key}
            onClick={() => onSelectStatus(isSelected ? 'All' : label)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              isSelected
                ? 'border-[#222222] bg-white text-[#222222] font-semibold ring-1 ring-[#222222] shadow-2xs'
                : 'border-[#dddddd] bg-white text-[#3f3f3f] hover:border-[#222222]'
            }`}
          >
            <span
              className="w-3 h-3 rounded-xs flex-shrink-0 border border-black/10"
              style={{
                background:
                  key === 'OUT_OF_ORDER'
                    ? 'repeating-linear-gradient(135deg, #f2f2f2 0 3px, #d8d8d8 3px 6px)'
                    : bg,
                borderColor: fg + '66',
              }}
            />
            <span>{label}</span>
            <b className="font-mono text-xs text-[#222222]">{count}</b>
          </button>
        );
      })}
    </div>
  );
}
