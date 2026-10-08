import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useDashboard } from '../../hooks/useDashboard';
import {
  LogOut,
  Plus,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import DashboardKpiGrid from './DashboardKpiGrid';
import NeedsAttentionSection from './NeedsAttentionSection';
import AutonomySection from './AutonomySection';
import LiveOperationsSection from './LiveOperationsSection';
import AgentActivitySection from './AgentActivitySection';
import FloorMapSection from './FloorMapSection';
import SimulateCheckoutModal from './SimulateCheckoutModal';
import ReportIssueModal from '../../pages/maintenance/ReportIssueModal';

export default function DashboardView() {
  const { setActiveTab } = useHotel();
  const {
    property,
    kpis,
    needsAttention,
    autonomy,
    liveOperations,
    floors,
    recentActivity,
    occupiedRooms,
    loading,
    error,
    refreshDashboard,
  } = useDashboard();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const attentionCount = needsAttention.length;
  const subtitleText =
    attentionCount > 0
      ? `${property.name || 'Voyage Grand'}, ${property.city || 'Pune'} · ${attentionCount} item${attentionCount > 1 ? 's' : ''} need attention`
      : `${property.name || 'Voyage Grand'}, ${property.city || 'Pune'} · All systems running smoothly`;

  const handleNavigate = (tab) => {
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  return (
    <div className="db-container">
      {/* 1. Header with Title, Live Subtitle and Action Buttons */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Command center</h1>
          <p className="db-subtitle">{subtitleText}</p>
        </div>

        <div className="db-actions">
          {/* Simulate Checkout Button */}
          <button
            onClick={() => setCheckoutModalOpen(true)}
            className="px-4 py-2 bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-2xs cursor-pointer active:scale-98"
          >
            <LogOut size={15} />
            <span>Simulate checkout</span>
          </button>

          {/* Report Issue Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="px-4 py-2 bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Report issue</span>
          </button>
        </div>
      </div>

      {/* Loading indicator or error banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={refreshDashboard}
            className="ml-auto underline font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. 8 KPI Cards Grid */}
      <DashboardKpiGrid kpis={kpis} onNavigate={handleNavigate} />

      {/* 3. Main Split Grid: Needs Attention + Autonomy Today */}
      <div className="db-split-grid">
        <NeedsAttentionSection items={needsAttention} onNavigate={handleNavigate} />
        <AutonomySection autonomy={autonomy} />
      </div>

      {/* 4. Secondary Split Grid: Live Operations Lanes + Agent Activity Feed */}
      <div className="db-split-grid">
        <LiveOperationsSection liveOperations={liveOperations} onNavigate={handleNavigate} />
        <AgentActivitySection activities={recentActivity} onNavigate={handleNavigate} />
      </div>

      {/* 5. Property At A Glance (Floors 5 down to 1 FloorMap) */}
      <FloorMapSection floors={floors} onNavigate={handleNavigate} />

      {/* Simulate Checkout Modal */}
      {checkoutModalOpen && (
        <SimulateCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => setCheckoutModalOpen(false)}
          occupiedRooms={occupiedRooms}
          onSuccess={refreshDashboard}
        />
      )}

      {/* Report Maintenance Issue Modal */}
      {reportModalOpen && (
        <ReportIssueModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onSuccess={refreshDashboard}
        />
      )}
    </div>
  );
}
