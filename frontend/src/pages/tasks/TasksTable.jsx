import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import PriorityPill from './PriorityPill';
import StatusPill from './StatusPill';
import SlaBadge from './SlaBadge';

/**
 * Format relative time (e.g., "12m ago", "2h 15m ago")
 */
function formatRelativeTime(dateString, nowMs) {
  if (!dateString) return '—';
  const createdMs = new Date(dateString).getTime();
  if (isNaN(createdMs)) return '—';

  const diffSec = Math.max(0, Math.floor((nowMs - createdMs) / 1000));
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `${diffHours}h ${remMin}m ago` : `${diffHours}h ago`;
  }
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

function formatClockTime(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function TasksTable({ tasks = [], onSelectTask }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [now, setNow] = useState(Date.now());

  // Ticker for relative time calculation every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map((t) => t.id)));
    }
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white border border-[#dddddd] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#dddddd] bg-[#fafafa] text-[#717171] font-semibold text-[11px] select-none">
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={tasks.length > 0 && selectedIds.size === tasks.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#cccccc] text-[#222222] focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4 min-w-[200px]">Task</th>
              <th className="py-3 px-4 min-w-[110px]">Type</th>
              <th className="py-3 px-4 min-w-[80px]">Room</th>
              <th className="py-3 px-4 min-w-[180px]">Assigned to</th>
              <th className="py-3 px-4 min-w-[95px]">Priority</th>
              <th className="py-3 px-4 min-w-[105px]">Status</th>
              <th className="py-3 px-4 min-w-[120px]">Created</th>
              <th className="py-3 px-4 min-w-[120px]">SLA</th>
              <th className="py-3 px-3 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eeeeee] text-[#222222]">
            {tasks.map((task) => {
              const staffName =
                task.assigned_staff?.name ||
                (task.assigned_staff_id ? `Staff #${task.assigned_staff_id}` : null);
              const initial = staffName ? staffName.charAt(0).toUpperCase() : '?';
              const clockTime = formatClockTime(task.created_at);
              const relTime = formatRelativeTime(task.created_at, now);

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask && onSelectTask(task)}
                  className="hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
                >
                  {/* Checkbox */}
                  <td className="py-3.5 px-4 text-center" onClick={(e) => toggleSelectRow(task.id, e)}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(task.id)}
                      onChange={(e) => toggleSelectRow(task.id, e)}
                      className="rounded border-[#cccccc] text-[#222222] focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Task ID & Description */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[13px] text-[#222222] tracking-tight">
                        {task.display_id || String(task.id).slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-[#717171] line-clamp-1 max-w-xs mt-0.5">
                        {task.description || 'Routine task'}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4 text-xs font-medium text-[#484848]">
                    {task.type_label || (task.task_type === 'ROOM_CLEANING' ? 'Cleaning' : 'Maintenance')}
                  </td>

                  {/* Room */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-xs text-[#222222]">
                      {task.room_number || task.room_id}
                    </span>
                  </td>

                  {/* Assigned to */}
                  <td className="py-3.5 px-4">
                    {staffName ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#222222] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {initial}
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-xs text-[#222222] truncate max-w-[110px]">
                            {staffName}
                          </span>
                          <span className="text-[10px] font-medium text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200 flex-shrink-0">
                            AI assigned
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#888888] italic">Unassigned</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4">
                    <PriorityPill priority={task.priority_label || task.priority_level} />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <StatusPill status={task.status_label || task.status} />
                  </td>

                  {/* Created */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-medium text-[#222222]">{clockTime}</span>
                      <span className="text-[#888888]">· {relTime}</span>
                    </div>
                  </td>

                  {/* SLA */}
                  <td className="py-3.5 px-4">
                    <SlaBadge slaDeadline={task.sla_deadline} status={task.status} />
                  </td>

                  {/* Action Arrow */}
                  <td className="py-3.5 px-3 text-right">
                    <button
                      type="button"
                      aria-label="View task details"
                      className="p-1 rounded-md text-[#888888] group-hover:text-[#222222] group-hover:bg-[#eeeeee] transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
