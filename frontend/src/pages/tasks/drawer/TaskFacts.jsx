import React, { useState, useEffect } from 'react';

function formatClockTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatRelativeTime(isoString, nowMs) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const timeMs = d.getTime();
  if (isNaN(timeMs)) return '—';

  const diffSec = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) {
    const rem = diffMin % 60;
    return rem > 0 ? `${diffHours}h ${rem}m ago` : `${diffHours}h ago`;
  }
  return `${diffMin} min ago`;
}

function formatExpectedEndTime(startedIso, minutes) {
  if (!startedIso || !minutes) return null;
  const d = new Date(startedIso);
  if (isNaN(d.getTime())) return null;
  d.setMinutes(d.getMinutes() + minutes);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function calculateElapsedMinutes(startedIso, nowMs) {
  if (!startedIso) return null;
  const startMs = new Date(startedIso).getTime();
  if (isNaN(startMs)) return null;
  return Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60)));
}

/**
 * Task facts definition list (Created, Started, Expected, Elapsed, Next guest, Category)
 */
export default function TaskFacts({ detail }) {
  const [now, setNow] = useState(Date.now());

  // Live timer tick every 30 seconds for live elapsed calculation
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  if (!detail) return null;

  const isMaintenance = detail.task_type === 'MAINTENANCE_REPAIR' || detail.type_label?.toLowerCase().includes('maintenance');
  const createdClock = formatClockTime(detail.created_at) || '—';
  const createdRel = formatRelativeTime(detail.created_at, now);

  const startedClock = detail.started_at ? formatClockTime(detail.started_at) : 'Not started';
  const expectedText = detail.started_at
    ? formatExpectedEndTime(detail.started_at, detail.expected_minutes || 30)
    : `${detail.expected_minutes || 30} min once started`;

  const elapsedMin = detail.started_at ? calculateElapsedMinutes(detail.started_at, now) : null;
  const elapsedText = elapsedMin !== null ? `${elapsedMin} min` : '—';

  // Next guest formatting
  let nextGuestText = '—';
  if (detail.next_guest) {
    const vip = detail.next_guest.is_vip ? ' (VIP)' : '';
    const arrival = detail.next_guest.arrival_time ? ` · ${detail.next_guest.arrival_time}` : '';
    nextGuestText = `${detail.next_guest.name}${vip}${arrival}`;
  }

  const reporterName = detail.incident?.reported_by_staff_name || 'Staff';
  const reportTime = formatClockTime(detail.created_at);

  return (
    <div className="flex flex-col gap-4">
      {/* Maintenance Description Quote Box */}
      {isMaintenance && detail.description && (
        <div className="task-drawer-quote">
          “{detail.description}”
          <div className="task-drawer-quote-sub">
            Reported by {reporterName} {reportTime ? `· ${reportTime}` : ''}
          </div>
        </div>
      )}

      {/* 2-Column Facts Grid */}
      <div className="task-drawer-facts-grid">
        <div className="task-fact-label">Created</div>
        <div className="task-fact-value task-fact-num">
          {createdClock} · {createdRel}
        </div>

        <div className="task-fact-label">Started</div>
        <div className="task-fact-value task-fact-num">{startedClock}</div>

        {!isMaintenance && (
          <>
            <div className="task-fact-label">Expected</div>
            <div className="task-fact-value task-fact-num">{expectedText}</div>

            <div className="task-fact-label">Elapsed</div>
            <div className="task-fact-value task-fact-num">{elapsedText}</div>
          </>
        )}

        <div className="task-fact-label">Next guest</div>
        <div className="task-fact-value">{nextGuestText}</div>

        {isMaintenance && detail.incident?.category && (
          <>
            <div className="task-fact-label">Category</div>
            <div className="task-fact-value">{detail.incident.category}</div>
          </>
        )}
      </div>
    </div>
  );
}
