import React from 'react';
import { useHousekeeping } from '../../hooks/useHousekeeping';
import FloorTabs from './FloorTabs';
import SummaryCards from './SummaryCards';
import BoardColumn from './BoardColumn';
import AttendantsPanel from './AttendantsPanel';
import { AlertCircle, RefreshCw } from 'lucide-react';
import '../../styles/housekeeping.css';

/**
 * Main Housekeeping Operations Page matching Voyage Ops Prototype
 */
export default function HousekeepingPage() {
  const {
    summary,
    columns,
    attendants,
    floors,
    selectedFloor,
    setSelectedFloor,
    loading,
    error,
    refreshHousekeeping,
  } = useHousekeeping('All');

  const handleCardClick = (card) => {
    // Interactive card inspection
    console.log('Selected housekeeping room card:', card);
  };

  return (
    <div className="hk-page">
      {/* Page Header */}
      <div className="hk-header">
        <div className="hk-header-left">
          <h1 className="hk-title">Housekeeping</h1>
          <p className="hk-subtitle">
            Housekeeping Agent assigns rooms by floor, workload and next arrival
          </p>
        </div>

        <div className="hk-header-right">
          <FloorTabs
            selectedFloor={selectedFloor}
            onChange={setSelectedFloor}
            floors={floors}
          />
        </div>
      </div>

      {/* Error Banner if API fails */}
      {error && (
        <div className="hk-error-state">
          <AlertCircle size={28} className="text-rose-600" />
          <p className="text-sm font-semibold text-gray-800">{error}</p>
          <button
            type="button"
            onClick={refreshHousekeeping}
            className="btn-dark px-4 py-2 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw size={13} className="text-white flex-shrink-0" /> <span className="text-white">Retry</span>
          </button>
        </div>
      )}

      {/* Initial Loading Spinner */}
      {loading && !summary && (
        <div className="hk-loading-state">
          <div className="hk-spinner" />
          <p className="text-xs font-semibold text-gray-500">Loading housekeeping board...</p>
        </div>
      )}

      {/* 6 KPI Metric Cards */}
      {summary && <SummaryCards summary={summary} />}

      {/* Kanban Board & Attendants Panel */}
      {summary && (
        <div className="hk-wrap">
          {/* 6 Kanban Columns */}
          <div className="hk-board">
            {columns.map((col) => (
              <BoardColumn
                key={col.key}
                column={col}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          {/* Attendants Panel */}
          <AttendantsPanel attendants={attendants} />
        </div>
      )}
    </div>
  );
}
