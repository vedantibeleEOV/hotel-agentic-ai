import React, { useEffect } from 'react';
import { LogOut, X, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Checkout Confirm Modal Component (Checkout Ticket)
 * Perfectly centered in the middle of the viewport with clean Voyage Ops styling.
 */
export default function CheckoutConfirmModal({
  room,
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) {
  if (!isOpen || !room) return null;

  const roomNumber = room.room_number || room.id;

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={() => {
        if (!loading) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
          border: '1px solid #ebebeb',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #ebebeb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#fde9e5',
                color: '#ff385c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LogOut size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#222222',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Checkout Ticket — Room {roomNumber}
              </h3>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6a6a6a',
                  margin: '4px 0 0 0',
                }}
              >
                Floor {room.floor} · {room.room_type || 'Deluxe'} Room
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: '#6a6a6a',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p
            style={{
              fontSize: '14px',
              color: '#333333',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Confirm guest departure for <b>Room {roomNumber}</b>. This will initiate autonomous room turnaround.
          </p>

          {/* Ticket Information Card */}
          <div
            style={{
              backgroundColor: '#f9f9fb',
              border: '1px solid #e8e8ed',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6a6a6a' }}>Current Status:</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: '#fef3eb',
                  color: '#a8430a',
                  fontWeight: 600,
                  fontSize: '11px',
                }}
              >
                OCCUPIED
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6a6a6a' }}>Next Room Status:</span>
              <span style={{ fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                CLEANING <ArrowRight size={12} />
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6a6a6a' }}>AI Automated Task:</span>
              <span style={{ fontWeight: 600, color: '#222222', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} style={{ color: '#6366f1' }} /> Housekeeping Cleaning Task
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#e11d48' }} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '16px 24px',
            backgroundColor: '#fafafa',
            borderTop: '1px solid #ebebeb',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#222222',
              backgroundColor: '#ffffff',
              border: '1px solid #dcdcdc',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              backgroundColor: '#ff385c',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 2px 6px rgba(255, 56, 92, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Checking out...</span>
              </>
            ) : (
              <>
                <LogOut size={14} strokeWidth={2.5} />
                <span>Check out Room {roomNumber}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

