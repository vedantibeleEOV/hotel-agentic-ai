import React from 'react';

function formatClockTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getDotColor(item) {
  const role = String(item.actor_role || '').toUpperCase();
  const action = String(item.action || '').toUpperCase();
  const title = String(item.title || '').toLowerCase();

  if (action.includes('SLA') || action.includes('CRITICAL') || title.includes('breached')) {
    return '#c13515'; // Red
  }
  if (
    role.includes('MANAGER') ||
    role.includes('SUPERVISOR') ||
    action.includes('OVERRIDE') ||
    action.includes('HUMAN') ||
    action.includes('REASSIGN')
  ) {
    return '#a8430a'; // Orange-brown for human overrides
  }
  if (
    role.includes('AGENT') ||
    role === 'AI' ||
    item.actor_name?.toLowerCase().includes('agent')
  ) {
    return '#222222'; // Dark for AI agent events
  }
  if (role.includes('PMS') || role.includes('SYSTEM') || item.actor_name === 'PMS') {
    return '#929292'; // Grey for PMS / System events
  }
  if (role.includes('STAFF') || role.includes('HOUSEKEEPING') || role.includes('MAINTENANCE')) {
    return '#2657a0'; // Blue for staff actions
  }
  return '#222222';
}

export default function ActivityTimeline({ activity = [] }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <span className="task-drawer-section-title">Activity</span>
        <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-[#717171]">
          No activity recorded yet for this task.
        </div>
      </div>
    );
  }

  // Ensure newest events first
  const sorted = [...activity].sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="task-drawer-section-title">Activity</span>
      <div className="task-timeline">
        {sorted.map((ev, idx) => {
          const timeStr = formatClockTime(ev.timestamp);
          const dotColor = getDotColor(ev);
          const formatRole = (role) => {
            if (!role) return '';
            const r = String(role).toUpperCase();
            if (r === 'MANAGER') return 'Manager';
            if (r === 'SUPERVISOR') return 'Supervisor';
            if (r === 'HOUSEKEEPING') return 'Housekeeping';
            if (r === 'MAINTENANCE') return 'Maintenance';
            if (r === 'AI AGENT' || r === 'AI') return 'AI Agent';
            if (r === 'SYSTEM') return 'System';
            return role;
          };
          const formattedRole = formatRole(ev.actor_role);
          const actorInfo = ev.actor_name
            ? `${ev.actor_name}${formattedRole ? ` (${formattedRole})` : ''}`
            : 'System';
          const outcomeText = ev.outcome ? ` · ${ev.outcome}` : '';

          return (
            <div key={ev.id || `${ev.timestamp}-${idx}`} className="task-timeline-item">
              {/* Timestamp */}
              <div className="task-timeline-time">{timeStr}</div>

              {/* Dot */}
              <div
                className="task-timeline-dot"
                style={{ backgroundColor: dotColor }}
              />

              {/* Details */}
              <div className="task-timeline-content">
                <div className="task-timeline-title">
                  {ev.title || ev.action || 'Activity event'}
                </div>
                <div className="task-timeline-sub">
                  {actorInfo}
                  {outcomeText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
