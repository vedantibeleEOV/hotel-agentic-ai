import React from 'react';
import {
  Brush,
  Wrench,
  Zap,
  ChevronRight,
  Star,
} from 'lucide-react';

function RoomChip({ room, onNavigate, laneType }) {
  const roomNumber = typeof room === 'object' ? room.room_number : room;
  const prio = typeof room === 'object' ? room.priority : 'Medium';
  const isOverdue = typeof room === 'object' ? Boolean(room.is_overdue) : false;
  const isVip = typeof room === 'object' ? Boolean(room.is_vip) : false;

  const prioStyles = {
    Critical: { background: '#c13515', color: '#ffffff', borderColor: '#c13515' },
    High: { background: '#fde8da', color: '#a8430a', borderColor: '#f3c3a2' },
    Medium: { background: '#ffffff', color: '#222222', borderColor: '#c1c1c1' },
    Low: { background: '#f5f5f5', color: '#6a6a6a', borderColor: '#ebebeb' },
  }[prio] || { background: '#ffffff', color: '#222222', borderColor: '#c1c1c1' };

  const outlineStyle = isOverdue
    ? { outline: '2px solid #c13515', outlineOffset: 1 }
    : {};

  const handleClick = (e) => {
    e.stopPropagation();
    if (laneType === 'maintenance') {
      onNavigate && onNavigate('maintenance');
    } else {
      onNavigate && onNavigate('rooms');
    }
  };

  return (
    <button
      className="rchip"
      style={{ ...prioStyles, ...outlineStyle }}
      title={`Room ${roomNumber}${isOverdue ? ' · Overdue' : ''}${isVip ? ' · VIP' : ''}`}
      onClick={handleClick}
    >
      <span>{roomNumber}</span>
      {isVip && <Star size={10} strokeWidth={2.4} fill="currentColor" />}
    </button>
  );
}

function Lane({ title, icon: Icon, stages = [], onNavigate, laneType }) {
  return (
    <div className="lane">
      <div className="lanet">
        <Icon size={16} />
        <b>{title}</b>
      </div>

      <div className="stages">
        {stages.map((stage, idx) => {
          const items = stage.rooms || [];
          const count = items.length;
          const max = stage.max || 8;
          const isWarn = Boolean(stage.warn && count > 0);

          return (
            <React.Fragment key={stage.key || idx}>
              <div className={`stage ${isWarn ? 'swarn' : ''}`}>
                <div className="stage-header">
                  <span className="stage-name">{stage.key}</span>
                  <span
                    className="stage-count"
                    style={{ color: isWarn ? '#a82b10' : '#222222' }}
                  >
                    {count}
                  </span>
                </div>

                <div className="stage-agent">
                  {stage.ai && <Zap size={11} className="text-[#222222] fill-[#222222]" />}
                  <span>{stage.agent}</span>
                </div>

                <div className="chips">
                  {count === 0 ? (
                    <span className="text-xs text-[#6a6a6a]">—</span>
                  ) : (
                    <>
                      {items.slice(0, max).map((r, rIdx) => (
                        <RoomChip
                          key={typeof r === 'object' ? r.room_number : rIdx}
                          room={r}
                          onNavigate={onNavigate}
                          laneType={laneType}
                        />
                      ))}
                      {count > max && (
                        <span className="text-xs text-[#6a6a6a] font-medium self-center">
                          +{count - max}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {idx < stages.length - 1 && (
                <div className="conn">
                  <ChevronRight size={14} color="#929292" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function LiveOperationsSection({ liveOperations = {}, onNavigate }) {
  const turnoverStages = liveOperations.turnover_stages || [];
  const maintenanceStages = liveOperations.maintenance_stages || [];

  return (
    <div className="db-panel">
      <div className="db-panel-header">
        <div>
          <h3 className="db-panel-title">Live operations</h3>
          <p className="db-panel-subtitle">Rooms move left to right as agents and staff act</p>
        </div>

        {/* Live Pulse Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#e4f3ea',
            color: '#17693f',
            height: '22px',
            padding: '0 8px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#17693f',
              display: 'inline-block',
            }}
          />
          <span>Live</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Lane 1: Room Turnover */}
        <Lane
          title="Room turnover"
          icon={Brush}
          stages={turnoverStages}
          onNavigate={onNavigate}
          laneType="turnover"
        />

        {/* Lane 2: Maintenance */}
        <Lane
          title="Maintenance"
          icon={Wrench}
          stages={maintenanceStages}
          onNavigate={onNavigate}
          laneType="maintenance"
        />

        {/* Legend Row under the card */}
        <div className="op-legend">
          <span className="op-legend-item">
            <span className="rchip sm" style={{ background: '#fde8da', borderColor: '#f3c3a2' }} />
            <span>High</span>
          </span>

          <span className="op-legend-item">
            <span className="rchip sm" style={{ background: '#ffffff', borderColor: '#c1c1c1' }} />
            <span>Medium</span>
          </span>

          <span className="op-legend-item">
            <span className="rchip sm" style={{ background: '#f5f5f5', borderColor: '#ebebeb' }} />
            <span>Low</span>
          </span>

          <span className="op-legend-item">
            <span className="rchip sm" style={{ background: '#c13515', borderColor: '#c13515' }} />
            <span>Critical</span>
          </span>

          <span className="op-legend-item">
            <span
              className="rchip sm"
              style={{ outline: '2px solid #c13515', background: '#ffffff', border: '1px solid #c1c1c1' }}
            />
            <span>Overdue</span>
          </span>

          <span className="op-legend-item">
            <Star size={11} strokeWidth={2.5} fill="#222222" />
            <span>VIP</span>
          </span>
        </div>
      </div>
    </div>
  );
}
