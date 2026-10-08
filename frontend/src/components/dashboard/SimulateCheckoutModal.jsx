import React, { useState } from 'react';
import { LogOut, X, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { hotelApi } from '../../api/hotelApi';
import CheckoutConfirmModal from '../../pages/rooms/CheckoutConfirmModal';

export default function SimulateCheckoutModal({
  isOpen,
  onClose,
  occupiedRooms = [],
  onSuccess,
}) {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setConfirmModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedRoom) return;
    setSubmitting(true);
    setError(null);
    try {
      await hotelApi.processCheckout({
        room_number: String(selectedRoom.room_number || selectedRoom.id),
        guest_name: 'Guest Departure',
      });
      setConfirmModalOpen(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to process checkout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
          zIndex: 9998,
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
            maxWidth: '500px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.22)',
            border: '1px solid #ebebeb',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
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
                }}
              >
                <LogOut size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#222222', margin: 0 }}>
                  Simulate Guest Checkout
                </h3>
                <p style={{ fontSize: '12px', color: '#6a6a6a', margin: '3px 0 0 0' }}>
                  Select an occupied room to trigger the autonomous workflow
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6a6a6a',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body: Occupied Rooms Selection */}
          <div style={{ padding: '20px 24px', maxHeight: '380px', overflowY: 'auto' }}>
            {occupiedRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#6a6a6a', fontSize: '13px' }}>
                No rooms are currently OCCUPIED. All rooms are ready or in progress.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6a6a6a', textTransform: 'uppercase' }}>
                  Occupied Rooms ({occupiedRooms.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {occupiedRooms.map((room) => (
                    <button
                      key={room.id || room.room_number}
                      onClick={() => handleSelectRoom(room)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '10px',
                        border: '1.5px solid #dddddd',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#ff385c';
                        e.currentTarget.style.backgroundColor = '#fff8f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#dddddd';
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#222222' }}>
                        {room.room_number}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6a6a6a', marginTop: '2px' }}>
                        Floor {room.floor} · {room.room_type || 'Deluxe'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              backgroundColor: '#fafafa',
              borderTop: '1px solid #ebebeb',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#222222',
                backgroundColor: '#ffffff',
                border: '1px solid #dcdcdc',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Checkout Ticket Modal */}
      {confirmModalOpen && selectedRoom && (
        <CheckoutConfirmModal
          room={selectedRoom}
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={handleConfirmCheckout}
          loading={submitting}
          error={error}
        />
      )}
    </>
  );
}
