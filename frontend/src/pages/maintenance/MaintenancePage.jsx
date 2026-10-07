import React, { useState } from 'react';
import { Plus, AlertCircle, Wrench } from 'lucide-react';
import { useMaintenanceBoard } from '../../hooks/useMaintenanceBoard';
import MaintenanceSummaryCards from './MaintenanceSummaryCards';
import MaintenanceTabs from './MaintenanceTabs';
import IssueCard from './IssueCard';
import TechniciansPanel from './TechniciansPanel';
import WarningBox from './WarningBox';
import ReportIssueModal from './ReportIssueModal';
import MaintenanceDetail from './MaintenanceDetail';

/**
 * Main Maintenance Page Component
 * Handles switching between the Board (2-column issue grid + technicians panel) and the Issue Detail view.
 * Matches exact title ("Maintenance"), layout, and button styling from Voyage Ops Prototype.
 */
export default function MaintenancePage() {
  const {
    summary,
    tabCounts,
    issues,
    technicians,
    warnings,
    activeTab,
    setActiveTab,
    loading,
    error,
    refreshBoard,
  } = useMaintenanceBoard('Open');

  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // If viewing an incident's detail page
  if (selectedIncidentId) {
    return (
      <MaintenanceDetail
        incidentId={selectedIncidentId}
        onBack={() => setSelectedIncidentId(null)}
        onRefreshParent={refreshBoard}
      />
    );
  }

  return (
    <div className="maint-page">
      {/* Page Header: Title "Maintenance" and single pink "Report issue" button */}
      <div className="maint-header">
        <div className="maint-header-left">
          <h1 className="maint-title">Maintenance</h1>
          <p className="maint-subtitle">
            Staff describe the problem. The Maintenance Agent sets category, severity and SLA, then finds a technician.
          </p>
        </div>

        <button
          type="button"
          className="maint-btn primary"
          onClick={() => setShowReportModal(true)}
        >
          <Plus size={16} />
          <span>Report issue</span>
        </button>
      </div>

      {/* 7 Summary KPI Cards */}
      <MaintenanceSummaryCards
        summary={summary}
        technicians={technicians}
        onSelectTab={(tabName) => setActiveTab(tabName)}
      />

      {/* 2-Column Main Workspace */}
      <div className="maint-g2-1">
        {/* Left Column: Segmented Tabs & 2-Column Issue Grid */}
        <div className="maint-queue-col">
          <MaintenanceTabs
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            tabCounts={tabCounts}
          />

          {error && (
            <div className="maint-error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button
                type="button"
                className="maint-btn sm tertiary"
                onClick={refreshBoard}
                style={{ marginLeft: 'auto' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* 2-Column Issue Cards Grid (.maint-igrid) */}
          {issues.length === 0 && !loading ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--maint-border)',
                borderRadius: 14,
                padding: '48px 24px',
                textAlign: 'center',
                color: 'var(--maint-muted)',
              }}
            >
              <Wrench size={32} style={{ margin: '0 auto 12px auto', color: '#c1c1c1' }} />
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--maint-ink)' }}>
                {activeTab === 'Critical'
                  ? 'No critical issues'
                  : activeTab === 'Unassigned'
                  ? 'Every open issue has a technician.'
                  : 'No issues here'}
              </div>
            </div>
          ) : (
            <div className="maint-igrid">
              {issues.map((issue) => (
                <IssueCard
                  key={issue.incident_id || issue.id}
                  issue={issue}
                  onSelect={(id) => setSelectedIncidentId(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Technicians Roster & Warnings */}
        <div className="maint-right-col">
          <TechniciansPanel technicians={technicians} />
          <WarningBox warnings={warnings} />
        </div>
      </div>

      {/* Report Issue Modal */}
      <ReportIssueModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSuccess={() => refreshBoard()}
      />
    </div>
  );
}
