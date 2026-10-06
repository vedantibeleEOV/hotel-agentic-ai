import React, { useState } from 'react';
import { UserX } from 'lucide-react';

export default function AssignedToSection({
  detail,
  assignableStaff = [],
  loadingStaff = false,
  onReassign,
  actionRunning,
}) {
  const [showReassignList, setShowReassignList] = useState(false);

  if (!detail) return null;

  const staff = detail.assigned_staff;
  const isAssigned = Boolean(staff?.id || detail.assigned_staff_id);
  const staffName = staff?.name || (detail.assigned_staff_id ? `Staff #${detail.assigned_staff_id}` : null);
  const initial = staffName ? staffName.charAt(0).toUpperCase() : '?';

  const isAiAssigned = Boolean(detail.ai_assigned);
  const agentName =
    detail.task_type === 'MAINTENANCE_REPAIR' ? 'Maintenance Agent' : 'Housekeeping Agent';

  let subText = 'Waiting for an available attendant';
  if (isAssigned) {
    if (isAiAssigned) {
      subText = `Assigned automatically by ${agentName}`;
    } else if (detail.assigned_by) {
      subText = `Assigned by ${detail.assigned_by}`;
    } else {
      subText = 'Assigned manually';
    }
  } else if (detail.task_type === 'MAINTENANCE_REPAIR') {
    subText = 'No qualified technician available';
  }

  const canReassign = Array.isArray(detail.allowed_actions) && detail.allowed_actions.includes('reassign');

  const handleSelectStaff = async (candidateId) => {
    if (candidateId === staff?.id) return;
    if (onReassign) {
      const ok = await onReassign(candidateId);
      if (ok) {
        setShowReassignList(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header Row with Reassign Link */}
      <div className="flex items-center justify-between">
        <span className="task-drawer-section-title">Assigned to</span>
        {canReassign && (
          <button
            type="button"
            onClick={() => setShowReassignList((prev) => !prev)}
            className="task-reassign-link"
          >
            {showReassignList ? 'Close' : 'Reassign'}
          </button>
        )}
      </div>

      {/* Current Assignee Card */}
      <div className="task-drawer-assigned-box">
        {isAssigned ? (
          <div className="task-staff-avatar">{initial}</div>
        ) : (
          <div className="task-staff-avatar unassigned">
            <UserX size={16} />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-[#222222] truncate">
            {staffName || 'Unassigned'}
          </span>
          <span className="text-xs text-[#717171] truncate">{subText}</span>
        </div>
      </div>

      {/* Reassign Candidate List Popover / Accordion */}
      {showReassignList && (
        <div className="task-reassign-list">
          {loadingStaff ? (
            <div className="p-4 text-center text-xs text-[#717171]">Loading staff candidates...</div>
          ) : assignableStaff.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#717171]">No eligible staff found for this role.</div>
          ) : (
            assignableStaff.map((candidate) => {
              const isCurrent = candidate.id === staff?.id;
              const loadCount = candidate.active_task_count ?? 0;
              const loadPercent = Math.min(100, loadCount * 25);
              const barColor = loadCount >= 4 ? '#d9772b' : '#222222';
              const sameFloor = candidate.assigned_floor === detail.room?.floor;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={isCurrent || actionRunning === 'reassign'}
                  onClick={() => handleSelectStaff(candidate.id)}
                  className="task-reassign-row"
                >
                  <div className="w-8 h-8 rounded-full bg-[#222222] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-[#222222]">{candidate.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                          Current
                        </span>
                      )}
                      {sameFloor && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                          Same floor
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#717171]">
                      {candidate.role} {candidate.assigned_floor ? `· Floor ${candidate.assigned_floor}` : ''}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[11px] text-[#717171] font-mono">
                      {loadCount} active task{loadCount === 1 ? '' : 's'}
                    </span>
                    <div className="task-workload-bar-track">
                      <div
                        className="task-workload-bar-fill"
                        style={{ width: `${loadPercent}%`, background: barColor }}
                      />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
