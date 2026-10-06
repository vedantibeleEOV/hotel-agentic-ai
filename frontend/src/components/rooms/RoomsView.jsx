import React, { useState, useMemo } from 'react';
import { useHotel } from '../../context/HotelContext';
import { PriorityBadge, StatusPill } from '../common/UIComponents';
import { BedDouble, Search, Filter, Clock, Zap, Wrench, ShieldAlert } from 'lucide-react';

export default function RoomsView() {
  const { rooms, triggerCheckout, reportMaintenance } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');

  // Filtered & Sorted Rooms (Memoized for high performance)
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchSearch =
        r.room_number.includes(searchTerm) ||
        r.room_type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFloor = selectedFloor === 'ALL' || String(r.floor) === String(selectedFloor);
      const matchStatus = selectedStatus === 'ALL' || r.status === selectedStatus;

      const priorityLevel =
        r.priority_score >= 80
          ? 'CRITICAL'
          : r.priority_score >= 50
          ? 'HIGH'
          : r.priority_score >= 25
          ? 'MEDIUM'
          : 'NORMAL';

      const matchPriority = selectedPriority === 'ALL' || priorityLevel === selectedPriority;

      return matchSearch && matchFloor && matchStatus && matchPriority;
    });
  }, [rooms, searchTerm, selectedFloor, selectedStatus, selectedPriority]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Search Bar */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <BedDouble className="text-[#ff385c]" size={22} /> Rooms Grid Overview
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Live room status, VIP guest arrival countdowns, and priority turnarounds ({filteredRooms.length} Rooms)
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search room number or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-1.5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
            <Filter size={13} /> Filters:
          </div>

          {/* Floor Filter */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="ALL">All Floors</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="DIRTY">Dirty</option>
            <option value="CLEANING">Cleaning</option>
            <option value="READY">Ready</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical (80+)</option>
            <option value="HIGH">High (50+)</option>
            <option value="MEDIUM">Medium (25+)</option>
            <option value="NORMAL">Normal (&lt;25)</option>
          </select>

          {/* Reset Filters */}
          {(selectedFloor !== 'ALL' || selectedStatus !== 'ALL' || selectedPriority !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedFloor('ALL');
                setSelectedStatus('ALL');
                setSelectedPriority('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-rose-600 hover:underline font-bold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Room Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRooms.map((room) => {
          const priorityLvl =
            room.priority_score >= 80
              ? 'CRITICAL'
              : room.priority_score >= 50
              ? 'HIGH'
              : room.priority_score >= 25
              ? 'MEDIUM'
              : 'NORMAL';

          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:shadow-md hover:border-gray-200 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white font-black text-lg flex items-center justify-center shadow-xs">
                    {room.room_number}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-gray-900">Floor {room.floor}</h3>
                    <p className="text-xs text-gray-500 font-medium">{room.room_type}</p>
                  </div>
                </div>

                <StatusPill status={room.status} />
              </div>

              {/* Room Details Info */}
              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={13} /> Next Guest Arrival:
                  </span>
                  <span className="font-bold text-gray-900">{room.next_arrival}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">VIP Status:</span>
                  {room.is_vip ? (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                      ★ VIP Guest
                    </span>
                  ) : (
                    <span className="text-gray-400 font-medium">Regular</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Turnaround Priority:</span>
                  <PriorityBadge level={priorityLvl} score={room.priority_score} />
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                {room.status === 'OCCUPIED' && (
                  <button
                    onClick={() => triggerCheckout(room.id)}
                    className="btn-dark flex-1 py-2 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <Zap size={13} className="text-white flex-shrink-0" /> <span className="text-white">Trigger Checkout</span>
                  </button>
                )}

                <button
                  onClick={() => reportMaintenance(room.id, 'Plumbing', 'High', 'Water leak reported')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1"
                  title="Report Maintenance Issue"
                >
                  <Wrench size={13} /> Issue
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
