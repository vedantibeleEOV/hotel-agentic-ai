import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Priority pill matching the prototype visual styling:
 * Critical (with alert triangle icon), High, Medium, Low.
 */
export default function PriorityPill({ priority }) {
  if (!priority) return null;

  const raw = String(priority).trim().toLowerCase();

  if (raw === 'critical' || raw === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#fff0f2] text-[#ff385c] border border-[#ffccd3]">
        <AlertTriangle size={11} strokeWidth={2.5} className="flex-shrink-0" />
        Critical
      </span>
    );
  }

  if (raw === 'high') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#fff4e5] text-[#b35300] border border-[#ffe1b8]">
        High
      </span>
    );
  }

  if (raw === 'medium' || raw === 'standard') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f0f4f8] text-[#334e68] border border-[#d9e2ec]">
        Medium
      </span>
    );
  }

  // Low / Normal
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f5f5f5] text-[#6a6a6a] border border-[#e5e5e5]">
      Low
    </span>
  );
}
