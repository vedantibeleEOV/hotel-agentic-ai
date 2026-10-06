import React from 'react';

/**
 * Floor segmented tabs matching the prototype segment selector
 * Options: "All floors", "F1", "F2", "F3", "F4", "F5"
 */
export default function FloorTabs({ selectedFloor, onChange, floors = ['1', '2', '3', '4', '5'] }) {
  const options = [
    { value: 'All', label: 'All floors' },
    ...floors.map((f) => ({
      value: String(f),
      label: `F${f}`,
    })),
  ];

  return (
    <div className="hk-seg" role="tablist" aria-label="Filter by floor">
      {options.map((opt) => {
        const isSelected = String(selectedFloor) === String(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`hk-seg-btn ${isSelected ? 'on' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
