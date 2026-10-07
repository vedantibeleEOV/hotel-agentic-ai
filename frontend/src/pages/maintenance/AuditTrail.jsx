import React from 'react';
import { History } from 'lucide-react';

/**
 * Audit Trail Component for Maintenance Detail Page
 */
export default function AuditTrail({ auditTrail = [] }) {
  if (!auditTrail || auditTrail.length === 0) {
    return (
      <div className="maint-panel">
        <div className="maint-panel-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} />
            <h3 className="maint-panel-title">Audit Trail & Incident History</h3>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--maint-muted)' }}>No audit events recorded.</div>
      </div>
    );
  }

  return (
    <div className="maint-panel">
      <div className="maint-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <History size={16} />
          <h3 className="maint-panel-title">Audit Trail & Incident History</h3>
        </div>
      </div>

      <div className="maint-timeline">
        {auditTrail.map((item, idx) => {
          const actionText = item.title || item.action || item.event || 'Activity logged';
          let timeText = item.time || item.created_at_time || '';
          if (!timeText && item.timestamp) {
            try {
              const dt = new Date(item.timestamp);
              timeText = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
              timeText = item.timestamp;
            }
          }

          const actor = item.actor_name || item.actor || item.agent || item.staff_name || '';
          const outcome = item.outcome || item.details || item.notes || item.reason || '';

          const isCrit =
            actionText.toLowerCase().includes('critical') ||
            actionText.toLowerCase().includes('escalat') ||
            actionText.toLowerCase().includes('safety');
          const isOverride = actionText.toLowerCase().includes('override');

          let dotClass = '';
          if (isCrit) dotClass = 'crit';
          else if (isOverride) dotClass = 'override';

          return (
            <div key={item.id || idx} className="maint-tli">
              <span className={`maint-tld ${dotClass}`} />
              {timeText && <div className="maint-tlt">{timeText}</div>}
              <div className="maint-tl-action">
                {actionText} {actor && <span style={{ fontWeight: 400, color: 'var(--maint-muted)' }}>· {actor}</span>}
              </div>
              {outcome && <div className="maint-tl-outcome">{outcome}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
