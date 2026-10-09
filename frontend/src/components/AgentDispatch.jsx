import React, { useState } from 'react';
import { LogOut, Wrench, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export default function AgentDispatch({ onCheckout, onMaintenance, isSubmitting }) {
  // Checkout Form state
  const [checkoutData, setCheckoutData] = useState({
    property_id: 1,
    reservation_id: '',
    room_id: 1,
    guest_id: 101,
    checkout_time: new Date().toISOString(),
  });

  // Maintenance Form state
  const [maintenanceData, setMaintenanceData] = useState({
    property_id: 1,
    room_id: 1,
    description: 'Air conditioner blowing warm air and making noise in room 405',
    reported_by_staff_id: 201,
  });

  const [checkoutResult, setCheckoutResult] = useState(null);
  const [maintenanceResult, setMaintenanceResult] = useState(null);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutResult(null);
    try {
      const result = await onCheckout({
        ...checkoutData,
        checkout_time: new Date().toISOString(),
      });
      setCheckoutResult(result);
    } catch (err) {
      alert(`Checkout Trigger Error: ${err.message}`);
    }
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    setMaintenanceResult(null);
    try {
      const result = await onMaintenance(maintenanceData);
      setMaintenanceResult(result);
    } catch (err) {
      alert(`Maintenance Report Error: ${err.message}`);
    }
  };

  return (
    <div className="dispatch-grid">
      {/* Checkout Event Trigger */}
      <div className="dispatch-card">
        <div className="dispatch-header">
          <div className="dispatch-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <LogOut size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Trigger Checkout Event</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Orchestrates Room Readiness & Housekeeping agents
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckoutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Room ID</label>
              <input
                type="number"
                value={checkoutData.room_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, room_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reservation ID</label>
              <input
                type="number"
                value={checkoutData.reservation_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, reservation_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Guest ID</label>
              <input
                type="number"
                value={checkoutData.guest_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, guest_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Property ID</label>
              <input
                type="number"
                value={checkoutData.property_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, property_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? <div className="spinner" /> : <Send size={15} />}
            Process Guest Checkout
          </button>
        </form>

        {/* Live Multi-Agent Output */}
        {checkoutResult && (
          <div className="agent-result-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', marginBottom: '6px', fontWeight: '600' }}>
              <CheckCircle2 size={14} /> Agent Pipeline Dispatched Successfully
            </div>
            <div><strong>Processing:</strong> {checkoutResult.processing_status}</div>
            {checkoutResult.room_readiness && (
              <div style={{ marginTop: '4px' }}>
                <strong>Readiness Determination:</strong> {checkoutResult.room_readiness.determination} (Turnaround: {checkoutResult.room_readiness.target_turnaround_minutes}m)
              </div>
            )}
            {checkoutResult.housekeeping && (
              <div style={{ marginTop: '4px' }}>
                <strong>Housekeeping Agent:</strong> Staff #{checkoutResult.housekeeping.assigned_staff_id || 'Queued'} | Priority: {checkoutResult.housekeeping.priority}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Maintenance Issue Trigger */}
      <div className="dispatch-card">
        <div className="dispatch-header">
          <div className="dispatch-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Wrench size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Report Maintenance Issue</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Triggers LLM Classification & Maintenance Agent
            </p>
          </div>
        </div>

        <form onSubmit={handleMaintenanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Room ID</label>
              <input
                type="number"
                value={maintenanceData.room_id}
                onChange={(e) => setMaintenanceData({ ...maintenanceData, room_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reporting Staff ID</label>
              <input
                type="number"
                value={maintenanceData.reported_by_staff_id}
                onChange={(e) => setMaintenanceData({ ...maintenanceData, reported_by_staff_id: parseInt(e.target.value) })}
                className="text-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Issue Description (Natural Language)</label>
            <textarea
              rows={3}
              value={maintenanceData.description}
              onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
              className="text-input"
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-amber"
            style={{ marginTop: '8px' }}
          >
            {isSubmitting ? <div className="spinner" /> : <Sparkles size={15} />}
            Dispatch Maintenance Agent
          </button>
        </form>

        {/* Live Maintenance Output */}
        {maintenanceResult && (
          <div className="agent-result-box" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fde68a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', marginBottom: '6px', fontWeight: '600' }}>
              <CheckCircle2 size={14} /> Maintenance Incident Created
            </div>
            <div><strong>Status:</strong> {maintenanceResult.processing_status}</div>
            {maintenanceResult.maintenance && (
              <div style={{ marginTop: '4px' }}>
                <strong>Assigned Tech:</strong> Staff #{maintenanceResult.maintenance.assigned_staff_id || 'Queued'} | Priority: {maintenanceResult.maintenance.priority}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
