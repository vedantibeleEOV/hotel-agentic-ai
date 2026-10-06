import { useState, useEffect, useCallback, useRef } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Hook to manage task detail state, live auto-refreshing every 10s,
 * staff candidate list, and task actions (start, complete, block, escalate, cancel, reassign, priority).
 */
export function useTaskDetail(taskId, isOpen = true, onTaskUpdated = null) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [assignableStaff, setAssignableStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [error, setError] = useState(null);
  const [actionRunning, setActionRunning] = useState(null); // 'start' | 'complete' | 'block' | 'escalate' | 'cancel' | 'reassign' | 'priority' | null
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch enriched task detail
  const fetchDetail = useCallback(
    async (isInitial = false) => {
      if (!taskId || !isOpen) return;
      if (isInitial) setLoading(true);
      setError(null);

      try {
        const detail = await hotelApi.getTaskDetail(taskId);
        if (isMountedRef.current) {
          setTaskDetail(detail);
        }
      } catch (err) {
        if (isMountedRef.current) {
          console.error('Failed to load task detail:', err);
          setError(err.message || 'Failed to load task detail');
        }
      } finally {
        if (isMountedRef.current && isInitial) {
          setLoading(false);
        }
      }
    },
    [taskId, isOpen]
  );

  // Fetch assignable staff candidates
  const fetchAssignableStaff = useCallback(async () => {
    if (!taskId || !isOpen) return;
    setLoadingStaff(true);
    try {
      const list = await hotelApi.getAssignableStaff(taskId);
      if (isMountedRef.current) {
        setAssignableStaff(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch assignable staff:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingStaff(false);
      }
    }
  }, [taskId, isOpen]);

  // Initial load when taskId or isOpen changes
  useEffect(() => {
    if (taskId && isOpen) {
      fetchDetail(true);
      fetchAssignableStaff();
    } else {
      setTaskDetail(null);
      setAssignableStaff([]);
      setError(null);
      setActionError(null);
      setActionSuccess(null);
    }
  }, [taskId, isOpen, fetchDetail, fetchAssignableStaff]);

  // Auto-refresh every 10 seconds while open
  useEffect(() => {
    if (!taskId || !isOpen) return;

    const interval = setInterval(() => {
      fetchDetail(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [taskId, isOpen, fetchDetail]);

  // Generic action runner
  const runAction = useCallback(
    async (actionName, apiCall, successMsg) => {
      setActionRunning(actionName);
      setActionError(null);
      setActionSuccess(null);

      try {
        const updatedDetail = await apiCall();
        if (isMountedRef.current) {
          if (updatedDetail && typeof updatedDetail === 'object' && updatedDetail.id) {
            setTaskDetail(updatedDetail);
          } else {
            await fetchDetail(false);
          }
          setActionSuccess(successMsg);
          setTimeout(() => {
            if (isMountedRef.current) setActionSuccess(null);
          }, 4000);
        }

        // Notify parent to refresh table and summaries
        if (onTaskUpdated) {
          onTaskUpdated();
        }
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          console.error(`Action ${actionName} failed:`, err);
          setActionError(err.message || `Failed to perform ${actionName}`);
          // Re-fetch detail to synchronize real state and allowed_actions
          fetchDetail(false);
        }
        return false;
      } finally {
        if (isMountedRef.current) {
          setActionRunning(null);
        }
      }
    },
    [fetchDetail, onTaskUpdated]
  );

  const startTask = useCallback(async () => {
    return runAction('start', () => hotelApi.startTask(taskId), 'Task started successfully');
  }, [taskId, runAction]);

  const completeTask = useCallback(async () => {
    return runAction(
      'complete',
      async () => {
        const res = await hotelApi.completeTask(taskId);
        // If complete endpoint returns { message, task, room, assigned_staff }, fetch full detail
        return await hotelApi.getTaskDetail(taskId).catch(() => res.task);
      },
      'Task marked completed'
    );
  }, [taskId, runAction]);

  const blockTask = useCallback(
    async (reason = null) => {
      return runAction('block', () => hotelApi.blockTask(taskId, reason), 'Task marked as blocked');
    },
    [taskId, runAction]
  );

  const escalateTask = useCallback(
    async (note = null) => {
      return runAction('escalate', () => hotelApi.escalateTask(taskId, note), 'Task escalated to supervisor');
    },
    [taskId, runAction]
  );

  const cancelTask = useCallback(async () => {
    return runAction('cancel', () => hotelApi.cancelTask(taskId), 'Task cancelled');
  }, [taskId, runAction]);

  const reassignTask = useCallback(
    async (staffId) => {
      const ok = await runAction(
        'reassign',
        () => hotelApi.reassignTask(taskId, staffId),
        'Task reassigned successfully'
      );
      if (ok) {
        fetchAssignableStaff();
      }
      return ok;
    },
    [taskId, runAction, fetchAssignableStaff]
  );

  const changePriority = useCallback(
    async (priority) => {
      return runAction(
        'priority',
        () => hotelApi.changeTaskPriority(taskId, priority),
        `Priority changed to ${priority}`
      );
    },
    [taskId, runAction]
  );

  return {
    taskDetail,
    assignableStaff,
    loading,
    loadingStaff,
    error,
    actionRunning,
    actionError,
    actionSuccess,
    refreshDetail: () => fetchDetail(false),
    refreshStaff: fetchAssignableStaff,
    startTask,
    completeTask,
    blockTask,
    escalateTask,
    cancelTask,
    reassignTask,
    changePriority,
  };
}
