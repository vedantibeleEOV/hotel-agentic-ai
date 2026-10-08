import React from 'react';
import {
  Bed,
  Brush,
  RefreshCw,
  CheckCircle2,
  Wrench,
  Flame,
  Clock,
  Users,
} from 'lucide-react';

export default function DashboardKpiGrid({ kpis = {}, onNavigate }) {
  const cards = [
    {
      key: 'occupied',
      label: 'Occupied',
      icon: Bed,
      value: kpis.occupied?.value ?? '—',
      subtext: kpis.occupied?.subtext || '—',
      tone: kpis.occupied?.tone,
      route: 'rooms',
    },
    {
      key: 'dirty',
      label: 'Dirty',
      icon: Brush,
      value: kpis.dirty?.value ?? '—',
      subtext: kpis.dirty?.subtext || '—',
      tone: kpis.dirty?.tone,
      route: 'housekeeping',
    },
    {
      key: 'cleaning',
      label: 'Cleaning',
      icon: RefreshCw,
      value: kpis.cleaning?.value ?? '—',
      subtext: kpis.cleaning?.subtext || '—',
      tone: kpis.cleaning?.tone,
      route: 'housekeeping',
    },
    {
      key: 'ready',
      label: 'Ready',
      icon: CheckCircle2,
      value: kpis.ready?.value ?? '—',
      subtext: kpis.ready?.subtext || '—',
      tone: kpis.ready?.tone,
      route: 'rooms',
    },
    {
      key: 'maintenance',
      label: 'Maintenance issues',
      icon: Wrench,
      value: kpis.maintenance?.value ?? '—',
      subtext: kpis.maintenance?.subtext || '—',
      tone: kpis.maintenance?.tone,
      route: 'maintenance',
    },
    {
      key: 'critical_issues',
      label: 'Critical issues',
      icon: Flame,
      value: kpis.critical_issues?.value ?? '—',
      subtext: kpis.critical_issues?.subtext || 'None right now',
      alert: (kpis.critical_issues?.value ?? 0) > 0,
      tone: kpis.critical_issues?.tone,
      route: 'maintenance',
    },
    {
      key: 'overdue',
      label: 'Overdue tasks',
      icon: Clock,
      value: kpis.overdue?.value ?? '—',
      subtext: kpis.overdue?.subtext || 'All on time',
      tone: kpis.overdue?.tone,
      route: 'tasks',
    },
    {
      key: 'available_staff',
      label: 'Available staff',
      icon: Users,
      value: kpis.available_staff?.value ?? '—',
      subtext: kpis.available_staff?.subtext || '—',
      tone: kpis.available_staff?.tone,
      route: 'staff',
    },
  ];

  return (
    <div className="db-kpi-grid">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            onClick={() => onNavigate && onNavigate(c.route)}
            className={`db-kpi-card ${c.alert ? 'alert' : ''}`}
          >
            <div className="db-kpi-top">
              <span>{c.label}</span>
              <Icon size={14} className={c.alert ? 'text-[#c13515]' : 'text-[#6a6a6a]'} />
            </div>
            <div>
              <div className="db-kpi-val">{c.value}</div>
              <div className={`db-kpi-sub ${c.tone || ''}`}>{c.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
