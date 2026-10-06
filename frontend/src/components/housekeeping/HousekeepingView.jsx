import React from 'react';
import { useHotel } from '../../context/HotelContext';
import { PriorityBadge, StatusPill, StaffAvatar } from '../common/UIComponents';
import { Sparkles, Users, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function HousekeepingView() {
  const { staff, rooms, tasks, completeTask, triggerCheckout } = useHotel();

  // Housekeeping staff only
  const housekeepingStaff = staff.filter((s) => s.role === 'HOUSEKEEPING');

  // Dirty / Cleaning Rooms needing turnaround
  const housekeepingRooms = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-[#ff385c]" size={22} /> Housekeeping Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Autonomous Housekeeping Agent Staff Assignments & Workload Dispatch
          </p>
        </div>

        <button
          onClick={() => triggerCheckout(1)}
          className="px-4 py-2 bg-[#ff385c] hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Sparkles size={14} /> Dispatch Turnaround
        </button>
      </div>

      {/* Housekeeping Staff Roster */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-gray-700" size={18} /> Active Housekeeping Staff Roster
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {housekeepingStaff.map((st) => (
            <div
              key={st.id}
              className="p-4 rounded-xl border border-gray-100 bg-gray-50/60 flex items-center justify-between hover:border-gray-200 transition-all"
            >
              <StaffAvatar
                name={st.name}
                role={st.role}
                activeTasks={st.active_task_count}
                isAvailable={st.is_available}
              />
              <div className="text-right">
                <span className="text-xs font-bold text-gray-900">Floor {st.assigned_floor}</span>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Tasks: <span className="font-bold text-rose-600">{st.active_task_count}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Housekeeping Turnaround Task Queue */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-[#ff385c]" /> Housekeeping Turnaround Queue ({housekeepingRooms.length})
          </h3>
          <span className="text-xs text-gray-400">Auto-dispatched by Housekeeping Agent</span>
        </div>

        {housekeepingRooms.length === 0 ? (
          <div className="text-center py-10 text-gray-400 space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">All Rooms Are Clean & Ready!</p>
            <p className="text-xs text-gray-400">No rooms currently in dirty or cleaning status.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {housekeepingRooms.map((room) => {
              const priorityLvl =
                room.priority_score >= 80
                  ? 'CRITICAL'
                  : room.priority_score >= 50
                  ? 'HIGH'
                  : room.priority_score >= 25
                  ? 'MEDIUM'
                  : 'NORMAL';

              const assignedStaffObj = housekeepingStaff.find((s) => s.assigned_floor === room.floor);

              return (
                <div key={room.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-black text-lg flex items-center justify-center">
                      {room.room_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">Floor {room.floor}</span>
                        <span className="text-xs text-gray-500">• {room.room_type}</span>
                        {room.is_vip && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            ★ VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusPill status={room.status} />
                        <span className="text-xs text-gray-500">Next Arrival: {room.next_arrival}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <PriorityBadge level={priorityLvl} score={room.priority_score} />
                    
                    {assignedStaffObj && (
                      <div className="text-xs text-gray-600 font-medium">
                        Assigned: <span className="font-bold text-gray-900">{assignedStaffObj.name}</span>
                      </div>
                    )}
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
