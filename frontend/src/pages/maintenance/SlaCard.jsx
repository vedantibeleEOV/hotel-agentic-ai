import React from 'react';
import { Clock } from 'lucide-react';
import CountdownPill from './CountdownPill';

/**
 * SLA Card on Maintenance Detail Page
 */
export default function SlaCard({ sla, isResolved = false }) {
  if (!sla) return null;

  const targetMinutes = sla.minutes_total || sla.target_minutes || sla.sla_minutes || '—';
  const targetIso = sla.deadline || sla.target_resolution_at || sla.target_time_iso;
  const remainingSecs = sla.remaining_seconds;
  const progressPercent = Math.min(100, Math.max(0, sla.progress_percent || 0));

  let targetTime = sla.target_time_formatted || sla.target_time || '';
  if (!targetTime && targetIso) {
    try {
      targetTime = new Date(targetIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      targetTime = targetIso;
    }
  }

  let barClass = 'ok';
  if (sla.is_breached || remainingSecs < 0) {
    barClass = 'breached';
  } else if (progressPercent > 70 || (remainingSecs && remainingSecs < 900)) {
    barClass = 'warn';
  }

  return (
    <div className="maint-panel">
      <div className="maint-panel-head">
        <div>
          <h3 className="maint-panel-title">Service Level Agreement</h3>
          <div className="maint-panel-sub">{targetMinutes} min target SLA</div>
        </div>
        {targetIso && !isResolved && (
          <CountdownPill
            targetIso={targetIso}
            initialRemainingSeconds={remainingSecs}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: 'var(--maint-muted)' }}>
            Target completion: <b style={{ color: 'var(--maint-ink)' }}>{targetTime || '—'}</b>
          </span>
          <span style={{ fontWeight: 600, color: 'var(--maint-body)' }}>
            {isResolved ? 'Resolved' : `${progressPercent}% elapsed`}
          </span>
        </div>

        <div className="maint-sla-bar-track">
          <div
            className={`maint-sla-bar-fill ${barClass}`}
            style={{ width: isResolved ? '100%' : `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
