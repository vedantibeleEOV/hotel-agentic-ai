import React from 'react';
import { User, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Technician Card on Maintenance Detail Page
 * Shows assigned technician details, skill match, reason text, current assignment,
 * or unassigned warning, along with the Reassign link/button.
 */
export default function TechnicianCard({ technician, onReassignClick, canReassign = false }) {
  const isAssigned = technician && technician.name && technician.name !== 'Unassigned';

  const skillsText = isAssigned
    ? Array.isArray(technician.skills)
      ? technician.skills.join(', ')
      : technician.skills || 'General'
    : '';

  const avail = (technician?.availability || technician?.status || 'AVAILABLE').toUpperCase();
  const dispatchReason =
    technician?.assignment_reason ||
    technician?.technician_reason ||
    (technician?.availability_note && technician.availability_note !== 'Free for next issue'
      ? technician.availability_note
      : null);

  return (
    <div className="maint-panel">
      <div className="maint-panel-head">
        <div>
          <h3 className="maint-panel-title">Assigned Technician</h3>
          <div className="maint-panel-sub">
            {isAssigned ? 'Direct automated dispatch' : 'Action required'}
          </div>
        </div>

        {canReassign && onReassignClick && (
          <button
            type="button"
            className="maint-btn sm tertiary"
            onClick={onReassignClick}
            style={{ textDecoration: 'underline', color: 'var(--maint-ink)' }}
          >
            <RefreshCw size={12} />
            <span>Reassign</span>
          </button>
        )}
      </div>

      {isAssigned ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className={`maint-dot ${avail === 'BUSY' ? 'busy' : 'avail'}`}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--maint-ink)' }}>
                {technician.name}
              </span>
              <span style={{ fontSize: 12, color: 'var(--maint-muted)' }}>
                Skills: {skillsText} {technician.floor ? `· Floor ${technician.floor}` : ''}
              </span>
            </div>
          </div>

          {dispatchReason && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--maint-body)',
                background: '#f8f8f8',
                padding: '10px 12px',
                borderRadius: 8,
                lineHeight: 1.4,
              }}
            >
              <b>Dispatch Reason:</b> {dispatchReason}
            </div>
          )}

          {technician.current_task && (
            <div style={{ fontSize: 12, color: 'var(--maint-muted)' }}>
              Current task:{' '}
              {typeof technician.current_task === 'string'
                ? technician.current_task
                : technician.current_task.description}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            padding: '12px 14px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            color: '#78350f',
            fontSize: 13,
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#874e00' }} />
          <div>
            <b>No technician currently assigned.</b>
            <div>
              {technician?.unassigned_reason ||
                'No available technician on shift matches required skills. Reassign manually or wait for shift change.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
