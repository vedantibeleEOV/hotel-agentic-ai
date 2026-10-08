import React from 'react';

const TONE = {
  ok: ['#17693f', '#e4f3ea'],
  info: ['#2657a0', '#e7eefa'],
  warn: ['#874e00', '#fcefd6'],
  high: ['#a8430a', '#fde8da'],
  crit: ['#ffffff', '#c13515'],
  critSoft: ['#a82b10', '#fde9e5'],
  neutral: ['#3f3f3f', '#efefef'],
  muted: ['#6a6a6a', '#f5f5f5'],
  teal: ['#17635e', '#e0f1ef'],
  plum: ['#653886', '#f1e9f7'],
};

const ROOM_TONE = {
  Ready: 'ok',
  Occupied: 'neutral',
  Dirty: 'warn',
  Cleaning: 'info',
  Inspection: 'teal',
  Clean: 'teal',
  Maintenance: 'plum',
  'Out of Service': 'muted',
  Blocked: 'muted',
};

function getRoomStyle(status) {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'BLOCKED' || normalized === 'OUT_OF_SERVICE' || normalized === 'OUT OF SERVICE') {
    return {
      color: '#6a6a6a',
      background: 'repeating-linear-gradient(135deg,#f2f2f2 0 4px,#e2e2e2 4px 8px)',
    };
  }

  let key = 'Dirty';
  if (normalized === 'READY') key = 'Ready';
  else if (normalized === 'OCCUPIED') key = 'Occupied';
  else if (normalized === 'CLEANING') key = 'Cleaning';
  else if (normalized === 'INSPECTION' || normalized === 'CLEAN') key = 'Inspection';
  else if (normalized === 'MAINTENANCE') key = 'Maintenance';

  const toneKey = ROOM_TONE[key] || 'neutral';
  const [fg, bg] = TONE[toneKey] || ['#222222', '#f5f5f5'];
  return { color: fg, background: bg };
}

export default function FloorMapSection({ floors = {}, onNavigate }) {
  const floorKeys = ['5', '4', '3', '2', '1'];

  const handleTileClick = (room) => {
    onNavigate && onNavigate('rooms');
  };

  const legendItems = [
    { label: 'Occupied', tone: 'neutral' },
    { label: 'Dirty', tone: 'warn' },
    { label: 'Cleaning', tone: 'info' },
    { label: 'Inspection', tone: 'teal' },
    { label: 'Ready', tone: 'ok' },
    { label: 'Maintenance', tone: 'plum' },
    { label: 'Out of Service', hatch: true },
  ];

  return (
    <div className="db-panel">
      <div className="db-panel-header">
        <div>
          <h3 className="db-panel-title">Property at a glance</h3>
          <p className="db-panel-subtitle">Every room by floor. Select a room for details.</p>
        </div>
      </div>

      <div className="floormap-stack">
        {floorKeys.map((fl) => {
          const roomList = floors[fl] || [];
          // Sort room numbers ascending
          const sortedRooms = [...roomList].sort((a, b) =>
            String(a.room_number).localeCompare(String(b.room_number))
          );

          return (
            <div key={fl} className="frow">
              <span className="floor-tag">F{fl}</span>
              <div className="fcells">
                {sortedRooms.map((room) => {
                  const rawNum = String(room.room_number || '');
                  const shortNum = rawNum.length >= 2 ? rawNum.slice(-2) : rawNum;
                  const tileStyle = getRoomStyle(room.status);

                  return (
                    <button
                      key={room.id || room.room_number}
                      className="fcell num"
                      style={tileStyle}
                      title={`Room ${room.room_number} · ${room.status} · ${room.room_type || 'Deluxe'}`}
                      onClick={() => handleTileClick(room)}
                    >
                      <span>{shortNum}</span>
                      {room.has_maintenance && <i className="mk" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Colour Legend matching prototype */}
      <div className="flegend">
        {legendItems.map((item) => {
          const swatchStyle = item.hatch
            ? {
                background: 'repeating-linear-gradient(135deg,#f2f2f2 0 3px,#d8d8d8 3px 6px)',
                borderColor: '#c1c1c1',
              }
            : {
                background: TONE[item.tone][1],
                borderColor: TONE[item.tone][0] + '55',
              };

          return (
            <span
              key={item.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="sw" style={swatchStyle} />
              <span>{item.label}</span>
            </span>
          );
        })}

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <i className="mk" style={{ position: 'static' }} />
          <span>Open maintenance</span>
        </span>
      </div>
    </div>
  );
}
