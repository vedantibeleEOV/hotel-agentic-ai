import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import { hotelApi } from '../../api/hotelApi';

/**
 * Report Issue Modal
 * Fetches real rooms and real staff from the backend API.
 */
export default function ReportIssueModal({ isOpen, onClose, onSuccess }) {
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [roomsRes, staffRes] = await Promise.all([
          hotelApi.getRooms(),
          hotelApi.getStaff(),
        ]);
        if (mounted) {
          const roomArr = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];
          setRooms(roomArr);
          if (roomArr.length > 0 && !roomId) {
            setRoomId(roomArr[0].id);
          }

          const staffArr = Array.isArray(staffRes) ? staffRes : staffRes.staff || [];
          setStaffList(staffArr);
          if (staffArr.length > 0 && !staffId) {
            setStaffId(staffArr[0].id);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load rooms or staff:', err);
          setError('Failed to load rooms or staff list');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

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
        reported_by_staff_id: staffId ? parseInt(staffId, 10) : null,
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

  return (
    <div className="maint-modal-scrim" onClick={onClose}>
      <div
        className="maint-modal-card"
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
            {error && (
              <div className="maint-error-banner">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Room Select */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-room-select">
                Room
              </label>
              <select
                id="maint-room-select"
                className="maint-select"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={loading || submitting}
                required
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.room_type || r.type || 'Standard'} (Floor {r.floor || '—'})
                  </option>
                ))}
              </select>
            </div>

            {/* Reported By Staff Select */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-staff-select">
                Reported by
              </label>
              <select
                id="maint-staff-select"
                className="maint-select"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                disabled={loading || submitting}
              >
                {staffList.length === 0 && <option value="">No staff found</option>}
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
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
                disabled={submitting}
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
              disabled={submitting || loading}
            >
              <Plus size={15} />
              <span>{submitting ? 'Submitting...' : 'Report Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
