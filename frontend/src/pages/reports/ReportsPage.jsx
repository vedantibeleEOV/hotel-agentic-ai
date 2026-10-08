import React from 'react';
import { Download, Zap, Network, UserCheck, Clock, CheckCircle2 } from 'lucide-react';
import { useReports } from '../../hooks/useReports';
import '../../styles/reports.css';

/**
 * Vertical Bar Chart Component
 */
function Bars({
  data = [],
  max = null,
  fmt = (v) => v,
  target = null,
  color = '#222',
  h = 160,
  valueType = 'count',
}) {
  // Compute safe dynamic max if not explicitly provided
  const dataMax = Math.max(
    ...data.map((item) => {
      const v1 = typeof (item.v1 ?? item[1]) === 'number' ? item.v1 ?? item[1] : 0;
      const v2 = typeof (item.v2 ?? item[2]) === 'number' ? item.v2 ?? item[2] : 0;
      return v1 + v2;
    }),
    0
  );

  const computedMax = max
    ? Math.max(max, dataMax)
    : target
    ? Math.max(target * 1.3, dataMax * 1.15, 60)
    : Math.max(dataMax * 1.25, 4);

  return (
    <div className="reports-bars-container" style={{ height: h }}>
      {target !== null && target !== undefined && computedMax > 0 && (
        <div
          className="reports-target-line"
          style={{ bottom: `${Math.min(95, Math.max(5, (target / computedMax) * 100))}%` }}
        >
          <span className="reports-target-label">Target {fmt(target)}</span>
        </div>
      )}

      {data.map((item, idx) => {
        const label = item.label || item[0] || '';
        const v1 = item.v1 !== undefined ? item.v1 : item[1];
        const v2 = item.v2 !== undefined ? item.v2 : item[2];

        const hasV1 = typeof v1 === 'number' && !isNaN(v1);
        const hasV2 = typeof v2 === 'number' && !isNaN(v2);

        const v1Height = hasV1 ? Math.min(100, Math.max(0, (v1 / computedMax) * 100)) : 0;
        const v2Height = hasV2 ? Math.min(100, Math.max(0, (v2 / computedMax) * 100)) : 0;

        const isAboveTarget = target !== null && target !== undefined && hasV1 && v1 > target;
        const primaryColor = isAboveTarget ? '#d9772b' : color;

        // Label above the bar
        let displayVal = '';
        if (valueType === 'turnaround') {
          displayVal = hasV1 ? `${v1}m` : '—';
        } else if (valueType === 'completed_overdue') {
          if (hasV1 && v1 > 0 && hasV2 && v2 > 0) {
            displayVal = `${v1}/${v2}`;
          } else if (hasV1 && v1 > 0) {
            displayVal = `${v1}`;
          } else if (hasV2 && v2 > 0) {
            displayVal = `0/${v2}`;
          }
        } else {
          // Automation vs human intervention
          if (hasV1 && v1 > 0 && hasV2 && v2 > 0) {
            displayVal = `${v1}+${v2}`;
          } else if (hasV1 && v1 > 0) {
            displayVal = `${v1}`;
          } else if (hasV2 && v2 > 0) {
            displayVal = `+${v2}`;
          }
        }

        // Hover tooltip
        let tooltip = '';
        if (valueType === 'turnaround') {
          tooltip = `${label}: ${hasV1 ? `${v1} min turnaround` : 'No completed cleanings'}`;
        } else if (valueType === 'completed_overdue') {
          tooltip = `${label}: ${hasV1 ? v1 : 0} completed, ${hasV2 ? v2 : 0} overdue`;
        } else {
          tooltip = `${label}: ${hasV1 ? v1 : 0} AI assigned, ${hasV2 ? v2 : 0} human overrides`;
        }

        return (
          <div key={idx} className="reports-bc">
            <span className="reports-bar-value" title={tooltip}>
              {displayVal}
            </span>
            <div className="reports-bstack" title={tooltip}>
              {/* Secondary bar (e.g. Human intervention / Overdue) */}
              {hasV2 && v2 > 0 && (
                <i style={{ height: `${v2Height}%`, minHeight: '6px', background: '#ff385c' }} />
              )}
              {/* Primary bar (e.g. AI assigned / Turnaround / Completed) */}
              {hasV1 && v1 > 0 && (
                <i style={{ height: `${v1Height}%`, minHeight: '6px', background: primaryColor }} />
              )}
            </div>
            <span className="small muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Horizontal Progress Bar Component
 */
function HBars({ data = [], max = 100, suffix = '%' }) {
  return (
    <div className="reports-hbars">
      {data.map((item, idx) => {
        const label = item.label || item[0];
        const val = item.value !== undefined ? item.value : item[1];
        const customColor = item.color || item[2] || '#222';

        const isValValid = typeof val === 'number' && !isNaN(val);
        const pct = isValValid ? Math.min(100, Math.max(0, (val / max) * 100)) : 0;

        return (
          <div key={idx} className="reports-hbar-item">
            <div className="row small" style={{ justifyContent: 'space-between' }}>
              <span>{label}</span>
              <b className="num">{isValValid ? `${val}${suffix}` : '—'}</b>
            </div>
            <div className="reports-hbar-track">
              {isValValid && (
                <i
                  className="reports-hbar-fill"
                  style={{ width: `${pct}%`, background: customColor }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPage() {
  const {
    range,
    setRange,
    property,
    kpis,
    automationChart,
    turnaroundChart,
    targetTurnaroundMinutes,
    slaByCategory,
    criticalResponses,
    criticalTargetSummary,
    tasksCompletedVsOverdue,
    staffUtilization,
    cleaningDurationByType,
    loading,
    error,
  } = useReports('7d');

  // Format Helpers
  const formatNumber = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString();
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const lines = [];
    lines.push(`Operational Performance Report - ${property.name}, ${property.city}`);
    lines.push(`Range,${range}`);
    lines.push(`Generated At,${new Date().toISOString()}`);
    lines.push('');

    // Summary KPIs
    lines.push('--- SUMMARY KPIS ---');
    lines.push(`Automation Rate,${kpis.automation_rate?.value !== null ? kpis.automation_rate?.value + '%' : '—'}`);
    lines.push(`AI Assigned Tasks,${kpis.ai_assigned_tasks?.value ?? '—'} (Total: ${kpis.ai_assigned_tasks?.total_tasks ?? '—'})`);
    lines.push(`Human Overrides,${kpis.human_overrides?.value ?? '—'}`);
    lines.push(`Avg Response Time,${kpis.avg_response_time?.value ?? '—'}`);
    lines.push(`Avg Resolution Time,${kpis.avg_resolution_time?.value ?? '—'}`);
    lines.push('');

    // Daily Automation
    lines.push('--- AUTOMATION VS HUMAN INTERVENTION ---');
    lines.push('Day,Date,AI Assigned,Human Overrides');
    automationChart.forEach((d) => {
      lines.push(`${d.label},${d.date},${d.ai_tasks},${d.human_tasks}`);
    });
    lines.push('');

    // Daily Turnaround
    lines.push('--- ROOM TURNAROUND TIME ---');
    lines.push('Day,Date,Avg Turnaround Minutes');
    turnaroundChart.forEach((d) => {
      lines.push(`${d.label},${d.date},${d.minutes ?? '—'}`);
    });
    lines.push('');

    // SLA Compliance
    lines.push('--- SLA COMPLIANCE BY CATEGORY ---');
    lines.push('Category,Compliance %,Total Incidents');
    slaByCategory.forEach((s) => {
      lines.push(`${s.category},${s.compliance_pct !== null ? s.compliance_pct + '%' : '—'},${s.total_incidents}`);
    });
    lines.push('');

    // Staff Utilization
    lines.push('--- STAFF UTILIZATION ---');
    lines.push('Staff Name,Role,Utilization %,Task Minutes');
    staffUtilization.forEach((st) => {
      lines.push(`${st.name},${st.role},${st.utilization_pct}%,${st.task_minutes}`);
    });
    lines.push('');

    // Cleaning Duration
    lines.push('--- AVERAGE CLEANING DURATION BY ROOM TYPE ---');
    lines.push('Room Type,Average Duration (min),Standard (min)');
    cleaningDurationByType.forEach((c) => {
      lines.push(`${c.room_type},${c.avg_duration_minutes ?? '—'},${c.standard_minutes ?? '—'}`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `voyage_ops_report_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Convert chart datasets for Bars
  const automationBarsData = automationChart.map((d) => [d.label, d.ai_tasks, d.human_tasks]);
  const turnaroundBarsData = turnaroundChart.map((d) => [d.label, d.minutes]);
  const completedVsOverdueBarsData = tasksCompletedVsOverdue.map((d) => [d.label, d.completed, d.overdue]);

  // Convert for HBars
  const slaHBarsData = slaByCategory.map((s) => [s.category, s.compliance_pct, s.color]);
  const staffHBarsData = staffUtilization.map((st) => [st.name, st.utilization_pct, st.color]);

  return (
    <div className="page reports-page">
      {/* 1. Header with Range Selector & Export CTA */}
      <div className="phead" style={{ padding: '0 0 8px 0' }}>
        <div>
          <h1 className="pt">Reports</h1>
          <p className="small muted" style={{ marginTop: 4 }}>
            {property.name}, {property.city} · operational performance
          </p>
        </div>

        <div className="reports-header-actions">
          {/* Segmented Range Control */}
          <div className="seg">
            <button
              className={range === 'today' ? 'on' : ''}
              onClick={() => setRange('today')}
              type="button"
            >
              Today
            </button>
            <button
              className={range === '7d' ? 'on' : ''}
              onClick={() => setRange('7d')}
              type="button"
            >
              7 days
            </button>
            <button
              className={range === '30d' ? 'on' : ''}
              onClick={() => setRange('30d')}
              type="button"
            >
              30 days
            </button>
          </div>

          {/* Export Button */}
          <button
            className="reports-export-btn"
            onClick={handleExportCSV}
            type="button"
            title="Download CSV Report"
          >
            <Download size={15} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert warn">
          <span>{error}</span>
        </div>
      )}

      {/* 2. Five KPI Cards */}
      <div className="reports-kgrid">
        {/* KPI 1: Automation rate */}
        <div className="skcard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Automation rate</span>
            <Zap size={16} className="muted" />
          </div>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.automation_rate?.value !== null && kpis.automation_rate?.value !== undefined
              ? `${kpis.automation_rate.value}%`
              : '—'}
          </span>
          <span
            className="small"
            style={{
              color:
                kpis.automation_rate?.tone === 'ok'
                  ? '#17693f'
                  : kpis.automation_rate?.tone === 'warn'
                  ? '#c13515'
                  : 'var(--color-muted)',
            }}
          >
            {kpis.automation_rate?.subtext || '—'}
          </span>
        </div>

        {/* KPI 2: AI assigned tasks */}
        <div className="skcard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">AI assigned tasks</span>
            <Network size={16} className="muted" />
          </div>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            {formatNumber(kpis.ai_assigned_tasks?.value)}
          </span>
          <span className="small muted">{kpis.ai_assigned_tasks?.subtext || '0 tasks'}</span>
        </div>

        {/* KPI 3: Human overrides */}
        <div className="skcard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Human overrides</span>
            <UserCheck size={16} className="muted" />
          </div>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            {formatNumber(kpis.human_overrides?.value)}
          </span>
          <span className="small muted">{kpis.human_overrides?.subtext || '0 overrides'}</span>
        </div>

        {/* KPI 4: Avg. response time */}
        <div className="skcard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Avg. response time</span>
            <Clock size={16} className="muted" />
          </div>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.avg_response_time?.value || '—'}
          </span>
          <span className="small muted">{kpis.avg_response_time?.subtext || 'Report → technician on site'}</span>
        </div>

        {/* KPI 5: Avg. resolution time */}
        <div className="skcard">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Avg. resolution time</span>
            <CheckCircle2 size={16} className="muted" />
          </div>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            {kpis.avg_resolution_time?.value || '—'}
          </span>
          <span
            className="small"
            style={{
              color:
                kpis.avg_resolution_time?.tone === 'ok'
                  ? '#17693f'
                  : kpis.avg_resolution_time?.tone === 'warn'
                  ? '#c13515'
                  : 'var(--color-muted)',
            }}
          >
            {kpis.avg_resolution_time?.subtext || '—'}
          </span>
        </div>
      </div>

      {/* 3. Operational Performance Grid (6 Panels in 2 columns) */}
      <div className="g2">
        {/* Panel 1: Automation vs human intervention */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Automation vs human intervention
            </h3>
            <span className="small muted">
              Tasks per day · dark = assigned by agents, red = needed a person
            </span>
          </div>
          <Bars data={automationBarsData} h={160} valueType="automation" />
        </div>

        {/* Panel 2: Room turnaround time */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Room turnaround time
            </h3>
            <span className="small muted">Checkout to Ready, average minutes</span>
          </div>
          <Bars
            data={turnaroundBarsData}
            target={targetTurnaroundMinutes}
            fmt={(v) => `${v} min`}
            h={160}
            valueType="turnaround"
          />
        </div>

        {/* Panel 3: SLA compliance by category */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              SLA compliance by category
            </h3>
            <span className="small muted">Issues resolved within SLA</span>
          </div>
          {slaHBarsData.length > 0 ? (
            <HBars data={slaHBarsData} max={100} suffix="%" />
          ) : (
            <div className="empty" style={{ padding: '24px 0' }}>
              <span className="small muted">No incidents recorded in this period</span>
            </div>
          )}
        </div>

        {/* Panel 4: Critical issue response */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Critical issue response
            </h3>
            <span className="small muted">Time from report to responder on site</span>
          </div>
          <div className="col g12">
            {criticalResponses.length > 0 ? (
              criticalResponses.map((r, idx) => (
                <div key={idx} className="row g12">
                  <span className="small muted" style={{ width: 44, flexShrink: 0 }}>
                    {r.day_label}
                  </span>
                  <span style={{ flex: 1 }}>
                    Room {r.room_number} · {r.issue}
                  </span>
                  <b className="num">{r.response_time || '—'}</b>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '16px 0' }}>
                <span className="small muted">No critical issues reported in this period</span>
              </div>
            )}
            <div
              className="small muted"
              style={{
                borderTop: '1px solid var(--color-hairline-soft)',
                paddingTop: 10,
                marginTop: 4,
              }}
            >
              Target: responder on site within {criticalTargetSummary.target_minutes} minutes. Met{' '}
              {criticalTargetSummary.met_count} of {criticalTargetSummary.total_count} times in this period.
            </div>
          </div>
        </div>

        {/* Panel 5: Tasks completed vs overdue */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Tasks completed vs overdue
            </h3>
            <span className="small muted">Per day</span>
          </div>
          <Bars data={completedVsOverdueBarsData} h={160} valueType="completed_overdue" />
          <div className="row g16 small muted" style={{ marginTop: 12 }}>
            <span className="row g6">
              <span className="reports-swatch" style={{ background: '#222' }} />
              Completed
            </span>
            <span className="row g6">
              <span className="reports-swatch" style={{ background: '#ff385c' }} />
              Overdue
            </span>
          </div>
        </div>

        {/* Panel 6: Staff utilization */}
        <div className="skcard" style={{ padding: 20 }}>
          <div className="col g4" style={{ marginBottom: 16 }}>
            <h3 className="ptitle" style={{ margin: 0 }}>
              Staff utilization
            </h3>
            <span className="small muted">Share of shift on assigned work</span>
          </div>
          {staffHBarsData.length > 0 ? (
            <HBars data={staffHBarsData} max={100} suffix="%" />
          ) : (
            <div className="empty" style={{ padding: '24px 0' }}>
              <span className="small muted">No staff activity found</span>
            </div>
          )}
          <div
            className="small muted"
            style={{
              borderTop: '1px solid var(--color-hairline-soft)',
              paddingTop: 8,
              marginTop: 12,
              fontStyle: 'italic',
            }}
          >
            Estimated from assigned task time
          </div>
        </div>
      </div>

      {/* 4. Full-width Panel: Average cleaning duration by room type */}
      <div className="skcard" style={{ padding: 20 }}>
        <div className="col g4" style={{ marginBottom: 16 }}>
          <h3 className="ptitle" style={{ margin: 0 }}>
            Average cleaning duration by room type
          </h3>
        </div>
        <div className="reports-duration-grid">
          {cleaningDurationByType.map((r, idx) => (
            <div key={idx} className="reports-duration-card">
              <span className="small muted">{r.room_type}</span>
              <span className="reports-duration-val">
                {r.avg_duration_minutes !== null ? `${r.avg_duration_minutes} min` : '—'}
              </span>
              <span className="small muted">
                {r.standard_minutes !== null ? `Standard ${r.standard_minutes} min` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
