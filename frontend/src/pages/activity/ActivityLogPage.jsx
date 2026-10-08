import React from 'react';
import { Search, Download, Loader2, AlertCircle, ListFilter } from 'lucide-react';
import { useActivityLog } from '../../hooks/useActivityLog';
import { useHotel } from '../../context/HotelContext';
import '../../styles/activityLog.css';

const KINDS = ['All', 'AI Agent', 'System', 'Staff', 'Supervisor'];

/**
 * Activity Log Page Component
 * Complete audit trail of agent, system, and human actions from PostgreSQL
 */
export default function ActivityLogPage() {
  const {
    activities,
    totalCount,
    hasMore,
    loadMore,
    kindFilter,
    setKindFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    eventTypes,
    loading,
    error,
    refreshLogs,
    exportCSV,
  } = useActivityLog();

  const { setActiveTab } = useHotel();

  if (loading && activities.length === 0) {
    return (
      <div className="act-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: '#ff385c' }} />
        <div style={{ marginTop: 12, color: '#6a6a6a', fontSize: 14 }}>
          Loading activity audit trail...
        </div>
      </div>
    );
  }

  const formatTime = (ts) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const getDotClass = (kind) => {
    const k = (kind || '').toLowerCase();
    if (k.includes('ai') || k.includes('agent')) return 'ai';
    if (k.includes('supervisor')) return 'supervisor';
    if (k.includes('staff')) return 'staff';
    return 'system';
  };

  return (
    <div className="act-page">
      {/* Header */}
      <div className="act-head-row">
        <div>
          <h1 className="act-title">Activity log</h1>
          <p className="act-subtitle">
            Complete audit trail of agent, system and human actions
          </p>
        </div>

        <button
          type="button"
          className="act-export-btn"
          onClick={exportCSV}
        >
          <Download size={15} strokeWidth={2.2} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="act-fbar">
        {/* Search */}
        <div className="act-search-wrap">
          <Search size={15} color="#6a6a6a" />
          <input
            type="text"
            className="act-search-input"
            placeholder="Room, person or text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Kind Segments */}
        <div className="act-seg">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className={`act-seg-btn ${kindFilter === k ? 'on' : ''}`}
              onClick={() => setKindFilter(k)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Event Type Select */}
        <select
          className="act-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="All">All event types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Error Banner */}
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
            className="act-more-btn"
            onClick={refreshLogs}
            style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Panel */}
      <div className="act-panel">
        <div className="act-table-scroll">
          <table className="act-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Time</th>
                <th style={{ width: 180 }}>Event</th>
                <th style={{ width: 200 }}>Actor</th>
                <th style={{ width: 80 }}>Room</th>
                <th style={{ width: 220 }}>Action</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: '#6a6a6a' }}>
                    <ListFilter size={32} style={{ margin: '0 auto 8px auto', color: '#c1c1c1' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#222222' }}>
                      No events match
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((item) => {
                  const dotClass = getDotClass(item.kind || item.actor_role);

                  return (
                    <tr key={item.id}>
                      {/* Time */}
                      <td>
                        <span className="act-time">{formatTime(item.timestamp)}</span>
                      </td>

                      {/* Event */}
                      <td>
                        <span className="act-event-title">
                          {item.type || item.event_type || 'Event'}
                        </span>
                      </td>

                      {/* Actor */}
                      <td>
                        <div className="act-actor-cell">
                          <span className="act-actor-name">{item.actor || 'System'}</span>
                          <span className="act-actor-tag">
                            <span className={`act-dot ${dotClass}`} />
                            <span>{item.kind || item.actor_role || 'Staff'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Room */}
                      <td>
                        {item.room ? (
                          <span
                            className="act-room-link"
                            onClick={() => setActiveTab('rooms')}
                            title={`Go to Room ${item.room}`}
                          >
                            {item.room}
                          </span>
                        ) : (
                          <span style={{ color: '#6a6a6a' }}>—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td>
                        <span className="act-action-code">
                          {item.action || '—'}
                        </span>
                      </td>

                      {/* Result */}
                      <td>
                        <span className="act-result-text">
                          {item.result || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="act-load-more">
            <button
              type="button"
              className="act-more-btn"
              onClick={loadMore}
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
