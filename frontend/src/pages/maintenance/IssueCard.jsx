import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import CountdownPill from './CountdownPill';

/**
 * Maintenance Issue Card for the Queue list
 * Matches exact markup, typography, and badges from Voyage Ops Prototype
 */
export default function IssueCard({ issue, onSelect }) {
  if (!issue) return null;

  const isCritical =
    issue.severity === 'CRITICAL' ||
    issue._is_critical ||
    issue.is_critical ||
    issue.safety_critical ||
    issue.severity_label?.toLowerCase() === 'critical' ||
    issue.alert?.type === 'critical_safety';

  const incidentId = issue.incident_id || issue.id;
  const roomNum = issue.room?.number || issue.room_number || issue.room_id || '—';
  const displayId = issue.display_id || issue.id || '';
  const desc = issue.description || issue.reported_problem || 'No description provided';
  const category = issue.category_label || issue.category || 'General';
  const severity = issue.severity_label || issue.severity || 'Medium';
  const status = issue.status_label || issue.status || 'Reported';
  const rawStatus = issue.status || '';
  const technician = issue.assigned_technician || issue.technician || null;
  const isUnassigned = !technician || !technician.name;
  const slaMins = issue.sla_minutes || 60;

  const targetResolution = issue.sla_deadline || issue.target_resolution_at;

  // Severity pill style
  const sevUpper = (issue.severity || issue.severity_label || '').toUpperCase();
  let sevClass = 'muted';
  if (sevUpper === 'CRITICAL') sevClass = 'crit';
  else if (sevUpper === 'HIGH') sevClass = 'warn';

  // Format initials
  const techInitials = technician?.name
    ? technician.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'TC';

  // Format created_at relative/time
  let timeStr = '';
  if (issue.created_at) {
    try {
      const dt = new Date(issue.created_at);
      timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      timeStr = issue.created_at;
    }
  }

  return (
    <button
      type="button"
      className={`maint-icard ${isCritical ? 'crit' : ''}`}
      onClick={() => onSelect && onSelect(incidentId)}
    >
      {/* Red Banner at top for Critical issues */}
      {isCritical && (
        <div className="maint-icard-bar">
          <AlertTriangle size={14} />
          <span>Critical safety issue · emergency response active</span>
        </div>
      )}

      <div className="maint-icard-body">
        {/* Header row: Room number, Display ID, and Countdown pill */}
        <div className="maint-icard-head-row">
          <div className="maint-icard-room-info">
            <span className="maint-icard-room-num">Room {roomNum}</span>
            {displayId && <span className="maint-icard-disp-id">{displayId}</span>}
          </div>
          {targetResolution && rawStatus !== 'COMPLETED' && rawStatus !== 'RESOLVED' ? (
            <CountdownPill
              targetIso={targetResolution}
              initialRemainingSeconds={issue.remaining_seconds}
            />
          ) : (
            <span className="maint-pill muted">{status}</span>
          )}
        </div>

        {/* Reported problem description */}
        <div className="maint-desc" style={{ fontStyle: 'italic' }}>
          “{desc}”
        </div>

        {/* Chips row */}
        <div className="maint-chips-row">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--maint-muted)',
            }}
          >
            <Zap size={12} style={{ color: 'var(--maint-muted)' }} /> AI
          </span>
          <span className="maint-pill muted">{category}</span>
          <span className={`maint-pill ${sevClass}`}>{severity}</span>
          <span style={{ fontSize: 12, color: 'var(--maint-muted)' }}>SLA {slaMins} min</span>
        </div>

        {/* Footer row: Technician assignment and metadata */}
        <div className="maint-icard-footer">
          {isUnassigned ? (
            <span className="maint-no-tech">
              <AlertTriangle size={15} />
              <span>No technician available</span>
            </span>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div className="maint-avatar sm">{techInitials}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--maint-ink)' }}>
                {technician.name}
              </span>
            </div>
          )}

          <div className="maint-card-meta-right">
            {timeStr && <span style={{ fontSize: 12, color: 'var(--maint-muted)' }}>{timeStr}</span>}
            {rawStatus && rawStatus !== 'COMPLETED' && (
              <span className="maint-pill muted" style={{ height: 20, fontSize: 11, padding: '0 6px' }}>
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
