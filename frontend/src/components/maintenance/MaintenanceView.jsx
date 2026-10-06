import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { PriorityBadge, StatusPill, StaffAvatar, Modal } from '../common/UIComponents';
import { Wrench, Plus, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function MaintenanceView() {
  const { rooms, staff, reportMaintenance } = useHotel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || 1);
  const [category, setCategory] = useState('HVAC');
  const [severity, setSeverity] = useState('High');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maintenanceTech = staff.find((s) => s.role === 'MAINTENANCE') || {
    name: 'Rakesh Jadhav',
    role: 'MAINTENANCE',
    assigned_floor: 4,
    active_task_count: 0,
    is_available: true,
  };

  const maintenanceRooms = rooms.filter((r) => r.status === 'MAINTENANCE');

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await reportMaintenance(Number(selectedRoomId), category, severity, description || 'Maintenance issue reported');
      setIsModalOpen(false);
      setDescription('');
    } catch (err) {
      alert(`Error submitting report: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Wrench className="text-purple-600" size={22} /> Maintenance Operations
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Autonomous Maintenance Agent Incident Dispatch & Technician Queue
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <Plus size={15} /> Report Maintenance Issue
        </button>
      </div>

      {/* Maintenance Staff Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="text-gray-700" size={18} /> Assigned Maintenance Technician
        </h3>

        <div className="p-4 rounded-xl border border-gray-100 bg-purple-50/40 flex items-center justify-between">
          <StaffAvatar
            name={maintenanceTech.name}
            role={maintenanceTech.role}
            activeTasks={maintenanceTech.active_task_count}
            isAvailable={maintenanceTech.is_available}
          />
          <div className="text-right">
            <span className="text-xs font-bold text-purple-900">Floor {maintenanceTech.assigned_floor}</span>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Active Incidents: <span className="font-bold text-purple-700">{maintenanceTech.active_task_count}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Active Incidents Queue */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Active Maintenance Incidents ({maintenanceRooms.length})</h3>
          <span className="text-xs text-gray-400">Managed by Maintenance Agent</span>
        </div>

        {maintenanceRooms.length === 0 ? (
          <div className="text-center py-10 text-gray-400 space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
            <p className="text-sm font-semibold text-gray-700">No Active Incidents Reported</p>
            <p className="text-xs text-gray-400">All hotel equipment and HVAC systems running smoothly.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {maintenanceRooms.map((room) => (
              <div key={room.id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-900 text-white font-black text-lg flex items-center justify-center">
                    {room.room_number}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-gray-900">Room {room.room_number} (Floor {room.floor})</span>
                    <p className="text-xs text-gray-500 mt-0.5">HVAC Air Conditioning Temperature Sensor Malfunction</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <PriorityBadge level="HIGH" score={90} />
                  <StatusPill status="MAINTENANCE" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Issue Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Report Maintenance Issue">
        <form onSubmit={handleSubmitReport} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-gray-700 mb-1">Target Room:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} (Floor {r.floor} - {r.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Issue Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="HVAC">HVAC / Air Conditioning</option>
              <option value="Plumbing">Plumbing / Water Leak</option>
              <option value="Electrical">Electrical / Lighting</option>
              <option value="Furniture">Furniture / Keycard Lock</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Severity Level:</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="Critical">Critical (Immediate Repair)</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Description:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter issue details..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5"
            >
              {isSubmitting ? 'Submitting...' : 'Dispatch Maintenance Agent'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
