import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, Sparkles, User } from 'lucide-react';

// 1. Badge Component for Priority Levels
export const PriorityBadge = ({ level, score }) => {
  const getStyle = (lvl) => {
    switch (String(lvl).toUpperCase()) {
      case 'CRITICAL':
        return { bg: '#fff1f0', border: '#ffa39e', color: '#c13515', icon: <ShieldAlert size={12} /> };
      case 'HIGH':
        return { bg: '#fff7e6', border: '#ffd591', color: '#d46b08', icon: <AlertCircle size={12} /> };
      case 'MEDIUM':
        return { bg: '#e6f7ff', border: '#91caff', color: '#0958d9', icon: <Clock size={12} /> };
      case 'NORMAL':
      case 'LOW':
      default:
        return { bg: '#f6ffed', border: '#b7eb8f', color: '#389e0d', icon: <CheckCircle2 size={12} /> };
    }
  };

  const style = getStyle(level);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all"
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.color }}
    >
      {style.icon}
      <span>{level}</span>
      {score !== undefined && score !== null && (
        <span className="opacity-75 text-[10px] font-mono">({score})</span>
      )}
    </span>
  );
};

// 2. StatusPill Component for Room & Task Statuses
export const StatusPill = ({ status }) => {
  const getStyle = (st) => {
    switch (String(st).toUpperCase()) {
      case 'OCCUPIED':
        return { bg: '#222222', color: '#ffffff', label: 'Occupied' };
      case 'DIRTY':
        return { bg: '#fff1f0', color: '#c13515', label: 'Dirty / Turnaround' };
      case 'CLEANING':
      case 'IN_PROGRESS':
        return { bg: '#e6f7ff', color: '#0958d9', label: 'Cleaning In Progress' };
      case 'INSPECTION':
        return { bg: '#fff7e6', color: '#d46b08', label: 'Pending Inspection' };
      case 'READY':
      case 'COMPLETED':
        return { bg: '#f6ffed', color: '#389e0d', label: 'Clean & Ready' };
      case 'MAINTENANCE':
        return { bg: '#fff0f6', color: '#c41d7f', label: 'Maintenance Underway' };
      case 'WAITING_FOR_STAFF':
      case 'ESCALATED':
        return { bg: '#fff2e8', color: '#d4380d', label: 'Waiting For Staff' };
      default:
        return { bg: '#f5f5f5', color: '#595959', label: status };
    }
  };

  const style = getStyle(status);

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  );
};

// 3. Avatar Component for Staff Profiles
export const StaffAvatar = ({ name, role, activeTasks = 0, isAvailable = true }) => {
  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
  };

  const roleBg = role === 'MAINTENANCE' ? '#722ed1' : role === 'SUPERVISOR' ? '#13c2c2' : '#ff385c';

  return (
    <div className="relative inline-flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
        style={{ backgroundColor: roleBg }}
        title={`${name} (${role})`}
      >
        {getInitials(name)}
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs font-semibold text-gray-900 leading-tight">{name}</span>
        <span className="text-[10px] text-gray-500 capitalize">{role ? role.toLowerCase() : 'Staff'}</span>
      </div>
      <span
        className={`w-2.5 h-2.5 rounded-full border-2 border-white absolute -top-0.5 left-6 ${
          isAvailable ? 'bg-green-500' : 'bg-amber-500'
        }`}
        title={isAvailable ? 'Available' : 'Busy'}
      />
    </div>
  );
};

// 4. Modal Backdrop Container
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-scale-up">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={18} className="text-[#ff385c]" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// 5. Shared Reusable Dark Button Component
export const DarkButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  icon: Icon,
  className = '',
  type = 'button',
  title,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`btn-dark text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
          <span className="text-white font-bold">{loadingText}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={15} className="text-white flex-shrink-0" />}
          <span className="text-white font-semibold inline-flex items-center gap-1.5">{children}</span>
        </>
      )}
    </button>
  );
};

