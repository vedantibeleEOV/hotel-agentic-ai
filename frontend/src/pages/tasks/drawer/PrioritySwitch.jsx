import React from 'react';

/**
 * Priority / Severity segmented switch control.
 * High, Medium, Low map to HIGH, MEDIUM, LOW in backend API.
 */
export default function PrioritySwitch({ detail, onChangePriority, actionRunning }) {
  if (!detail) return null;

  const isMaintenance =
    detail.task_type === 'MAINTENANCE_REPAIR' || detail.type_label?.toLowerCase().includes('maintenance');
  const sectionLabel = isMaintenance ? 'Severity' : 'Priority';

  const currentLevel = String(detail.priority_level || '').toUpperCase();
  const currentLabel = detail.priority_label || (currentLevel === 'URGENT' ? 'Critical' : currentLevel === 'HIGH' ? 'High' : currentLevel === 'STANDARD' ? 'Medium' : 'Low');

  // Options
  const options = isMaintenance
    ? [
        { label: 'Critical', value: 'HIGH' }, // or keep high for maintenance overrides
        { label: 'High', value: 'HIGH' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Low', value: 'LOW' },
      ]
    : [
        { label: 'High', value: 'HIGH' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Low', value: 'LOW' },
      ];

  const canChangePriority =
    Array.isArray(detail.allowed_actions) && detail.allowed_actions.includes('priority');
  const isDisabled = !canChangePriority || actionRunning === 'priority';

  const handleSelect = (val) => {
    if (isDisabled) return;
    if (onChangePriority) {
      onChangePriority(val);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="task-drawer-section-title">{sectionLabel}</span>
      <div className="task-segmented-control">
        {options.map((opt) => {
          const isSelected =
            (opt.value === 'HIGH' && (currentLevel === 'HIGH' || currentLevel === 'URGENT')) ||
            (opt.value === 'MEDIUM' && (currentLevel === 'MEDIUM' || currentLevel === 'STANDARD')) ||
            (opt.value === 'LOW' && (currentLevel === 'LOW' || currentLevel === 'NORMAL'));

          return (
            <button
              key={opt.label}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelect(opt.value)}
              className={`task-segmented-btn ${isSelected ? 'active' : ''}`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <span className="task-audit-note">
        Changes are recorded in the audit log as a human override.
      </span>
    </div>
  );
}
