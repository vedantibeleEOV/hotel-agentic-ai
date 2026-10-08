import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook to load Operational Reports summary data
 * with support for range filtering ('today', '7d', '30d') and 10-second polling.
 */
export function useReports(initialRange = '7d') {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const summary = await hotelApi.getReportsSummary(range);
      setData(summary);
      setError(null);
    } catch (err) {
      console.error('Failed to load reports summary:', err);
      setError(err.message || 'Unable to connect to reports service');
    } finally {
      setLoading(false);
    }
  }, [range]);

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

  const refreshReports = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  return {
    range,
    setRange,
    data,
    property: data?.property || { name: 'Voyage Grand', city: 'Pune', total_rooms: 50 },
    kpis: data?.kpis || {},
    automationChart: data?.automation_chart || [],
    turnaroundChart: data?.turnaround_chart || [],
    targetTurnaroundMinutes: data?.target_turnaround_minutes ?? 50,
    slaByCategory: data?.sla_by_category || [],
    criticalResponses: data?.critical_responses || [],
    criticalTargetSummary: data?.critical_target_summary || { met_count: 0, total_count: 0, target_minutes: 5 },
    tasksCompletedVsOverdue: data?.tasks_completed_vs_overdue || [],
    staffUtilization: data?.staff_utilization || [],
    cleaningDurationByType: data?.cleaning_duration_by_type || [],
    loading,
    error,
    refreshReports,
  };
}
