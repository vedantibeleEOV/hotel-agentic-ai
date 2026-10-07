import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { hotelApi } from '../../api/hotelApi';

/**
 * Reassign Technician Modal
 */
export default function ReassignModal({
  isOpen,
  onClose,
  taskId,
  currentStaffId,
  onSubmit,
}) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadStaff() {
      setLoading(true);
      setError(null);
      try {
        let staffOptions = [];
        if (taskId) {
          try {
            const res = await hotelApi.getAssignableStaff(taskId);
            staffOptions = Array.isArray(res) ? res : res.staff || [];
          } catch (e) {
            console.warn('Assignable staff endpoint fallback to all staff:', e);
          }
        }

        if (staffOptions.length === 0) {
          const allStaff = await hotelApi.getStaff();
          staffOptions = Array.isArray(allStaff) ? allStaff : allStaff.staff || [];
        }

        if (mounted) {
          setStaffList(staffOptions);
          if (staffOptions.length > 0) {
            const defaultId = currentStaffId || staffOptions[0].id;
            setSelectedStaffId(defaultId);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Failed to load assignable staff:', err);
          setError('Failed to load staff list');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStaff();

    return () => {
      mounted = false;
    };
  }, [isOpen, taskId, currentStaffId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setError('Please select a technician');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ok = await onSubmit(parseInt(selectedStaffId, 10));
      if (ok !== false) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to reassign technician:', err);
      setError(err.message || 'Failed to reassign');
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
          <h3>Reassign Technician</h3>
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

            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-reassign-staff">
                Select Technician / Staff
              </label>
              <select
                id="maint-reassign-staff"
                className="maint-select"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                disabled={loading || submitting}
                required
              >
                {staffList.length === 0 && <option value="">No staff available</option>}
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role || 'Staff'}) {s.skills ? `— ${s.skills}` : ''}
                  </option>
                ))}
              </select>
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
              className="maint-btn dark"
              disabled={submitting || loading}
            >
              <RefreshCw size={14} />
              <span>{submitting ? 'Reassigning...' : 'Confirm Reassign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
