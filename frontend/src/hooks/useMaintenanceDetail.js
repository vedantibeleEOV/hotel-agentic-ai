import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook for Maintenance Issue Detail, live 10-second polling, and action execution.
 */
export function useMaintenanceDetail(incidentId, onRefreshParent) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchDetail = useCallback(async (isInitial = false) => {
    if (!incidentId) return;
    if (isInitial) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await hotelApi.getMaintenanceDetail(incidentId);
      setDetail(res);
    } catch (err) {
      console.error('Failed to load maintenance detail:', err);
      setError(err.message || 'Unable to load incident details');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    fetchDetail(true);
  }, [fetchDetail]);

  // 10-second polling with cleanup
  useEffect(() => {
    if (!incidentId) return;
    const interval = setInterval(() => {
      fetchDetail(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchDetail, incidentId]);

  // Execute Action Helper
  const executeAction = useCallback(async (actionFn) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await actionFn();
      if (updated && updated.id) {
        setDetail(updated);
      } else {
        await fetchDetail(false);
      }
      if (onRefreshParent) {
        onRefreshParent();
      }
      return true;
    } catch (err) {
      console.error('Action failed:', err);
      setActionError(err.message || 'Action failed to execute');
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [fetchDetail, onRefreshParent]);

  // Action: Start Repair
  const startRepair = useCallback(async () => {
    if (!detail?.task_id) throw new Error('Task ID missing');
    return executeAction(() => hotelApi.startTask(detail.task_id));
  }, [detail, executeAction]);

  // Action: Mark Resolved
  const markResolved = useCallback(async (notes = null) => {
    return executeAction(() => hotelApi.resolveMaintenance(incidentId, { notes }));
  }, [incidentId, executeAction]);

  // Action: Block / Put on hold
  const blockIssue = useCallback(async (reason = 'Needs parts or trade') => {
    if (!detail?.task_id) throw new Error('Task ID missing');
    return executeAction(() => hotelApi.blockTask(detail.task_id, reason));
  }, [detail, executeAction]);

  // Action: Escalate
  const escalateIssue = useCallback(async (note = 'Technician requested escalation') => {
    if (!detail?.task_id) throw new Error('Task ID missing');
    return executeAction(() => hotelApi.escalateTask(detail.task_id, note));
  }, [detail, executeAction]);

  // Action: Reassign Technician
  const reassignTechnician = useCallback(async (staffId) => {
    if (!detail?.task_id) throw new Error('Task ID missing');
    return executeAction(async () => {
      await hotelApi.reassignTask(detail.task_id, staffId);
      return hotelApi.getMaintenanceDetail(incidentId);
    });
  }, [detail, incidentId, executeAction]);

  // Action: Override Classification
  const overrideClassification = useCallback(async (category, severity, reason) => {
    return executeAction(() =>
      hotelApi.overrideClassification(incidentId, { category, severity, reason })
    );
  }, [incidentId, executeAction]);

  return {
    detail,
    header: detail?.header || null,
    alert: detail?.alert || null,
    reportedProblem: detail?.reported_problem || '',
    aiDecision: detail?.ai_decision || null,
    sla: detail?.sla || null,
    technician: detail?.technician || null,
    auditTrail: detail?.audit_trail || [],
    allowedActions: detail?.allowed_actions || [],
    loading,
    error,
    actionLoading,
    actionError,
    setActionError,
    refreshDetail: () => fetchDetail(true),
    startRepair,
    markResolved,
    blockIssue,
    escalateIssue,
    reassignTechnician,
    overrideClassification,
  };
}
