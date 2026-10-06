import React, { useState, useEffect } from 'react';

/**
 * Calculates and formats SLA status:
 * - Red "Breached +H:MM:SS" pill if deadline has passed and task is incomplete
 * - "MM:SS left" or "Xm left" if within deadline
 * - "—" if sla_deadline is null (e.g. cleaning tasks)
 * - Updates every 30 seconds automatically
 */
export default function SlaBadge({ slaDeadline, status }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!slaDeadline) {
    return <span className="text-[#888888] font-normal text-xs">—</span>;
  }

  const deadlineMs = new Date(slaDeadline).getTime();
  if (isNaN(deadlineMs)) {
    return <span className="text-[#888888] font-normal text-xs">—</span>;
  }

  const diffMs = deadlineMs - now;
  const isCompleted = status === 'COMPLETED' || status === 'DONE';

  if (isCompleted) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
        Met SLA
      </span>
    );
  }

  // Breached
  if (diffMs <= 0) {
    const elapsedSec = Math.floor(Math.abs(diffMs) / 1000);
    const hours = Math.floor(elapsedSec / 3600);
    const minutes = Math.floor((elapsedSec % 3600) / 60);
    const seconds = elapsedSec % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = `+${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
      timeStr = `+${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#fff0f2] text-[#ff385c] border border-[#ffccd3] whitespace-nowrap">
        Breached {timeStr}
      </span>
    );
  }

  // Active Countdown
  const remainingSec = Math.floor(diffMs / 1000);
  const remHours = Math.floor(remainingSec / 3600);
  const remMinutes = Math.floor((remainingSec % 3600) / 60);

  let badgeText = '';
  if (remHours > 0) {
    badgeText = `${remHours}h ${remMinutes}m left`;
  } else {
    badgeText = `${remMinutes}m left`;
  }

  const isUrgent = diffMs < 15 * 60 * 1000;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${
        isUrgent
          ? 'bg-[#fff4e5] text-[#b35300] border-[#ffe1b8]'
          : 'bg-[#f5f5f5] text-[#484848] border-[#dddddd]'
      }`}
    >
      {badgeText}
    </span>
  );
}
