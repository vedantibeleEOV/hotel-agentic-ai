import React from 'react';
import RoomCard from './RoomCard';
import { ROOM_STATUS_CONFIG } from './StatusChips';

export default function RoomsGrid({ rooms, summary, onRoomClick, onCheckout }) {
  // Extract dynamic floors from rooms list and sort in descending order
  const uniqueFloors = Array.from(
    new Set(rooms.map((r) => Number(r.floor)).filter(Boolean))
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {uniqueFloors.map((fl) => {
        const floorRooms = rooms.filter((r) => Number(r.floor) === fl);
        if (floorRooms.length === 0) return null;

        const flKey = String(fl);
        // Requirement 5: Always show FULL floor numbers from summary even when filter is active
        const floorTotal = summary?.by_floor?.[flKey] ?? floorRooms.length;
        const floorStatusMap = summary?.by_floor_status?.[flKey] || {};

        // Requirement 4: Show only statuses with count > 0 from summary.by_floor_status
        const activeStatuses = ROOM_STATUS_CONFIG.filter((cfg) => {
          const count = floorStatusMap[cfg.key] || 0;
          return count > 0;
        });

        return (
          <div key={fl} className="space-y-2.5">
            {/* Header: Floor N · X rooms + colored status pills */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#222222]">
                  Floor {fl}{' '}
                  <span className="text-[#6a6a6a] font-normal">
                    · {floorTotal} rooms
                  </span>
                </span>

                {/* Status pills with count > 0 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeStatuses.map((cfg) => {
                    const count = floorStatusMap[cfg.key];
                    return (
                      <span
                        key={cfg.key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border border-black/5"
                        style={{ color: cfg.fg, backgroundColor: cfg.bg }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.fg }}
                        />
                        <span>{cfg.label}</span>
                        <b className="font-mono text-[11px] font-bold">{count}</b>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grid layout (up to 5 cards on wide screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {floorRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onClick={onRoomClick}
                  onCheckout={onCheckout}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
