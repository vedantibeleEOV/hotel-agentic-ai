import React, { useState } from 'react';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import { useStaff } from '../../hooks/useStaff';
import StaffDrawer from './StaffDrawer';

const CATEGORIES = ['All', 'Housekeeping', 'Maintenance', 'Supervisors', 'Managers'];

/**
 * Main Staff Page Component
 * Exact match to Voyage Ops Prototype screenshot and design system.
 */
export default function StaffPage() {
  const {
    filteredStaff,
    activeCategory,
    setActiveCategory,
    categoryCounts,
    availCounts,
    loading,
    error,
    refreshStaff,
  } = useStaff('All');

  const [selectedStaff, setSelectedStaff] = useState(null);

  if (loading && filteredStaff.length === 0) {
    return (
      <div className="staff-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: '#ff385c' }} />
        <div style={{ marginTop: 12, color: '#6a6a6a', fontSize: 14 }}>
          Loading staff directory...
        </div>
      </div>
    );
  }

  return (
    <div className="staff-page">
      {/* Header */}
      <div className="staff-head">
        <h1 className="staff-title">Staff</h1>
        <p className="staff-subtitle">
          Availability and skills here drive every AI assignment
        </p>
      </div>

      {/* Filter Row: Segmented Category Tabs & Availability Counts */}
      <div className="staff-filter-row">
        {/* Category Tabs */}
        <div className="staff-seg">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            const count = categoryCounts[cat] ?? 0;
            return (
              <button
                key={cat}
                type="button"
                className={`staff-seg-btn ${isSelected ? 'on' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat} · {count}
              </button>
            );
          })}
        </div>

        {/* Status Legend / Summary */}
        <div className="staff-avail-legend">
          <span className="staff-avail-item">
            <span className="staff-dot avail" />
            <span>Available</span>
            <b>{availCounts.Available ?? 0}</b>
          </span>
          <span className="staff-avail-item">
            <span className="staff-dot busy" />
            <span>Busy</span>
            <b>{availCounts.Busy ?? 0}</b>
          </span>
          <span className="staff-avail-item">
            <span className="staff-dot offline" />
            <span>Offline</span>
            <b>{availCounts.Offline ?? 0}</b>
          </span>
          <span className="staff-avail-item">
            <span className="staff-dot leave" />
            <span>On Leave</span>
            <b>{availCounts['On Leave'] ?? 0}</b>
          </span>
        </div>
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
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="maint-btn sm tertiary"
            onClick={refreshStaff}
            style={{ marginLeft: 'auto' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="staff-panel">
        <div className="staff-table-scroll">
          <table className="staff-table">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Name</th>
                <th style={{ minWidth: 120 }}>Availability</th>
                <th style={{ minWidth: 220 }}>Current task</th>
                <th style={{ minWidth: 200 }}>Skills</th>
                <th style={{ minWidth: 100 }}>Location</th>
                <th style={{ minWidth: 130 }}>Completed today</th>
                <th style={{ minWidth: 140 }}>Workload</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: '#6a6a6a' }}>
                    <Users size={32} style={{ margin: '0 auto 8px auto', color: '#c1c1c1' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#222222' }}>
                      No staff members in {activeCategory}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const initials = s.name
                    ? s.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'ST';

                  let dotClass = 'offline';
                  if (s.availability === 'Available') dotClass = 'avail';
                  else if (s.availability === 'Busy') dotClass = 'busy';
                  else if (s.availability === 'On Leave') dotClass = 'leave';

                  const workloadPct = Math.min(100, s.workload * 25);
                  const workloadColor = s.workload >= 4 ? '#d9772b' : s.workload > 0 ? '#222222' : '#ebebeb';

                  return (
                    <tr
                      key={s.id}
                      className="click"
                      onClick={() => setSelectedStaff(s)}
                    >
                      {/* Name Column */}
                      <td>
                        <div className="staff-person-cell">
                          <div className="staff-avatar">{initials}</div>
                          <div className="staff-person-info">
                            <span className="staff-person-name">{s.name}</span>
                            <span className="staff-person-role">{s.roleLabel}</span>
                          </div>
                        </div>
                      </td>

                      {/* Availability Column */}
                      <td>
                        <span className="staff-avail-badge">
                          <span className={`staff-dot ${dotClass}`} />
                          <span>{s.availability}</span>
                        </span>
                      </td>

                      {/* Current Task Column */}
                      <td>
                        {s.currentTask ? (
                          <div className="staff-task-cell">
                            <span className="staff-task-main">
                              Room <b>{s.currentTask.room}</b> · {s.currentTask.type}
                            </span>
                            <span className="staff-task-sub">{s.currentTask.status}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#6a6a6a' }}>—</span>
                        )}
                      </td>

                      {/* Skills Column */}
                      <td>
                        <div className="staff-skills-wrap">
                          {s.skills && s.skills.length > 0 ? (
                            s.skills.map((sk) => (
                              <span key={sk} className="staff-skill-pill">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="staff-skill-pill">General</span>
                          )}
                        </div>
                      </td>

                      {/* Location Column */}
                      <td style={{ color: '#222222' }}>{s.location}</td>

                      {/* Completed Today Column */}
                      <td style={{ fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {s.completedToday}
                      </td>

                      {/* Workload Column */}
                      <td>
                        <div className="staff-workload-cell">
                          <div className="staff-workload-track">
                            <div
                              className="staff-workload-fill"
                              style={{
                                width: s.workload > 0 ? `${workloadPct}%` : '0%',
                                background: workloadColor,
                              }}
                            />
                          </div>
                          <span className="staff-workload-count">{s.workload}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Detail Drawer */}
      {selectedStaff && (
        <StaffDrawer
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  );
}
