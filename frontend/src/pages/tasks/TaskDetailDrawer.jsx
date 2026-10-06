import React, { useEffect } from 'react';
import { X, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import DrawerChips from './drawer/DrawerChips';
import TaskFacts from './drawer/TaskFacts';
import AssignedToSection from './drawer/AssignedToSection';
import PrioritySwitch from './drawer/PrioritySwitch';
import ActivityTimeline from './drawer/ActivityTimeline';
import DrawerActions from './drawer/DrawerActions';
import '../../styles/taskDrawer.css';

export default function TaskDetailDrawer({ task, onClose, onTaskUpdated }) {
  const taskId = typeof task === 'object' ? task?.id : task;
  const isOpen = Boolean(taskId);

  const {
    taskDetail,
    assignableStaff,
    loading,
    loadingStaff,
    error,
    actionRunning,
    actionError,
    actionSuccess,
    startTask,
    completeTask,
    blockTask,
    escalateTask,
    cancelTask,
    reassignTask,
    changePriority,
  } = useTaskDetail(taskId, isOpen, onTaskUpdated);

  // Lock body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use enriched detail when loaded, or fallback gracefully to task row object
  const detail = taskDetail || task;
  const displayId = detail.display_id || String(detail.id || '').slice(0, 8);
  const typeLabel = detail.type_label || (detail.task_type === 'ROOM_CLEANING' ? 'Cleaning' : 'Maintenance');

  const roomNumber = detail.room?.number || detail.room_number || detail.room_id || '—';
  const roomType = detail.room?.type || detail.room_type || 'Room';
  const roomFloor = detail.room?.floor !== undefined ? detail.room.floor : (detail.floor !== undefined ? detail.floor : '—');
  const roomSub = `Room ${roomNumber} · ${roomType} · Floor ${roomFloor}`;

  const isBlocked = detail.status === 'BLOCKED' || detail.status === 'ON_HOLD';

  return (
    <div
      className="task-drawer-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          if (onClose) onClose();
        }
      }}
    >
      <div className="task-drawer-panel">
        {/* 1. Header */}
        <div className="task-drawer-head">
          <div className="flex flex-col min-w-0">
            <div className="task-drawer-title-row">
              <span className="task-drawer-title-id">{displayId}</span>
              <span className="task-drawer-title-type">· {typeLabel}</span>
            </div>
            <div className="task-drawer-subtitle">{roomSub}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="task-drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="task-drawer-body">
          {/* Initial Loading Indicator */}
          {loading && !taskDetail && (
            <div className="p-8 text-center text-xs text-[#717171]">
              Loading task detail...
            </div>
          )}

          {/* Top-level Error Banner */}
          {error && (
            <div className="task-drawer-alert-error">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Success Message */}
          {actionSuccess && (
            <div className="task-drawer-alert-msg">
              <CheckCircle2 size={15} className="text-blue-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Action Error Message */}
          {actionError && (
            <div className="task-drawer-alert-error">
              <AlertCircle size={15} />
              <span>{actionError}</span>
            </div>
          )}

          {/* Blocked Warning Box */}
          {isBlocked && (
            <div className="task-drawer-alert-blocked">
              <Lock size={16} className="flex-shrink-0 mt-0.5 text-amber-700" />
              <div>
                <b>Blocked.</b> {detail.description || 'Task is on hold pending clearance.'}
              </div>
            </div>
          )}

          {/* Chips Row */}
          <DrawerChips detail={detail} />

          {/* Task Facts Grid */}
          <TaskFacts detail={detail} />

          {/* Assigned To & Reassign Candidates */}
          <AssignedToSection
            detail={detail}
            assignableStaff={assignableStaff}
            loadingStaff={loadingStaff}
            onReassign={reassignTask}
            actionRunning={actionRunning}
          />

          {/* Priority / Severity Segmented Control */}
          <PrioritySwitch
            detail={detail}
            onChangePriority={changePriority}
            actionRunning={actionRunning}
          />

          {/* Activity Timeline */}
          <ActivityTimeline activity={detail.activity || []} />
        </div>

        {/* 3. Sticky Footer Actions */}
        <div className="task-drawer-foot">
          <DrawerActions
            detail={detail}
            actionRunning={actionRunning}
            onStart={startTask}
            onComplete={completeTask}
            onBlock={blockTask}
            onEscalate={escalateTask}
            onCancel={cancelTask}
          />
        </div>
      </div>
    </div>
  );
}
