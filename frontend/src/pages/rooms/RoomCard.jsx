import React from 'react';
import { Star, Wrench, Lock, AlertCircle } from 'lucide-react';
import { ROOM_STATUS_COLORS } from './StatusChips';

export function StatusPill({ status }) {
  const color = ROOM_STATUS_COLORS[status] || { fg: '#6a6a6a', bg: '#f5f5f5' };
  const showLock = status === 'Out of order' || status === 'OUT_OF_ORDER';
  const showWrench = status === 'Maintenance' || status === 'MAINTENANCE';

  return (
    <span
      className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-semibold whitespace-nowrap leading-none"
      style={{ color: color.fg, backgroundColor: color.bg }}
    >
      {showLock && <Lock size={10} />}
      {showWrench && <Wrench size={10} />}
      <span>{status}</span>
    </span>
  );
}

export function PriorityPill({ priority }) {
  const p = priority || 'Low';
  const styles = {
    Critical: { fg: '#ffffff', bg: '#c13515' },
    High: { fg: '#a8430a', bg: '#fde8da' },
    Medium: { fg: '#222222', bg: '#ffffff', border: '1px solid #c1c1c1' },
    Low: { fg: '#6a6a6a', bg: '#f5f5f5' },
  }[p] || { fg: '#6a6a6a', bg: '#f5f5f5' };

  return (
    <span
      className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-semibold whitespace-nowrap leading-none"
      style={{
        color: styles.fg,
        backgroundColor: styles.bg,
        border: styles.border || 'none',
      }}
    >
      {p === 'Critical' && <AlertCircle size={10} />}
      <span>{p}</span>
    </span>
  );
}

export default function RoomCard({ room, onClick }) {
  const isCritical = room.maint || room.priority === 'Critical';

  return (
    <button
      onClick={() => onClick?.(room)}
      className={`bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col gap-1.5 text-left transition-all hover:shadow-float ${
        isCritical ? 'border-2 border-[#c13515]' : ''
      }`}
    >
      {/* Room Header: Number + Status Pill */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xl font-bold font-mono text-[#222222]">
          {room.room_number || room.id}
        </span>
        <StatusPill status={room.status} />
      </div>

      {/* Room Type */}
      <span className="text-xs text-[#6a6a6a] font-medium truncate">
        {room.room_type}
      </span>

      {/* Guest / Arrival Status Line */}
      <div className="text-xs text-[#3f3f3f] min-h-[18px] truncate">
        {room.guest ? (
          <span>In house · {room.guest}</span>
        ) : room.arrival ? (
          <span>Arrives {room.arrival.ts} · {room.arrival.name}</span>
        ) : (
          <span className="text-[#929292]">{room.note || 'No arrival today'}</span>
        )}
      </div>

      {/* Footer Badges */}
      <div className="flex items-center gap-1 flex-wrap pt-1 min-h-[22px]">
        {room.vip && (
          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#222222] text-white text-[11px] font-semibold">
            <Star size={10} className="fill-white" />
            <span>VIP</span>
          </span>
        )}

        {['Dirty', 'Cleaning', 'Inspection'].includes(room.status) && room.priority !== 'Low' && (
          <PriorityPill priority={room.priority} />
        )}

        {room.maint && (
          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#f1e9f7] text-[#653886] text-[11px] font-semibold">
            <Wrench size={10} />
            <span>{room.maintCategory || 'Issue'}</span>
          </span>
        )}
      </div>
    </button>
  );
}
