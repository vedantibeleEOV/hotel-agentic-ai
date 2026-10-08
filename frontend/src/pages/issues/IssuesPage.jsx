import React, { useState } from 'react';
import { Flame, Clock, UserX, Lock, Star, Check, Loader2, AlertCircle } from 'lucide-react';
import { useIssues } from '../../hooks/useIssues';
import TaskDetailDrawer from '../tasks/TaskDetailDrawer';
import '../../styles/issues.css';

/**
 * Issues (Exceptions) Page Component
 * Matches exact layout, typography, and interactive functionality of Voyage Ops Prototype.
 */
export default function IssuesPage() {
  const {
    criticalIssues,
    overdueIssues,
    reviewIssues,
    totalCount,
    loading,
    error,
    refreshIssues,
  } = useIssues();

  const [selectedTask, setSelectedTask] = useState(null);

  if (loading && totalCount === 0) {
    return (
      <div className="issues-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: '#ff385c' }} />
        <div style={{ marginTop: 12, color: '#6a6a6a', fontSize: 14 }}>
          Loading exceptions and issues...
        </div>
      </div>
    );
  }

  const renderIssueIcon = (iconName, level) => {
    if (level === 0 || iconName === 'flame') {
      return (
        <div className="issues-icon crit">
          <Flame size={18} strokeWidth={2.2} />
        </div>
      );
    }
    if (iconName === 'userx') {
      return (
        <div className="issues-icon warn">
          <UserX size={18} strokeWidth={2.2} />
        </div>
      );
    }
    if (iconName === 'clock') {
      return (
        <div className="issues-icon warn">
          <Clock size={18} strokeWidth={2.2} />
        </div>
      );
    }
    if (iconName === 'lock') {
      return (
        <div className="issues-icon normal">
          <Lock size={18} strokeWidth={2.2} />
        </div>
      );
    }
    if (iconName === 'star') {
      return (
        <div className="issues-icon normal">
          <Star size={18} strokeWidth={2.2} />
        </div>
      );
    }
    return (
      <div className="issues-icon normal">
        <AlertCircle size={18} strokeWidth={2.2} />
      </div>
    );
  };

  const renderIssueCard = (item) => {
    const isCrit = item.level === 0;

    return (
      <div
        key={item.id}
        className={`issues-card ${isCrit ? 'crit' : ''}`}
      >
        <div className="issues-left">
          {renderIssueIcon(item.icon, item.level)}
          <div className="issues-info">
            <span className="issues-item-title">{item.title}</span>
            <span className="issues-item-sub">{item.body}</span>
          </div>
        </div>

        <div className="issues-right">
          {item.isBreached && item.slaDiffText && (
            <span className="issues-pill-breached">
              <Clock size={13} strokeWidth={2.5} />
              <span>Breached {item.slaDiffText}</span>
            </span>
          )}

          <button
            type="button"
            className={`issues-btn ${isCrit ? 'primary' : 'secondary'}`}
            onClick={() => setSelectedTask(item.task)}
          >
            {item.cta}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="issues-page">
      {/* Page Header */}
      <div className="issues-head">
        <h1 className="issues-title">Issues</h1>
        <p className="issues-subtitle">
          Everything that needs a human decision. When this list is empty, the hotel is running itself.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: '#fde9e5',
            border: '1px solid #f8bbb0',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#8a2410',
            fontSize: 14,
            marginBottom: 20,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="issues-btn secondary"
            onClick={refreshIssues}
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Issues Sections */}
      {totalCount === 0 ? (
        <div className="issues-panel">
          <div className="issues-empty">
            <div className="issues-empty-icon">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px 0', color: '#222222' }}>
              No exceptions
            </h3>
            <p style={{ fontSize: 14, color: '#6a6a6a', margin: 0 }}>
              Agents are handling all open work.
            </p>
          </div>
        </div>
      ) : (
        <div className="issues-sections">
          {/* 1. Critical Issues Panel */}
          {criticalIssues.length > 0 && (
            <div className="issues-panel">
              <div className="issues-panel-title">
                <span>Critical · {criticalIssues.length}</span>
              </div>
              <div className="issues-list">
                {criticalIssues.map((item) => renderIssueCard(item))}
              </div>
            </div>
          )}

          {/* 2. Overdue or Unassigned Panel */}
          {overdueIssues.length > 0 && (
            <div className="issues-panel">
              <div className="issues-panel-title">
                <span>Overdue or unassigned · {overdueIssues.length}</span>
              </div>
              <div className="issues-list">
                {overdueIssues.map((item) => renderIssueCard(item))}
              </div>
            </div>
          )}

          {/* 3. Review, Blocked and Priority Panel */}
          {reviewIssues.length > 0 && (
            <div className="issues-panel">
              <div className="issues-panel-title">
                <span>Review, blocked and priority · {reviewIssues.length}</span>
              </div>
              <div className="issues-list">
                {reviewIssues.map((item) => renderIssueCard(item))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task / Issue Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={() => {
            refreshIssues();
          }}
        />
      )}
    </div>
  );
}
