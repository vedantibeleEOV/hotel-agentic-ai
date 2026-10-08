import React from 'react';

const KIND_COLORS = {
  'AI Agent': '#222222',
  'System': '#929292',
  'Staff': '#2657a0',
  'Supervisor': '#a8430a',
};

function getDotColor(event) {
  const typeLower = (event.event_type || event.type || '').toLowerCase();
  if (typeLower.includes('breach') || typeLower.includes('safety') || typeLower.includes('sla')) {
    return '#c13515';
  }
  if (typeLower.includes('override') || typeLower.includes('escalat')) {
    return '#a8430a';
  }
  return KIND_COLORS[event.kind] || KIND_COLORS[event.actor_role] || '#222222';
}

function formatHHMM(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

export default function AgentActivitySection({ activities = [], onNavigate }) {
  const displayActivities = activities.slice(0, 15);

  return (
    <div className="db-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="db-panel-header">
        <div>
          <h3 className="db-panel-title">Agent activity</h3>
          <p className="db-panel-subtitle">Latest decisions</p>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('traces')}
          className="link small"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 500,
            fontSize: '13px',
            color: '#222222',
          }}
        >
          AI Operations
        </button>
      </div>

      <div className="tl-container" style={{ flex: 1 }}>
        {displayActivities.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6a6a6a]">
            No recent agent activities logged today.
          </div>
        ) : (
          <div className="tl">
            {displayActivities.map((act, idx) => {
              const dotColor = getDotColor(act);
              const timeStr = formatHHMM(act.timestamp);
              const actionTitle = act.action || act.type || 'Operational action';

              const actorPart = act.actor || act.actor_name || act.kind || 'Agent';
              const roomPart = act.room ? ` · Room ${act.room}` : '';
              const resultPart = act.result ? ` · ${act.result}` : '';
              const subtext = `${actorPart}${roomPart}${resultPart}`;

              return (
                <div key={act.id || idx} className="tli">
                  <div className="tlt num">{timeStr}</div>
                  <div className="tld" style={{ background: dotColor }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="tli-action">{actionTitle}</div>
                    <div className="tli-sub truncate">{subtext}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
