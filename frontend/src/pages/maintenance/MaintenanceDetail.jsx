import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  MoreVertical,
  Play,
  PauseCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useMaintenanceDetail } from '../../hooks/useMaintenanceDetail';
import AlertBanner from './AlertBanner';
import AiDecisionCard from './AiDecisionCard';
import SlaCard from './SlaCard';
import TechnicianCard from './TechnicianCard';
import AuditTrail from './AuditTrail';
import OverrideModal from './OverrideModal';
import ReassignModal from './ReassignModal';

/**
 * Maintenance Detail Page
 * Matches exact layout, typography, and interactive capabilities from prototype.
 */
export default function MaintenanceDetail({ incidentId, onBack, onRefreshParent }) {
  const {
    detail,
    header,
    alert,
    reportedProblem,
    aiDecision,
    sla,
    technician,
    auditTrail,
    allowedActions,
    loading,
    error,
    actionLoading,
    actionError,
    setActionError,
    startRepair,
    markResolved,
    blockIssue,
    escalateIssue,
    reassignTechnician,
    overrideClassification,
  } = useMaintenanceDetail(incidentId, onRefreshParent);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');

  if (loading && !detail) {
    return (
      <div className="maint-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--maint-primary)' }} />
        <div style={{ marginTop: 12, color: 'var(--maint-muted)', fontSize: 14 }}>
          Loading incident details...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="maint-page" style={{ padding: '40px 0' }}>
        <button type="button" className="maint-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to maintenance
        </button>
        <div className="maint-error-banner" style={{ marginTop: 16 }}>
          <AlertCircle size={16} />
          <span>{error || 'Incident not found'}</span>
        </div>
      </div>
    );
  }

  const roomNum = header?.room_number || detail.room_number || detail.room_id || '—';
  const displayId = header?.display_id || detail.display_id || detail.id || '';
  const status = header?.status_label || header?.status || detail.status_label || detail.status || 'Reported';
  
  const reportedBy =
    typeof header?.reported_by === 'object'
      ? header.reported_by?.name || ''
      : header?.reported_by || detail.reported_by || '';

  let createdAtTime = '';
  const rawTime = header?.reported_at || header?.created_at_time || detail.created_at;
  if (rawTime) {
    try {
      const dt = new Date(rawTime);
      createdAtTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      createdAtTime = rawTime;
    }
  }

  // Allowed actions check
  const canResolve = allowedActions.includes('complete') || allowedActions.includes('resolve');
  const canStart = allowedActions.includes('start');
  const canBlock = allowedActions.includes('block');
  const canEscalate = allowedActions.includes('escalate');
  const canReassign = allowedActions.includes('reassign');
  const canOverride = allowedActions.includes('override_classification') || allowedActions.includes('override');

  const hasMoreActions = canStart || canBlock || canEscalate;

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    const ok = await markResolved(resolveNotes.trim() || null);
    if (ok) {
      setShowResolveModal(false);
      setResolveNotes('');
    }
  };

  return (
    <div className="maint-page">
      {/* Back button & Header */}
      <div>
        <button type="button" className="maint-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to maintenance
        </button>

        <div className="maint-detail-head">
          <div>
            <div className="maint-detail-title-wrap">
              <span className="maint-detail-title">Room {roomNum}</span>
              {displayId && <span className="maint-detail-id">· {displayId}</span>}
              <span className="maint-pill muted" style={{ fontSize: 13, height: 26, padding: '0 10px' }}>
                {status}
              </span>
            </div>
            <div className="maint-detail-sub">
              {reportedBy ? `Reported by ${reportedBy}` : 'Reported issue'}
              {createdAtTime ? ` at ${createdAtTime}` : ''}
            </div>
          </div>

          {/* Action buttons in header */}
          <div className="maint-head-actions">
            {canResolve && (
              <button
                type="button"
                className="maint-btn primary"
                onClick={() => setShowResolveModal(true)}
                disabled={actionLoading}
              >
                <CheckCircle2 size={16} />
                <span>Mark resolved</span>
              </button>
            )}

            {hasMoreActions && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="maint-btn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  disabled={actionLoading}
                >
                  <MoreVertical size={16} />
                  <span>More actions</span>
                </button>

                {menuOpen && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: 4,
                        background: '#ffffff',
                        border: '1px solid var(--maint-border)',
                        borderRadius: 10,
                        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                        zIndex: 51,
                        minWidth: 180,
                        padding: '6px 0',
                      }}
                    >
                      {canStart && (
                        <button
                          type="button"
                          className="maint-btn tertiary"
                          style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 16px', height: 'auto' }}
                          onClick={() => {
                            setMenuOpen(false);
                            startRepair();
                          }}
                        >
                          <Play size={14} style={{ color: '#16a34a' }} />
                          <span>Start repair</span>
                        </button>
                      )}

                      {canBlock && (
                        <button
                          type="button"
                          className="maint-btn tertiary"
                          style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 16px', height: 'auto' }}
                          onClick={() => {
                            setMenuOpen(false);
                            const reason = window.prompt('Reason for putting on hold:', 'Waiting for parts');
                            if (reason !== null) blockIssue(reason);
                          }}
                        >
                          <PauseCircle size={14} style={{ color: '#d97706' }} />
                          <span>Put on hold</span>
                        </button>
                      )}

                      {canEscalate && (
                        <button
                          type="button"
                          className="maint-btn tertiary"
                          style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 16px', height: 'auto' }}
                          onClick={() => {
                            setMenuOpen(false);
                            const reason = window.prompt('Escalation note:', 'Requires senior technician / duty manager review');
                            if (reason !== null) escalateIssue(reason);
                          }}
                        >
                          <AlertTriangle size={14} style={{ color: '#dc2626' }} />
                          <span>Escalate</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Error Banner if any action failed */}
      {actionError && (
        <div className="maint-error-banner">
          <AlertCircle size={16} />
          <span>{actionError}</span>
          <button
            type="button"
            className="maint-btn sm tertiary"
            onClick={() => setActionError(null)}
            style={{ marginLeft: 'auto' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Big Alert Banner (Emergency red or yellow unassigned) */}
      <AlertBanner alert={alert} />

      {/* 2-Column Main Workspace */}
      <div className="maint-g2-1">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Reported Problem Quote Box */}
          <div className="maint-panel">
            <h3 className="maint-panel-title" style={{ fontSize: 14, color: 'var(--maint-muted)' }}>
              Reported Problem
            </h3>
            <div className="maint-quote-box">
              "{reportedProblem || detail.reported_problem || detail.description || 'No description'}"
            </div>
          </div>

          {/* AI Decision & Classification */}
          <AiDecisionCard
            aiDecision={aiDecision}
            onOverrideClick={() => setShowOverrideModal(true)}
            canOverride={canOverride}
          />

          {/* Audit Trail & Timeline */}
          <AuditTrail auditTrail={auditTrail} />
        </div>

        {/* Right Column */}
        <div className="maint-right-col">
          {/* SLA Card */}
          <SlaCard sla={sla} isResolved={status === 'RESOLVED' || status === 'COMPLETED'} />

          {/* Assigned Technician Card */}
          <TechnicianCard
            technician={technician}
            onReassignClick={() => setShowReassignModal(true)}
            canReassign={canReassign}
          />
        </div>
      </div>

      {/* Modals */}
      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        currentCategory={aiDecision?.category || 'PLUMBING'}
        currentSeverity={aiDecision?.severity || 'MEDIUM'}
        onSubmit={overrideClassification}
      />

      <ReassignModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        taskId={detail.task_id}
        currentStaffId={technician?.id}
        onSubmit={reassignTechnician}
      />

      {/* Resolve Confirmation Modal */}
      {showResolveModal && (
        <div className="maint-modal-scrim" onClick={() => setShowResolveModal(false)}>
          <div
            className="maint-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="maint-modal-head">
              <h3>Mark Maintenance Issue as Resolved</h3>
            </div>
            <form onSubmit={handleResolveSubmit}>
              <div className="maint-modal-body">
                <p style={{ fontSize: 14, color: 'var(--maint-body)', margin: 0 }}>
                  Are you sure you want to mark this issue for <b>Room {roomNum}</b> as resolved?
                  This will complete the task and return the room to inspect / ready flow.
                </p>
                <div className="maint-form-group">
                  <label className="maint-form-label" htmlFor="maint-resolve-notes">
                    Resolution Notes (Optional)
                  </label>
                  <textarea
                    id="maint-resolve-notes"
                    className="maint-textarea"
                    rows={2}
                    placeholder="e.g. Replaced faulty washer and tested water flow..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="maint-modal-footer">
                <button
                  type="button"
                  className="maint-btn"
                  onClick={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="maint-btn primary"
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={15} />
                  <span>{actionLoading ? 'Resolving...' : 'Confirm Resolution'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
