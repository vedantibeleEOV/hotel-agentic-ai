import React from 'react';
import {
  Flame,
  Wrench,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function NeedsAttentionSection({ items = [], onNavigate }) {
  const handleAction = (item) => {
    if (item.action_type === 'open_issue' || item.action_type === 'assign_technician') {
      onNavigate && onNavigate('maintenance');
    } else if (item.action_type === 'reassign_task') {
      onNavigate && onNavigate('housekeeping');
    } else if (item.action_type === 'view_task') {
      onNavigate && onNavigate('tasks');
    } else {
      onNavigate && onNavigate('maintenance');
    }
  };

  return (
    <div className="db-panel">
      <div className="db-panel-header">
        <div>
          <h3 className="db-panel-title">
            <span>Needs attention</span>
            {items.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-700">
                {items.length}
              </span>
            )}
          </h3>
          <p className="db-panel-subtitle">
            Exceptions the agents can't resolve on their own
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={() => onNavigate && onNavigate('maintenance')}
            className="text-xs font-semibold text-[#222222] hover:underline flex items-center gap-1"
          >
            <span>View all</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck size={24} />
          </div>
          <h4 className="text-sm font-bold text-[#222222]">All systems running smoothly</h4>
          <p className="text-xs text-[#6a6a6a] mt-1 max-w-sm">
            No critical incidents, unassigned technicians, or overdue tasks require human intervention.
          </p>
        </div>
      ) : (
        <div className="db-attention-list">
          {items.map((item, idx) => {
            const isCrit = item.level === 0 || (item.severity || '').toUpperCase() === 'CRITICAL';
            const isWarn = item.level === 1;

            return (
              <div
                key={item.id || idx}
                className={`db-attention-item ${isCrit ? 'crit' : isWarn ? 'warn' : 'standard'}`}
              >
                <div className="db-attention-left">
                  <div className={`db-attention-icon ${isCrit ? 'crit' : isWarn ? 'warn' : 'standard'}`}>
                    {isCrit ? (
                      <Flame size={18} />
                    ) : item.type === 'Cleaning' ? (
                      <Clock size={18} />
                    ) : item.type === 'Maintenance' ? (
                      <Wrench size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="db-attention-heading truncate">
                      {item.title}
                    </h4>
                    <p className="db-attention-desc truncate">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="db-attention-right">
                  {item.is_breached && (
                    <span className="db-pill crit">
                      Breached
                    </span>
                  )}

                  <button
                    onClick={() => handleAction(item)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs ${
                      isCrit
                        ? 'bg-[#ff385c] hover:bg-[#e00b41] text-white shadow-xs'
                        : 'bg-white border border-[#c1c1c1] hover:bg-[#f7f7f7] text-[#222222]'
                    }`}
                  >
                    {item.action_label || 'Resolve'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
