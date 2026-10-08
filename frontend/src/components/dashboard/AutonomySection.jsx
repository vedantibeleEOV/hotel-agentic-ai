import React from 'react';
import { Sparkles, Shield, Clock, AlertCircle } from 'lucide-react';

export default function AutonomySection({ autonomy = {} }) {
  const pct = autonomy.percentage ?? 96;
  const aiCount = autonomy.ai_tasks_count ?? 0;
  const totalCount = autonomy.total_tasks_count ?? 0;
  const overrides = autonomy.human_overrides ?? 0;
  const avgSeconds = autonomy.avg_assign_seconds ?? 8;
  const escalations = autonomy.escalations_open ?? 0;
  const statusMsg = autonomy.processing_status || 'All agents idle, listening for events';

  return (
    <div className="db-panel flex flex-col justify-between">
      <div>
        <div className="db-panel-header">
          <div>
            <h3 className="db-panel-title">
              <Sparkles size={16} className="text-[#4f46e5]" />
              <span>Autonomy today</span>
            </h3>
            <p className="db-panel-subtitle">How much ran without a person</p>
          </div>
        </div>

        {/* Big percentage & bar */}
        <div className="db-autonomy-pct-box">
          <span className="db-autonomy-pct">{pct}%</span>
          <span className="text-xs text-[#6a6a6a] font-medium">
            {totalCount > 0 ? `${aiCount} of ${totalCount} tasks assigned by agents` : 'Tasks assigned by agents'}
          </span>
        </div>

        <div className="db-autonomy-bar">
          <div className="db-autonomy-fill" style={{ width: `${Math.min(100, Math.max(5, pct))}%` }} />
        </div>

        {/* Metric rows */}
        <div className="divide-y divide-[#ebebeb]">
          <div className="db-autonomy-stat-row">
            <span className="db-autonomy-stat-label">Human overrides</span>
            <span className="db-autonomy-stat-val">{overrides}</span>
          </div>

          <div className="db-autonomy-stat-row">
            <span className="db-autonomy-stat-label">Avg. time to assign</span>
            <span className="db-autonomy-stat-val">{avgSeconds} sec</span>
          </div>

          <div className="db-autonomy-stat-row">
            <span className="db-autonomy-stat-label">Escalations open</span>
            <span className={`db-autonomy-stat-val ${escalations > 0 ? 'text-[#c13515]' : ''}`}>
              {escalations}
            </span>
          </div>
        </div>
      </div>

      {/* Processing indicator */}
      <div className="db-autonomy-status-box">
        <div className="text-xs font-bold text-[#222222] mb-1">Processing now</div>
        <div className="flex items-center gap-2 text-xs text-[#6a6a6a]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="truncate">{statusMsg}</span>
        </div>
      </div>
    </div>
  );
}
