import React from 'react';
import {
  Brush,
  Users,
  RefreshCw,
  Check,
  Clock,
  Star,
} from 'lucide-react';

/**
 * 6 KPI Summary Cards matching the prototype
 */
export default function SummaryCards({ summary }) {
  const workloadTotal = summary?.todays_workload?.total ?? 0;
  const workloadOpen = summary?.todays_workload?.still_open ?? 0;

  const cleanersAvail = summary?.available_cleaners?.available ?? 0;
  const cleanersBusy = summary?.available_cleaners?.busy ?? 0;
  const cleanersOff = summary?.available_cleaners?.off ?? 0;

  const inProgressTotal = summary?.in_progress?.total ?? 0;
  const awaitingInspection = summary?.in_progress?.awaiting_inspection ?? 0;

  const completedToday = summary?.completed_today ?? 0;

  const overdueCount = summary?.overdue?.count ?? 0;
  const overdueRooms = Array.isArray(summary?.overdue?.rooms) ? summary.overdue.rooms : [];
  const overdueSub =
    overdueCount > 0
      ? overdueRooms.map((r) => `Room ${r}`).join(', ')
      : 'All on time';

  const priorityCount = summary?.priority_rooms?.count ?? 0;

  const cards = [
    {
      label: "Today's workload",
      icon: Brush,
      value: workloadTotal,
      sub: `${workloadOpen} still open`,
      tone: null,
    },
    {
      label: 'Available cleaners',
      icon: Users,
      value: cleanersAvail,
      sub: `${cleanersBusy} busy · ${cleanersOff} off`,
      tone: null,
    },
    {
      label: 'In progress',
      icon: RefreshCw,
      value: inProgressTotal,
      sub: `${awaitingInspection} awaiting inspection`,
      tone: null,
    },
    {
      label: 'Completed',
      icon: Check,
      value: completedToday,
      sub: 'Rooms turned today',
      tone: 'ok',
    },
    {
      label: 'Overdue',
      icon: Clock,
      value: overdueCount,
      sub: overdueSub,
      tone: overdueCount > 0 ? 'crit' : 'ok',
    },
    {
      label: 'Priority rooms',
      icon: Star,
      value: priorityCount,
      sub: 'VIP or arriving within 2h',
      tone: 'high',
    },
  ];

  return (
    <div className="hk-kgrid">
      {cards.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div key={idx} className={`hk-kpi-card ${kpi.tone ? `tone-${kpi.tone}` : ''}`}>
            <div className="hk-kpi-header">
              <span className="hk-kpi-label">{kpi.label}</span>
              <span className="hk-kpi-icon-wrap">
                <Icon size={16} strokeWidth={2.2} />
              </span>
            </div>
            <div className="hk-kpi-value">{kpi.value}</div>
            <div className="hk-kpi-sub">{kpi.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
