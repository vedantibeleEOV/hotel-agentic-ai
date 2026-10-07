import { useState, useEffect, useCallback, useRef } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook for Maintenance Board data fetching, tab switching, and 10-second live polling.
 */
export function useMaintenanceBoard(initialTab = 'Open') {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [boardData, setBoardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabRef = useRef(activeTab);
  useEffect(() => {
    tabRef.current = activeTab;
  }, [activeTab]);

  const fetchBoard = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    setError(null);

    try {
      const currentTab = tabRef.current ? tabRef.current.toLowerCase() : 'open';
      const res = await hotelApi.getMaintenanceBoard({ tab: currentTab });
      setBoardData(res);
    } catch (err) {
      console.error('Failed to load maintenance board:', err);
      setError(err.message || 'Unable to connect to maintenance service');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when tab changes
  useEffect(() => {
    fetchBoard(true);
  }, [fetchBoard, activeTab]);

  // 10-second live polling with cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBoard(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBoard]);

  const handleRefresh = useCallback(async () => {
    await fetchBoard(true);
  }, [fetchBoard]);

  return {
    boardData,
    summary: boardData?.summary || null,
    tabCounts: boardData?.tab_counts || { open: 0, critical: 0, unassigned: 0, completed: 0 },
    issues: boardData?.issues || [],
    technicians: boardData?.technicians || [],
    warnings: boardData?.warnings || [],
    activeTab,
    setActiveTab,
    loading,
    error,
    refreshBoard: handleRefresh,
  };
}
