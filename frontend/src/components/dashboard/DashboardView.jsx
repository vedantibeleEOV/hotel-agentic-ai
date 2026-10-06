import React from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  Bed,
  Brush,
  RefreshCw,
  CheckCircle2,
  Wrench,
  Flame,
  Clock,
  Users,
  LogOut,
  Plus,
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export default function DashboardView() {
  const { rooms, staff, traces, metrics, triggerCheckout, setActiveTab, setReportModalOpen } = useHotel();

  const handleOpenReport = () => {
    if (setReportModalOpen) setReportModalOpen(true);
    else setActiveTab('maintenance');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Page Command Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">Command center</h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-0.5 font-medium">
            Voyage Grand, Pune · 9 items need attention
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Simulate Checkout Button */}
          <button
            onClick={() => triggerCheckout(305)}
            className="px-4 py-2 bg-white border border-[#dddddd] hover:bg-[#f7f7f7] text-[#222222] text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shadow-2xs"
          >
            <LogOut size={15} />
            <span>Simulate checkout</span>
          </button>

          {/* Report Issue Button */}
          <button
            onClick={handleOpenReport}
            className="px-4 py-2 bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs active:scale-98"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Report issue</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Row (Grid of 8 Cards matching prototype) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Card 1: Occupied */}
        <div
          onClick={() => setActiveTab('rooms')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Occupied</span>
            <Bed size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">46</span>
            <p className="text-[10px] text-[#6a6a6a] mt-0.5 truncate">1 due out today</p>
          </div>
        </div>

        {/* Card 2: Dirty */}
        <div
          onClick={() => setActiveTab('housekeeping')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Dirty</span>
            <Brush size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">2</span>
            <p className="text-[10px] text-[#6a6a6a] mt-0.5 truncate">0 waiting for attendant</p>
          </div>
        </div>

        {/* Card 3: Cleaning */}
        <div
          onClick={() => setActiveTab('housekeeping')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Cleaning</span>
            <RefreshCw size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">1</span>
            <p className="text-[10px] text-[#a8430a] font-medium mt-0.5 truncate">1 over expected time</p>
          </div>
        </div>

        {/* Card 4: Ready */}
        <div
          onClick={() => setActiveTab('rooms')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Ready</span>
            <CheckCircle2 size={14} className="text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-600">48</span>
            <p className="text-[10px] text-emerald-700 font-medium mt-0.5 truncate">28 held for arrivals</p>
          </div>
        </div>

        {/* Card 5: Maintenance */}
        <div
          onClick={() => setActiveTab('maintenance')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Maintenance</span>
            <Wrench size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">7</span>
            <p className="text-[10px] text-[#6a6a6a] mt-0.5 truncate">2 without technician</p>
          </div>
        </div>

        {/* Card 6: Critical Issues (Highlighted Alert Card) */}
        <div
          onClick={() => setActiveTab('maintenance')}
          className="bg-[#fff8f6] border-2 border-[#c13515] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#c13515]">
            <span className="text-[11px] font-bold truncate">Critical issues</span>
            <Flame size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#c13515]">1</span>
            <p className="text-[10px] text-[#c13515] font-semibold mt-0.5 truncate">Emergency response</p>
          </div>
        </div>

        {/* Card 7: Overdue Tasks */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Overdue tasks</span>
            <Clock size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">9</span>
            <p className="text-[10px] text-[#a8430a] font-medium mt-0.5 truncate">Past SLA or expected</p>
          </div>
        </div>

        {/* Card 8: Available Staff */}
        <div
          onClick={() => setActiveTab('housekeeping')}
          className="bg-white border border-[#dddddd] rounded-xl p-3.5 flex flex-col justify-between hover:shadow-float transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#6a6a6a]">
            <span className="text-[11px] font-medium truncate">Available staff</span>
            <Users size={14} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-[#222222]">9</span>
            <p className="text-[10px] text-[#6a6a6a] mt-0.5 truncate">of 11 on shift</p>
          </div>
        </div>
      </div>

      {/* 3. Main 2-Column Section: Needs Attention & Autonomy Today */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Needs Attention */}
        <div className="lg:col-span-2 bg-white border border-[#dddddd] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#ebebeb] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#222222]">Needs attention</h3>
              <p className="text-xs text-[#6a6a6a] font-medium">
                Exceptions the agents can't resolve on their own
              </p>
            </div>
            <button
              onClick={() => setActiveTab('maintenance')}
              className="text-xs font-semibold text-[#222222] hover:underline"
            >
              View all 9
            </button>
          </div>

          {/* Attention Items List */}
          <div className="space-y-3">
            {/* Item 1: Critical Emergency Row */}
            <div className="p-4 rounded-xl bg-[#fff8f6] border border-[#f6d3cb] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#c13515] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flame size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#c13515] tracking-tight">
                    Critical · Safety / Electrical — Room 305
                  </h4>
                  <p className="text-xs text-[#3f3f3f] mt-0.5">
                    "Burning smell from the wall socket near the desk" · Escalated to manager
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#c13515] text-white">
                  Breached +3:08:26
                </span>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="px-3.5 py-1.5 bg-[#ff385c] hover:bg-[#e00b41] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Open issue
                </button>
              </div>
            </div>

            {/* Item 2: No Technician Available Row */}
            <div className="p-4 rounded-xl bg-[#fffaf6] border border-[#f3c3a2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#fde8da] text-[#a8430a] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Wrench size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222] tracking-tight">
                    No technician available — Room 220
                  </h4>
                  <p className="text-xs text-[#6a6a6a] mt-0.5">
                    Plumbing · "Toilet keeps running and won't stop"
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-[#c13515] text-white">
                  Breached +2:36:26
                </span>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="px-3.5 py-1.5 border border-[#c1c1c1] hover:bg-[#f7f7f7] text-[#222222] text-xs font-semibold rounded-xl transition-all"
                >
                  Assign technician
                </button>
              </div>
            </div>

            {/* Item 3: Cleaning Overdue Row */}
            <div className="p-4 rounded-xl bg-white border border-[#ebebeb] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#dddddd] transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#f2f2f2] text-[#222222] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222] tracking-tight">
                    Cleaning overdue — Room 118
                  </h4>
                  <p className="text-xs text-[#6a6a6a] mt-0.5">
                    HK-2077 · Kavita Jadhav · next guest 12:27
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('housekeeping')}
                className="px-3.5 py-1.5 border border-[#c1c1c1] hover:bg-[#f7f7f7] text-[#222222] text-xs font-semibold rounded-xl transition-all self-end sm:self-center"
              >
                Reassign
              </button>
            </div>

            {/* Item 4: SLA Breached Row */}
            <div className="p-4 rounded-xl bg-white border border-[#ebebeb] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#dddddd] transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#f2f2f2] text-[#222222] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#222222] tracking-tight">
                    SLA breached — Room 520
                  </h4>
                  <p className="text-xs text-[#6a6a6a] mt-0.5">
                    HK-2080 · Sunita Pawar · next guest 13:12
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('housekeeping')}
                className="px-3.5 py-1.5 border border-[#c1c1c1] hover:bg-[#f7f7f7] text-[#222222] text-xs font-semibold rounded-xl transition-all self-end sm:self-center"
              >
                Reassign
              </button>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Autonomy Today */}
        <div className="bg-white border border-[#dddddd] rounded-2xl p-6 shadow-2xs space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-[#ebebeb] pb-4">
              <h3 className="text-lg font-bold text-[#222222]">Autonomy today</h3>
              <p className="text-xs text-[#6a6a6a] font-medium">How much ran without a person</p>
            </div>

            {/* Large Percentage Metric */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-5xl font-black text-[#222222] tracking-tight">96%</span>
                <span className="text-xs text-[#6a6a6a] font-medium">181 of 188 tasks assigned by agents</span>
              </div>
              <div className="w-full h-2.5 bg-[#ebebeb] rounded-full overflow-hidden">
                <div className="h-full bg-[#222222] rounded-full w-[96%]" />
              </div>
            </div>

            {/* Breakdown Stats */}
            <div className="divide-y divide-[#ebebeb] text-sm font-medium">
              <div className="py-2.5 flex justify-between">
                <span className="text-[#6a6a6a]">Human overrides</span>
                <span className="font-bold text-[#222222]">3</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#6a6a6a]">Avg. time to assign</span>
                <span className="font-bold text-[#222222]">8 sec</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#6a6a6a]">Escalations open</span>
                <span className="font-bold text-[#222222]">2</span>
              </div>
            </div>
          </div>

          {/* Bottom Processing Indicator */}
          <div className="bg-[#f7f7f7] rounded-xl p-3.5 border border-[#ebebeb] space-y-1">
            <div className="text-xs font-bold text-[#222222]">Processing now</div>
            <div className="flex items-center gap-2 text-xs text-[#6a6a6a]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All agents idle, listening for events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
