import React from 'react';
import { Sparkles, RefreshCw, RotateCcw, Activity } from 'lucide-react';

export default function Header({ isOnline, onRefresh, onReset, isResetting, isRefreshing }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <h1 className="brand-title">Hotel Multi-Agent Operations</h1>
          <p className="brand-subtitle">Autonomous Room Readiness, Housekeeping & Maintenance Orchestration</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="status-indicator">
          <span className={`dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'FastAPI Backend Online' : 'Backend Disconnected'}</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary"
          title="Reload active tasks and room status"
        >
          <RefreshCw size={15} className={isRefreshing ? 'spinner' : ''} />
          {isRefreshing ? 'Syncing...' : 'Sync'}
        </button>

        <button
          onClick={onReset}
          disabled={isResetting}
          className="btn btn-danger"
          title="Reset PostgreSQL state back to initial seed data"
        >
          <RotateCcw size={15} className={isResetting ? 'spinner' : ''} />
          {isResetting ? 'Resetting...' : 'Reset DB'}
        </button>
      </div>
    </header>
  );
}
