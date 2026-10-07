import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';

/**
 * Staff Detail Drawer
 * Matches exact prototype layout and interaction.
 */
export default function StaffDrawer({ staff, onClose }) {
  if (!staff) return null;

  const initials = staff.name
    ? staff.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'ST';

  const isBusy = staff.availability === 'Busy';
  const isAvailable = staff.availability === 'Available';
  const isOffline = staff.availability === 'Offline';
  const isOnLeave = staff.availability === 'On Leave';

  const workloadPct = Math.min(100, (staff.workload || 0) * 25);
  const workloadColor = (staff.workload || 0) >= 4 ? '#d9772b' : '#222222';

  return (
    <div className="staff-drawer-scrim" onClick={onClose}>
      <div
        className="staff-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="staff-drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="staff-avatar lg">{initials}</div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#222222' }}>
                {staff.name}
              </h2>
              <div style={{ fontSize: 13, color: '#6a6a6a', marginTop: 2 }}>
                {staff.roleLabel} · {staff.category}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="staff-drawer-close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="staff-drawer-body">
          {/* Availability Status Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 14, color: '#222222' }}>Availability</b>
            <div className="staff-seg">
              {['Available', 'Busy', 'Offline', 'On Leave'].map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`staff-seg-btn ${staff.availability === a ? 'on' : ''}`}
                  disabled
                >
                  {a}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#6a6a6a', lineHeight: 1.4 }}>
              {isOffline || isOnLeave
                ? 'Agents skip this person when assigning work.'
                : 'Agents can assign work to this person. Busy staff are only used when nobody else is free.'}
            </span>
          </div>

          {/* Details Grid */}
          <div className="staff-dl">
            <div className="staff-dl-label">Location</div>
            <div className="staff-dl-val">{staff.location || '—'}</div>

            <div className="staff-dl-label">Skills</div>
            <div>
              {staff.skills && staff.skills.length > 0 ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {staff.skills.map((k) => (
                    <span key={k} className="staff-skill-pill">
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#6a6a6a' }}>General</span>
              )}
            </div>

            <div className="staff-dl-label">Completed today</div>
            <div className="staff-dl-val">{staff.completedToday ?? 0}</div>

            <div className="staff-dl-label">Current workload</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="staff-workload-track" style={{ width: 120 }}>
                <div
                  className="staff-workload-fill"
                  style={{
                    width: `${workloadPct}%`,
                    background: workloadColor,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#222222' }}>
                {staff.activeCount || 0} active
              </span>
            </div>
          </div>

          {/* Current Tasks List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <b style={{ fontSize: 14, color: '#222222' }}>Current task</b>
            {staff.currentTask ? (
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #ebebeb',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
                    Room {staff.currentTask.room} · {staff.currentTask.type}
                  </div>
                  <div style={{ fontSize: 12, color: '#6a6a6a', marginTop: 2 }}>
                    Status: {staff.currentTask.status}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px dashed #dcdcdc',
                  borderRadius: 10,
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: 13,
                  color: '#6a6a6a',
                }}
              >
                <CheckCircle2 size={24} style={{ margin: '0 auto 6px auto', color: '#16a34a' }} />
                <b>No active tasks</b>
                <div style={{ fontSize: 12, marginTop: 2 }}>
                  {isAvailable ? 'Ready for the next assignment.' : 'Off duty or offline.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
