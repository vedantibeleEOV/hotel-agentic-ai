import React from 'react';
import { ListTodo, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function StatsCards({ tasks = [] }) {
  const assignedCount = tasks.filter((t) => t?.status === 'ASSIGNED').length;
  const completedCount = tasks.filter((t) => t?.status === 'COMPLETED').length;
  const pendingCount = tasks.filter((t) => t?.status === 'PENDING' || t?.status === 'ON_HOLD').length;
  const totalTasks = tasks.length;

  const stats = [
    {
      label: 'Active Assigned',
      value: assignedCount,
      icon: <ListTodo size={22} color="#38bdf8" />,
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      label: 'Completed Tasks',
      value: completedCount,
      icon: <CheckCircle2 size={22} color="#34d399" />,
      bg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      label: 'Pending / On Hold',
      value: pendingCount,
      icon: <AlertTriangle size={22} color="#fbbf24" />,
      bg: 'rgba(245, 158, 11, 0.12)',
    },
    {
      label: 'Total Operations',
      value: totalTasks,
      icon: <ShieldCheck size={22} color="#a855f7" />,
      bg: 'rgba(168, 85, 247, 0.12)',
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, i) => (
        <div key={i} className="stat-card">
          <div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
          <div className="stat-icon" style={{ backgroundColor: stat.bg }}>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
