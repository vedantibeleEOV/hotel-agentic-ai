import React from 'react';

/**
 * Technicians Panel (Right column on list view)
 * Matches exact prototype styling: avatars, skill dividers, availability badges
 */
export default function TechniciansPanel({ technicians = [] }) {
  return (
    <div className="maint-panel">
      <div className="maint-panel-head">
        <div>
          <h3 className="maint-panel-title">Technicians</h3>
          <div className="maint-panel-sub">Matched by skill and availability</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {technicians.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--maint-muted)', padding: '8px 0' }}>
            No technicians on shift
          </div>
        ) : (
          technicians.map((tech) => {
            const avail = (tech.availability || tech.status || 'AVAILABLE').toUpperCase();
            const isAvail = avail === 'AVAILABLE';
            const isBusy = avail === 'BUSY';
            const isLeave = avail === 'ON_LEAVE';
            const isOffline = avail === 'OFFLINE';

            let dotClass = 'off';
            let availLabel = 'Offline';
            if (isAvail) {
              dotClass = 'avail';
              availLabel = 'Available';
            } else if (isBusy) {
              dotClass = 'busy';
              availLabel = 'Busy';
            } else if (isLeave) {
              dotClass = 'leave';
              availLabel = 'On Leave';
            }

            const initials = tech.name
              ? tech.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'TC';

            const skillsText = Array.isArray(tech.skills)
              ? tech.skills.join(' · ')
              : tech.skills || 'General';

            const noteText =
              tech.availability_note ||
              (tech.current_task
                ? typeof tech.current_task === 'string'
                  ? tech.current_task
                  : `Repairing Room ${tech.current_task.room_number || '—'}`
                : isAvail
                ? 'Free for next issue'
                : 'Busy');

            return (
              <div
                key={tech.id || tech.name}
                className="maint-tech-row"
                style={{ padding: '12px 0', alignItems: 'flex-start' }}
              >
                <div className="maint-avatar">{initials}</div>
                <div className="maint-tech-info" style={{ gap: 4 }}>
                  <div className="maint-tech-name-row">
                    <span className="maint-tech-name" style={{ fontSize: 14, fontWeight: 700 }}>
                      {tech.name}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: isAvail ? '#166534' : isBusy ? '#1e40af' : '#6a6a6a',
                      }}
                    >
                      <span className={`maint-dot ${dotClass}`} />
                      {availLabel}
                    </span>
                  </div>
                  <div className="maint-tech-skills" style={{ fontSize: 13, color: 'var(--maint-muted)' }}>
                    {skillsText}
                  </div>
                  <div
                    className="maint-tech-curr-task"
                    style={{ fontSize: 13, color: isAvail && !tech.queued_count ? '#166534' : 'var(--maint-body)' }}
                  >
                    {noteText}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
