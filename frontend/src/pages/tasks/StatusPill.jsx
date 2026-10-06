import React from 'react';

/**
 * Status pill matching the prototype visual styling:
 * Assigned, In repair, Cleaning, On hold, Completed, Failed, etc.
 */
export default function StatusPill({ status }) {
  if (!status) return null;

  const raw = String(status).trim().toLowerCase().replace(/[\s_-]+/g, '_');

  let label = status;
  let styleClasses = 'bg-[#f5f5f5] text-[#6a6a6a] border-[#e5e5e5]';

  switch (raw) {
    case 'assigned':
      label = 'Assigned';
      styleClasses = 'bg-[#e6f6ff] text-[#006699] border-[#bae3ff]';
      break;
    case 'in_repair':
    case 'in_progress':
      label = 'In repair';
      styleClasses = 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]';
      break;
    case 'cleaning':
      label = 'Cleaning';
      styleClasses = 'bg-[#f4f3ff] text-[#5925dc] border-[#d9d6fe]';
      break;
    case 'on_hold':
    case 'pending':
      label = 'On hold';
      styleClasses = 'bg-[#fffbeb] text-[#b54708] border-[#fedf89]';
      break;
    case 'completed':
    case 'done':
      label = 'Completed';
      styleClasses = 'bg-[#ecfdf3] text-[#027a48] border-[#a6f4c5]';
      break;
    case 'failed':
    case 'error':
      label = 'Failed';
      styleClasses = 'bg-[#fff0f2] text-[#ff385c] border-[#ffccd3]';
      break;
    default:
      label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
      styleClasses = 'bg-[#f5f5f5] text-[#484848] border-[#dddddd]';
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styleClasses}`}>
      {label}
    </span>
  );
}
