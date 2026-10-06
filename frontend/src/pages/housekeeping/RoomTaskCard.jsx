import React, { useState, useEffect } from 'react';
import { Star, Lock, Sparkles, User } from 'lucide-react';

/**
 * Format UTC ISO string into browser's local time (HH:MM)
 */
function formatLocalTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

/**
 * Calculate dynamic elapsed string (e.g. "12m" or "1h 15m")
 */
function getElapsedText(startedAt, fallbackMinutes, now) {
  if (!startedAt) {
    return fallbackMinutes ? `${fallbackMinutes}m` : '0m';
  }
  const started = new Date(startedAt).getTime();
  if (isNaN(started)) return `${fallbackMinutes || 0}m`;
  const diffMs = Math.max(0, now - started);
  const totalMins = Math.floor(diffMs / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

/**
 * Priority Pill matching the prototype
 */
function PriorityBadge({ level, label }) {
  const norm = (label || level || 'Low').toLowerCase();
  let toneClass = 'prio-low';
  if (norm.includes('crit') || norm === 'urgent') toneClass = 'prio-critical';
  else if (norm.includes('high')) toneClass = 'prio-high';
  else if (norm.includes('med') || norm === 'standard') toneClass = 'prio-medium';

  return <span className={`hk-prio-pill ${toneClass}`}>{label || level || 'Low'}</span>;
}

/**
 * Animated Progress Bar for In-Progress Cleaning Tasks
 */
function CleaningProgressBar({ startedAt, expectedMinutes, now }) {
  if (!startedAt || !expectedMinutes) return null;
  const startedTime = new Date(startedAt).getTime();
  if (isNaN(startedTime)) return null;

  const totalDurationMs = expectedMinutes * 60 * 1000;
  const elapsedMs = Math.max(0, now - startedTime);
  const fraction = Math.min(1.5, elapsedMs / totalDurationMs);
  const widthPct = Math.min(100, Math.round(fraction * 100));

  let barColor = '#2657a0'; // Blue resting
  if (fraction > 1.0) {
    barColor = '#c13515'; // Red breached
  } else if (fraction > 0.8) {
    barColor = '#d9772b'; // Amber at-risk
  }

  return (
    <div className="hk-bar" title={`${widthPct}% elapsed`}>
      <i style={{ width: `${widthPct}%`, background: barColor }} />
    </div>
  );
}

/**
 * Housekeeping Room Task Card matching the prototype HKCard
 */
export default function RoomTaskCard({ card, onCardClick }) {
  const [now, setNow] = useState(Date.now());

  // Update clock every 30 seconds for live progress bars & elapsed times
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isOverdue = Boolean(card.is_overdue);
  const isStarted = Boolean(card.started_at && card.status !== 'COMPLETED');
  const isCompleted = card.status === 'COMPLETED';
  const isBlocked = card.status === 'ON_HOLD' || Boolean(card.blocked_reason);

  const roomTypeDisplay = card.room_type
    ? card.room_type.charAt(0).toUpperCase() + card.room_type.slice(1).toLowerCase()
    : 'Standard';

  const nextGuestTime = card.next_guest?.arrival_time
    ? formatLocalTime(card.next_guest.arrival_time)
    : null;

  const startedTimeStr = formatLocalTime(card.started_at);
  const dueTimeStr = formatLocalTime(card.due_at);
  const completedTimeStr = formatLocalTime(card.completed_at || card.created_at);

  const staffName = card.assigned_staff?.name || null;
  const staffInitial = staffName ? staffName.charAt(0).toUpperCase() : null;

  const elapsedText = getElapsedText(card.started_at, card.elapsed_minutes, now);

  return (
    <button
      type="button"
      className={`hk-card ${isOverdue ? 'over' : ''}`}
      onClick={() => onCardClick?.(card)}
    >
      {/* Header: Room Number + VIP Star + Priority */}
      <div className="hk-card-row" style={{ justifyContent: 'space-between' }}>
        <div className="hk-card-room-badge">
          <span className="hk-card-room-num">{card.room_number}</span>
          {card.is_vip && (
            <Star size={14} className="hk-star-icon" fill="#eab308" color="#ca8a04" strokeWidth={1.5} />
          )}
        </div>
        <PriorityBadge level={card.priority_level} label={card.priority_label} />
      </div>

      {/* Subtitle: Room Type & Next Guest */}
      <div className="hk-card-sub">
        <span>{roomTypeDisplay}</span>
        {nextGuestTime && card.status !== 'COMPLETED' && (
          <span className="hk-card-guest-pill"> · next guest {nextGuestTime}</span>
        )}
      </div>

      {/* Assigned Staff Row */}
      <div className="hk-card-staff-row">
        {staffName ? (
          <div className="hk-card-person">
            <span className="hk-avatar-circle">{staffInitial}</span>
            <span className="hk-person-name">{staffName}</span>
          </div>
        ) : (
          <div className="hk-card-unassigned">
            <User size={13} className="text-gray-400" />
            <span>Unassigned</span>
          </div>
        )}
      </div>

      {/* In-Progress Started & Due Timers + Progress Bar */}
      {isStarted && (
        <div className="hk-card-progress-section">
          <div className="hk-card-row hk-card-time-row">
            <span>Started {startedTimeStr || '—'}</span>
            <span>Due {dueTimeStr || '—'}</span>
          </div>
          <CleaningProgressBar
            startedAt={card.started_at}
            expectedMinutes={card.expected_minutes || 30}
            now={now}
          />
        </div>
      )}

      {/* Completed Timestamp */}
      {isCompleted && (
        <div className="hk-card-completed-sub">
          Completed {completedTimeStr || 'Today'} · took {card.expected_minutes || 30}m
        </div>
      )}

      {/* Blocked Alert Banner */}
      {isBlocked && (
        <div className="hk-card-blocked-row">
          <Lock size={12} strokeWidth={2.4} />
          <span>{card.blocked_reason || 'Needs a person'}</span>
        </div>
      )}

      {/* Bottom Footer: AI Tag + Elapsed or Job SLA */}
      <div className="hk-card-row hk-card-footer" style={{ justifyContent: 'space-between' }}>
        <span className="hk-ai-badge">
          <Sparkles size={11} className="text-amber-600" />
          <span>AI</span>
        </span>

        {isStarted ? (
          <span className="hk-card-elapsed-text">
            Elapsed <b>{elapsedText}</b>
          </span>
        ) : (
          <span className="hk-card-duration-text">
            {card.expected_minutes ? `${card.expected_minutes} min job` : '30 min job'}
          </span>
        )}
      </div>
    </button>
  );
}
