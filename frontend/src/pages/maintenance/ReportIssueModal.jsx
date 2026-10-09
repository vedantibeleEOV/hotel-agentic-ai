import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, AlertCircle, ShieldAlert, User } from 'lucide-react';
import { hotelApi } from '../../api/hotelApi';
import { useAuth } from '../../context/AuthContext';

/**
 * Report Issue Modal
 * Automatically uses the logged-in user as the reporter.
 * Rendered with React createPortal directly into document.body for perfect viewport centering.
 */
export default function ReportIssueModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Lock body scroll while open and restore on close/unmount
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const isHousekeeping = (user?.role || '').toUpperCase() === 'HOUSEKEEPING';

        if (isHousekeeping) {
          // Fetch open tasks for this housekeeper
          const [roomsRes, tasksRes] = await Promise.all([
            hotelApi.getRooms(),
            hotelApi.getTasks({ staff_id: user?.staff_id, status_group: 'open' }),
          ]);

          if (mounted) {
            const allRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];
            const staffTasks = Array.isArray(tasksRes) ? tasksRes : tasksRes.tasks || [];
            const assignedRoomIds = new Set(staffTasks.map((t) => t.room_id));

            const eligibleRooms = allRooms.filter((r) => assignedRoomIds.has(r.id));
            setRooms(eligibleRooms);

            if (eligibleRooms.length > 0) {
              setRoomId(eligibleRooms[0].id);
            } else {
              setRoomId('');
            }
          }
        } else {
          // Manager, Supervisor, Maintenance can report for any room
          const roomsRes = await hotelApi.getRooms();
          if (mounted) {
            const roomArr = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];
            setRooms(roomArr);
            if (roomArr.length > 0) {
              setRoomId(roomArr[0].id);
            }
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load rooms:', err);
          setError('Failed to load eligible rooms list');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const isHousekeeping = (user?.role || '').toUpperCase() === 'HOUSEKEEPING';
  const hasNoEligibleRooms = isHousekeeping && rooms.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomId) {
      setError('Please select a room');
      return;
    }
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await hotelApi.reportMaintenanceIssue({
        room_id: parseInt(roomId, 10),
        description: description.trim(),
      });
      setDescription('');
      onSuccess && onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to report issue:', err);
      setError(err.message || 'Failed to submit maintenance issue');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
          border: '1px solid #ebebeb',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="maint-modal-head">
          <h3>Report Maintenance Issue</h3>
          <button
            type="button"
            className="maint-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="maint-modal-body">
            {/* Reporter Profile Indicator */}
            <div className="row g8 small p-2 rounded-xl bg-[#f7f7f7] border border-[#ebebeb]">
              <User size={15} className="text-[#6a6a6a]" />
              <span>
                Reporting as: <b>{user?.name || 'Staff User'}</b> ({user?.role || 'Staff'})
              </span>
            </div>

            {error && (
              <div className="maint-error-banner">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {hasNoEligibleRooms && !loading && (
              <div className="alert warn small" style={{ marginTop: 4 }}>
                <ShieldAlert size={16} />
                <span>
                  You do not have any open cleaning tasks assigned right now. Housekeeping attendants may only report issues for rooms currently assigned to them.
                </span>
              </div>
            )}

            {/* Room Select */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-room-select">
                Room {isHousekeeping && '(Your Assigned Cleaning Tasks)'}
              </label>
              <select
                id="maint-room-select"
                className="maint-select"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={loading || submitting || hasNoEligibleRooms}
                required
              >
                {rooms.length === 0 && <option value="">No eligible rooms found</option>}
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_type || r.type || 'Standard'} (Floor {r.floor || '—'})
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-desc-input">
                Problem Description
              </label>
              <textarea
                id="maint-desc-input"
                className="maint-textarea"
                rows={3}
                placeholder="Describe what is broken or needed (e.g. AC unit is blowing warm air and making a loud rattling noise)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting || hasNoEligibleRooms}
                required
              />
            </div>
          </div>

          <div className="maint-modal-footer">
            <button
              type="button"
              className="maint-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="maint-btn primary"
              disabled={submitting || loading || hasNoEligibleRooms}
            >
              <Plus size={15} />
              <span>{submitting ? 'Submitting...' : 'Report Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
