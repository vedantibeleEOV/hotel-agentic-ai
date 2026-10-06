import React from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

/**
 * Chip row: status chip, priority chip (High is orange), "AI assigned" chip with bolt icon, and duration/SLA chip.
 */
export default function DrawerChips({ detail }) {
  if (!detail) return null;

  const status = detail.status || 'PENDING';
  const statusLabel = detail.status_label || status;
  const priority = detail.priority_level || 'NORMAL';
  const priorityLabel = detail.priority_label || (priority === 'URGENT' ? 'Critical' : priority === 'HIGH' ? 'High' : priority === 'STANDARD' ? 'Medium' : 'Low');
  const aiAssigned = Boolean(detail.ai_assigned);
  const expectedMinutes = detail.expected_minutes || 30;
  const isEscalated = detail.status === 'ESCALATED' || detail.priority_level === 'URGENT' || (detail.activity && detail.activity.some((a) => a.action === 'ESCALATE_TASK' || a.title?.toLowerCase().includes('escalated')));

  // Status chip styling
  let statusClass = 'task-pill-status-assigned';
  if (status === 'COMPLETED' || status === 'DONE') statusClass = 'task-pill-status-completed';
  else if (status === 'IN_PROGRESS' || status === 'CLEANING' || status === 'IN_REPAIR') statusClass = 'task-pill-status-in-progress';
  else if (status === 'BLOCKED' || status === 'ON_HOLD') statusClass = 'task-pill-status-blocked';
  else if (status === 'CANCELLED') statusClass = 'task-pill-status-cancelled';

  // Priority chip styling
  let prioClass = 'task-pill-prio-low';
  if (priority === 'URGENT' || priorityLabel === 'Critical') prioClass = 'task-pill-prio-critical';
  else if (priority === 'HIGH' || priorityLabel === 'High') prioClass = 'task-pill-prio-high';
  else if (priority === 'STANDARD' || priorityLabel === 'Medium') prioClass = 'task-pill-prio-medium';

  return (
    <div className="task-drawer-chips-row">
      {/* 1. Status Pill */}
      <span className={`task-pill ${statusClass}`}>{statusLabel}</span>

      {/* 2. Priority Pill */}
      <span className={`task-pill ${prioClass}`}>{priorityLabel}</span>

      {/* 3. AI Assigned Tag */}
      {aiAssigned && (
        <span className="task-pill task-pill-ai">
          <Zap size={13} className="fill-purple-600 text-purple-600" />
          <span>AI assigned</span>
        </span>
      )}

      {/* 4. Expected duration */}
      <span className="task-pill task-pill-duration">{expectedMinutes} min</span>

      {/* 5. Escalated Indicator if applicable */}
      {isEscalated && (
        <span className="task-pill task-pill-escalated">
          <AlertTriangle size={13} />
          <span>Escalated</span>
        </span>
      )}
    </div>
  );
}
