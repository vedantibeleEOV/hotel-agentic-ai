import React from 'react';

/**
 * Segmented Tab Bar for Maintenance Issues Queue
 */
export default function MaintenanceTabs({ activeTab, onTabChange, tabCounts = {} }) {
  const tabs = [
    { id: 'Open', label: `Open · ${tabCounts.open ?? 0}` },
    { id: 'Critical', label: `Critical · ${tabCounts.critical ?? 0}` },
    { id: 'Unassigned', label: `Unassigned · ${tabCounts.unassigned ?? 0}` },
    { id: 'Completed', label: `Completed · ${tabCounts.completed ?? 0}` },
  ];

  return (
    <div className="maint-tabs-bar">
      <div className="maint-seg">
        {tabs.map((t) => {
          const isSelected = activeTab.toLowerCase() === t.id.toLowerCase();
          return (
            <button
              key={t.id}
              type="button"
              className={`maint-seg-btn ${isSelected ? 'on' : ''}`}
              onClick={() => onTabChange(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="maint-sort-sub">Sorted by severity, then SLA</div>
    </div>
  );
}
