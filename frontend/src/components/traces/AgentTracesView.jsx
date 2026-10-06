import React, { useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { Activity, Cpu, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, Zap } from 'lucide-react';

export default function AgentTracesView() {
  const { traces } = useHotel();
  const [expandedTraceId, setExpandedTraceId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedTraceId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Activity className="text-[#ff385c]" size={22} /> Autonomous Agent Traces
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-Time Multi-Agent Flow Pipeline & Decision Audit Logs
          </p>
        </div>
      </div>

      {/* Visual Agent Pipeline Workflow */}
      <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-widest text-rose-400 flex items-center gap-2">
          <Cpu size={16} /> Autonomous Event Flow Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Node 1 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] font-mono text-rose-400 font-bold uppercase">1. Event Trigger</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Zap size={14} className="text-rose-400" /> Checkout Event
            </div>
            <p className="text-[11px] text-neutral-400">Payload received from PMS / API</p>
          </div>

          {/* Node 2 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] font-mono text-blue-400 font-bold uppercase">2. Orchestrator</div>
            <div className="text-sm font-bold text-white">Operations Orchestrator</div>
            <p className="text-[11px] text-neutral-400">Routes to turnaround workflow</p>
          </div>

          {/* Node 3 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">3. Priority Evaluator</div>
            <div className="text-sm font-bold text-white">Room Readiness Agent</div>
            <p className="text-[11px] text-neutral-400">Calculates SLA & VIP priority score</p>
          </div>

          {/* Node 4 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">4. Task Dispatcher</div>
            <div className="text-sm font-bold text-white">Housekeeping / Maintenance</div>
            <p className="text-[11px] text-neutral-400">Assigns staff by floor & workload</p>
          </div>
        </div>
      </div>

      {/* Execution Audit Log List */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Execution Audit Logs ({traces.length})</h3>
          <span className="text-xs text-gray-400 font-mono">Live Event Stream</span>
        </div>

        {traces.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm font-semibold text-gray-600">No Execution Traces Recorded</p>
            <p className="text-xs text-gray-400 mt-1">Trigger a checkout event to see live multi-agent execution traces.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {traces.map((trace) => {
              const isExpanded = expandedTraceId === trace.id;
              return (
                <div
                  key={trace.id}
                  className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50 hover:border-gray-200 transition-all"
                >
                  <div
                    onClick={() => toggleExpand(trace.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-[#ff385c]">{trace.agent}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-bold text-gray-800">{trace.action}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{trace.details}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <span className="text-[10px] font-mono text-gray-400">{trace.timestamp}</span>
                      <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                        {trace.status}
                      </span>
                    </div>
                  </div>

                  {isExpanded && trace.payload && (
                    <div className="p-4 bg-neutral-900 text-emerald-400 border-t border-gray-800 font-mono text-xs overflow-x-auto">
                      <div className="text-[10px] text-neutral-400 uppercase font-bold mb-1">Payload Data:</div>
                      <pre>{JSON.stringify(trace.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
