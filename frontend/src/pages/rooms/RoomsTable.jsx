import React from 'react';
import { Star, Wrench } from 'lucide-react';
import { StatusPill, PriorityPill } from './RoomCard';
import { ROOM_STATUS_CONFIG } from './StatusChips';

export default function RoomsTable({ rooms, summary, onRoomClick }) {
  // Group rooms by floor in descending order
  const uniqueFloors = Array.from(
    new Set(rooms.map((r) => Number(r.floor)).filter(Boolean))
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-4">
      {uniqueFloors.map((fl) => {
        const floorRooms = rooms.filter((r) => Number(r.floor) === fl);
        if (floorRooms.length === 0) return null;

        const flKey = String(fl);
        // Requirement 5: Always show FULL floor numbers from summary
        const floorTotal = summary?.by_floor?.[flKey] ?? floorRooms.length;
        const floorStatusMap = summary?.by_floor_status?.[flKey] || {};

        // Requirement 4: Show only statuses with count > 0
        const activeStatuses = ROOM_STATUS_CONFIG.filter((cfg) => {
          const count = floorStatusMap[cfg.key] || 0;
          return count > 0;
        });

        return (
          <div key={fl} className="bg-white border border-[#dddddd] rounded-2xl overflow-hidden shadow-2xs">
            {/* Floor Heading in List View */}
            <div className="bg-[#fafafa] border-b border-[#dddddd] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
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

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-white border-b border-[#ebebeb] text-[12px] font-semibold text-[#6a6a6a]">
                    <th className="py-2.5 px-3.5">Room</th>
                    <th className="py-2.5 px-3.5">Floor</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Guest / reservation</th>
                    <th className="py-2.5 px-3.5">Next check-in</th>
                    <th className="py-2.5 px-3.5">Cleaning</th>
                    <th className="py-2.5 px-3.5">Maintenance</th>
                    <th className="py-2.5 px-3.5">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebeb]">
                  {floorRooms.map((room) => (
                    <tr
                      key={room.id}
                      onClick={() => onRoomClick?.(room)}
                      className="hover:bg-[#fafafa] transition-colors cursor-pointer"
                    >
                      {/* Room */}
                      <td className="py-3 px-3.5 font-bold font-mono text-[#222222]">
                        <div className="flex items-center gap-1.5">
                          <span>{room.room_number || room.id}</span>
                          {room.vip && <Star size={12} className="fill-[#222222] text-[#222222]" />}
                        </div>
                      </td>

                      {/* Floor */}
                      <td className="py-3 px-3.5 text-[#6a6a6a] font-mono">{room.floor}</td>

                      {/* Type */}
                      <td className="py-3 px-3.5 font-normal text-[#222222]">{room.room_type}</td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        <StatusPill status={room.status} />
                      </td>

                      {/* Guest / reservation */}
                      <td className="py-3 px-3.5 text-[#3f3f3f]">
                        {room.guest ? room.guest : <span className="text-[#929292]">Vacant</span>}
                      </td>

                      {/* Next check-in */}
                      <td className="py-3 px-3.5 text-xs font-mono text-[#3f3f3f]">
                        {room.arrival ? `${room.arrival.ts} · ${room.arrival.name}` : <span className="text-[#929292]">—</span>}
                      </td>

                      {/* Cleaning */}
                      <td className="py-3 px-3.5 text-xs">
                        {['Dirty', 'Cleaning', 'Inspection'].includes(room.status) ? (
                          <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full bg-[#fcefd6] text-[#874e00] text-[11px] font-semibold">
                            In turnover
                          </span>
                        ) : (
                          <span className="text-[#929292]">—</span>
                        )}
                      </td>

                      {/* Maintenance */}
                      <td className="py-3 px-3.5 text-xs">
                        {room.maint ? (
                          <span className="inline-flex items-center gap-1 text-[#653886] font-medium">
                            <PriorityPill priority={room.priority} />
                            <span className="text-xs ml-1">{room.maintCategory}</span>
                          </span>
                        ) : (
                          <span className="text-[#929292]">—</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3.5">
                        <PriorityPill priority={room.priority} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
