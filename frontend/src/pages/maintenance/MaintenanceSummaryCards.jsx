import React from 'react';
import {
  AlertCircle,
  Flame,
  AlertTriangle,
  Users,
  Wrench,
  Clock,
  CheckCircle2,
} from 'lucide-react';

/**
 * 7 KPI Summary Cards matching the exact Voyage Ops Prototype layout and data structure.
 * Derives technician counts consistently from the active roster.
 */
export default function MaintenanceSummaryCards({ summary, technicians, onSelectTab }) {
  const openCount = summary?.open_issues ?? '—';
  const critCount = summary?.critical ?? 0;
  const highCount = summary?.high_priority ?? '—';

  // Compute technician metrics directly from the technicians roster for 100% consistency with the panel
  const techAvail = technicians && technicians.length > 0
    ? technicians.filter((t) => (t.availability || t.status || '').toUpperCase() === 'AVAILABLE').length
    : summary?.technicians?.available ?? 0;

  const techBusy = technicians && technicians.length > 0
    ? technicians.filter((t) => (t.availability || t.status || '').toUpperCase() === 'BUSY').length
    : summary?.technicians?.busy ?? 0;

  const techTotal = technicians && technicians.length > 0
    ? technicians.length
    : summary?.technicians?.total ?? 0;

  const slaBreaches = summary?.sla_breaches_today ?? 0;
  const avgMins = summary?.avg_resolution?.minutes;
  const avgText = avgMins !== undefined && avgMins !== null ? `${avgMins}m` : '—';

  return (
    <div className="maint-kgrid">
      {/* 1. Open issues */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <AlertCircle size={15} />
          <span>Open issues</span>
        </div>
        <div className="maint-kcard-val">{openCount}</div>
        <div className="maint-kcard-sub">Active in queue</div>
      </div>

      {/* 2. Critical */}
      <div
        className={`maint-kcard ${critCount > 0 ? 'maint-kcard-crit-alert' : ''} ${
          onSelectTab ? 'clickable' : ''
        }`}
        onClick={() => onSelectTab && onSelectTab('Critical')}
        title={critCount > 0 ? 'Click to filter Critical issues' : ''}
      >
        <div className="maint-kcard-head">
          <Flame size={15} color={critCount > 0 ? '#c13515' : undefined} />
          <span>Critical</span>
        </div>
        <div className="maint-kcard-val">{critCount}</div>
        <div className="maint-kcard-sub">{critCount > 0 ? 'Immediate dispatch' : 'None active'}</div>
      </div>

      {/* 3. High priority */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <AlertTriangle size={15} />
          <span>High priority</span>
        </div>
        <div className="maint-kcard-val">{highCount}</div>
        <div className="maint-kcard-sub">Target 30m SLA</div>
      </div>

      {/* 4. Technicians available */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <Users size={15} />
          <span>Technicians available</span>
        </div>
        <div className="maint-kcard-val">
          {techAvail} of {techTotal}
        </div>
        <div className="maint-kcard-sub">Ready for dispatch</div>
      </div>

      {/* 5. Technicians busy */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <Wrench size={15} />
          <span>Technicians busy</span>
        </div>
        <div className="maint-kcard-val">{techBusy}</div>
        <div className="maint-kcard-sub">In-progress repairs</div>
      </div>

      {/* 6. SLA breaches today */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <Clock size={15} />
          <span>SLA breaches</span>
        </div>
        <div className="maint-kcard-val">{slaBreaches}</div>
        <div className="maint-kcard-sub">Today</div>
      </div>

      {/* 7. Avg. resolution */}
      <div className="maint-kcard">
        <div className="maint-kcard-head">
          <CheckCircle2 size={15} />
          <span>Avg. resolution</span>
        </div>
        <div className="maint-kcard-val">{avgText}</div>
        <div className="maint-kcard-sub">Target 45 min</div>
      </div>
    </div>
  );
}
