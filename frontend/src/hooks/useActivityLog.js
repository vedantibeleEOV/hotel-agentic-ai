import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook for Activity Log fetching real PostgreSQL audit trail
 */
export function useActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kindFilter, setKindFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);

  const fetchActivities = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);

    try {
      const data = await hotelApi.getActivities();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      setError(err.message || 'Unable to load activity log');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  // Polling every 6 seconds for live audit trail updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities(false);
    }, 6000);

    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Extract unique event types
  const eventTypes = Array.from(
    new Set(activities.map((a) => a.type || a.event_type).filter(Boolean))
  ).sort();

  // Filter activities
  const filteredActivities = activities.filter((item) => {
    // 1. Kind filter
    if (kindFilter !== 'All') {
      const itemKind = (item.kind || '').toLowerCase();
      if (itemKind !== kindFilter.toLowerCase()) return false;
    }

    // 2. Type filter
    if (typeFilter !== 'All') {
      const itemType = item.type || item.event_type || '';
      if (itemType !== typeFilter) return false;
    }

    // 3. Search query (room, person or text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRoom = String(item.room || item.room_id || '').toLowerCase().includes(q);
      const matchActor = String(item.actor || '').toLowerCase().includes(q);
      const matchAction = String(item.action || '').toLowerCase().includes(q);
      const matchResult = String(item.result || '').toLowerCase().includes(q);
      const matchType = String(item.type || item.event_type || '').toLowerCase().includes(q);

      if (!matchRoom && !matchActor && !matchAction && !matchResult && !matchType) {
        return false;
      }
    }

    return true;
  });

  // Export CSV function
  const exportCSV = () => {
    if (filteredActivities.length === 0) return;

    const headers = ['Time', 'Event', 'Actor', 'Actor Kind', 'Room', 'Action', 'Result'];
    const rows = filteredActivities.map((a) => {
      const timeStr = a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-GB') : '';
      return [
        `"${timeStr}"`,
        `"${(a.type || a.event_type || '').replace(/"/g, '""')}"`,
        `"${(a.actor || '').replace(/"/g, '""')}"`,
        `"${(a.kind || a.actor_role || '').replace(/"/g, '""')}"`,
        `"${a.room || a.room_id || ''}"`,
        `"${(a.action || '').replace(/"/g, '""')}"`,
        `"${(a.result || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `activity-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    activities: filteredActivities.slice(0, visibleCount),
    totalCount: filteredActivities.length,
    hasMore: filteredActivities.length > visibleCount,
    loadMore: () => setVisibleCount((prev) => prev + 50),
    kindFilter,
    setKindFilter,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    eventTypes,
    loading,
    error,
    refreshLogs: () => fetchActivities(true),
    exportCSV,
  };
}
