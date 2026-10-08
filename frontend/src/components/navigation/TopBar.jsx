import React, { useState, useEffect, useRef } from 'react';
import { useHotel } from '../../context/HotelContext';
import { useAuth } from '../../context/AuthContext';
import { hotelApi } from '../../api/hotelApi';
import {
  Building2,
  Search,
  FlaskConical,
  Bell,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  LogOut,
  User,
} from 'lucide-react';

export default function TopBar() {
  const { simulationActive, setSimulationActive, isOnline, totalRooms, resetSystem, refreshData } = useHotel();
  const { user, logout } = useAuth();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [now, setNow] = useState(new Date());
  const userMenuRef = useRef(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });


  const handleReset = async () => {
    setIsResetting(true);
    try {
      if (resetSystem) {
        await resetSystem();
      } else {
        await hotelApi.resetSystem();
      }
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to reset DB:', err);
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#dddddd] px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left: Hotel Property Selector Dropdown */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-[#dddddd] hover:bg-[#f7f7f7] transition-all text-left group">
          <Building2 size={18} className="text-[#6a6a6a] group-hover:text-[#222222]" />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm text-[#222222]">Voyage Grand</span>
              <ChevronDown size={14} className="text-[#6a6a6a]" />
            </div>
            <p className="text-[11px] text-[#6a6a6a] font-medium leading-none">Pune · {totalRooms ?? 50} rooms</p>
          </div>
        </button>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-[#6a6a6a] pointer-events-none" />
          <input
            type="text"
            placeholder="Search rooms, staff, tasks"
            className="w-full bg-white border border-[#dddddd] rounded-full pl-10 pr-4 py-2 text-xs font-medium text-[#222222] placeholder-[#929292] outline-none focus:border-[#222222] focus:ring-1 focus:ring-[#222222] transition-all"
          />
        </div>
      </div>

      {/* Right: Agent Status, Clock, Simulation Toggle, Notifications, Reset DB & User Avatar */}
      <div className="flex items-center gap-3">
        {/* AI Agents Active Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AI agents active · 4/4</span>
        </div>

        {/* Live Clock & Date */}
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold text-[#222222] font-mono leading-none">{timeStr}</div>
          <div className="text-[11px] text-[#6a6a6a] font-medium mt-0.5">{dateStr}</div>
        </div>

        {/* Simulation Flask Button */}
        <button
          onClick={() => setSimulationActive(!simulationActive)}
          title={simulationActive ? 'Stop Simulation' : 'Start Simulation'}
          className={`p-2 rounded-xl border transition-all ${
            simulationActive
              ? 'bg-rose-50 border-[#ff385c] text-[#ff385c]'
              : 'bg-white border-[#dddddd] text-[#6a6a6a] hover:bg-[#f7f7f7] hover:text-[#222222]'
          }`}
        >
          <FlaskConical size={18} />
        </button>

        {/* Notification Bell Button */}
        <button
          title="Notifications"
          className="relative p-2 rounded-xl border border-[#dddddd] text-[#6a6a6a] hover:bg-[#f7f7f7] hover:text-[#222222] transition-all"
        >
          <Bell size={18} />
        </button>

        {/* Reset DB Button (Testing Only) */}
        <button
          onClick={() => setShowResetConfirm(true)}
          title="Reset database (Testing only)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-xs font-semibold transition-all shadow-2xs"
        >
          <RotateCcw size={14} className={isResetting ? 'animate-spin' : ''} />
          <span>Reset DB</span>
        </button>

        {/* User Profile Pill & Dropdown Menu */}
        <div className="relative pl-2 border-l border-[#ebebeb]" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            type="button"
            className="flex items-center gap-2.5 hover:bg-[#f7f7f7] p-1.5 rounded-xl transition-all cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#222222] text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1">
                <span className="font-bold text-xs text-[#222222]">
                  {user?.name || 'Amit Shah'}
                </span>
                <ChevronDown size={12} className="text-[#6a6a6a]" />
              </div>
              <p className="text-[10px] text-[#6a6a6a] font-medium leading-none">
                {user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Manager'}
              </p>
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-xl border border-[#dddddd] p-2 min-w-[210px] z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-[#ebebeb] mb-1">
                <p className="text-xs font-bold text-[#222222] truncate">{user?.name || 'Staff User'}</p>
                <p className="text-[11px] text-[#6a6a6a] truncate mt-0.5">@{user?.username || 'user'}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-[#f2f2f2] text-[10px] font-bold text-[#222222]">
                  {user?.role || 'STAFF'}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Popup Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs animate-fade-in p-4">
          <div className="bg-white rounded-2xl border border-[#dddddd] shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#222222]">Reset Database?</h3>
                <p className="text-xs text-[#6a6a6a] mt-0.5">Testing action</p>
              </div>
            </div>

            <p className="text-xs text-[#484848] leading-relaxed">
              This will delete all tasks and logs. Continue?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#6a6a6a] hover:bg-[#f2f2f2] hover:text-[#222222] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ff385c] hover:bg-[#e00b41] text-white transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RotateCcw size={13} className="animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset DB</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
