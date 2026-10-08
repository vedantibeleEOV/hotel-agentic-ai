import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook to load Dashboard Command Center summary data
 * with automatic 10-second polling and manual refresh.
 */
export function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const summary = await hotelApi.getDashboardSummary();
      setData(summary);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(err.message || 'Unable to connect to dashboard service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // 10-second polling for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const refreshDashboard = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  return {
    data,
    property: data?.property || { name: 'Voyage Grand', city: 'Pune', total_rooms: 50 },
    kpis: data?.kpis || {},
    needsAttention: data?.needs_attention || [],
    autonomy: data?.autonomy || {},
    liveOperations: data?.live_operations || { turnover_stages: [], maintenance_stages: [] },
    floors: data?.floors || {},
    recentActivity: data?.recent_activity || [],
    occupiedRooms: data?.occupied_rooms || [],
    loading,
    error,
    refreshDashboard,
  };
}
