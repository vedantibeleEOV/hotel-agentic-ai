import React, { useState } from 'react';
import { X, Edit3, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'FURNITURE',
  'SAFETY',
  'COSMETIC',
  'OTHER',
];

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Override Classification Modal
 */
export default function OverrideModal({
  isOpen,
  onClose,
  currentCategory = 'PLUMBING',
  currentSeverity = 'MEDIUM',
  onSubmit,
}) {
  const [category, setCategory] = useState(currentCategory);
  const [severity, setSeverity] = useState(currentSeverity);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the override');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const ok = await onSubmit(category, severity, reason.trim());
      if (ok !== false) {
        onClose();
      }
    } catch (err) {
      console.error('Failed to override classification:', err);
      setError(err.message || 'Failed to submit override');
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
          <h3>Override AI Classification</h3>
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

            {/* Category Select */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-override-category">
                Category
              </label>
              <select
                id="maint-override-category"
                className="maint-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Select */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-override-severity">
                Severity Level
              </label>
              <select
                id="maint-override-severity"
                className="maint-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                disabled={submitting}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason Text */}
            <div className="maint-form-group">
              <label className="maint-form-label" htmlFor="maint-override-reason">
                Reason for Override
              </label>
              <textarea
                id="maint-override-reason"
                className="maint-textarea"
                rows={3}
                placeholder="Explain why the classification or severity is being modified..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
              className="maint-btn dark"
              disabled={submitting}
            >
              <Edit3 size={14} />
              <span>{submitting ? 'Applying...' : 'Apply Override'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
