import React from 'react';

/**
 * Attendants Sidebar Panel matching the prototype
 */
export default function AttendantsPanel({ attendants = [] }) {
  // Sort: available first, then busy, then off
  const sortedAttendants = [...attendants].sort((a, b) => {
    const order = { available: 0, busy: 1, off: 2 };
    const aVal = order[a.availability?.toLowerCase()] ?? 3;
    const bVal = order[b.availability?.toLowerCase()] ?? 3;
    return aVal - bVal;
  });

  return (
    <div className="hk-panel">
      <div className="hk-panel-head">
        <h3 className="hk-panel-title">Attendants</h3>
        <p className="hk-panel-sub">Used by the Housekeeping Agent</p>
      </div>

      <div className="hk-panel-body">
        {sortedAttendants.length > 0 ? (
          sortedAttendants.map((st) => {
            const initial = st.name ? st.name.charAt(0).toUpperCase() : 'S';
            const availKey = (st.availability || 'available').toLowerCase();

            let availLabel = 'Available';
            let dotClass = 'hk-avail-avail';
            if (availKey === 'busy') {
              availLabel = 'Busy';
              dotClass = 'hk-avail-busy';
            } else if (availKey === 'off') {
              availLabel = 'Offline';
              dotClass = 'hk-avail-off';
            }

            const taskSub = st.current_task?.startsWith('Cleaning')
              ? st.current_task
              : st.floor
              ? `Floor ${st.floor}`
              : 'All floors';

            return (
              <div key={st.id} className="hk-rrow">
                <span className="hk-avatar-large">{initial}</span>
                <div className="hk-rrow-info">
                  <span className="hk-rrow-name">{st.name}</span>
                  <span className="hk-rrow-sub">
                    {taskSub} · {st.open_task_count ?? 0} open
                  </span>
                </div>
                <div className="hk-avail-badge">
                  <span className={`hk-avail-dot ${dotClass}`} />
                  <span className="hk-avail-label">{availLabel}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="hk-bempty" style={{ margin: '8px 0' }}>
            No attendants on shift
          </div>
        )}
      </div>
    </div>
  );
}
