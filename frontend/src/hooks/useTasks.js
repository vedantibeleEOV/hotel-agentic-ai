import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hotelApi } from '../api/hotelApi';
import { useHotel } from '../context/HotelContext';

/**
 * Custom hook to load tasks, summary statistics, dynamic floors and staff list
 * with automatic 10-second polling and clean interval teardown.
 */
export function useTasks(filters = {}) {
  const { staff: contextStaff } = useHotel();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [roomsSummary, setRoomsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    setError(null);

    try {
      // 1. Fetch Tasks Summary & Rooms Summary in parallel
      const [summaryRes, roomsSummaryRes] = await Promise.allSettled([
        hotelApi.getTasksSummary(),
        hotelApi.getRoomsSummary(),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      }
      if (roomsSummaryRes.status === 'fulfilled') {
        setRoomsSummary(roomsSummaryRes.value);
      }

      // 2. Fetch Tasks with active filters
      const queryParams = {
        type: filtersRef.current?.type,
        status_group: filtersRef.current?.status_group,
        status: filtersRef.current?.status,
        priority: filtersRef.current?.priority,
        floor: filtersRef.current?.floor,
        staff_id: filtersRef.current?.staff_id,
        search: filtersRef.current?.search,
      };

      const tasksRes = await hotelApi.getTasks(queryParams);
      let list = Array.isArray(tasksRes) ? tasksRes : [];

      // Client-side SLA filter if selected
      if (filtersRef.current?.sla && filtersRef.current.sla !== 'All') {
        const now = Date.now();
        list = list.filter((t) => {
          if (!t.sla_deadline) return false;
          const deadline = new Date(t.sla_deadline).getTime();
          const diffMin = (deadline - now) / (1000 * 60);
          if (filtersRef.current.sla === 'Breached') {
            return diffMin <= 0 && t.status !== 'COMPLETED';
          }
          if (filtersRef.current.sla === 'At risk') {
            return diffMin > 0 && diffMin <= 30 && t.status !== 'COMPLETED';
          }
          return true;
        });
      }

      setTasks(list);
    } catch (err) {
      console.error('Failed to load tasks data:', err);
      setError(err.message || 'Unable to fetch tasks from server');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when filters change
  useEffect(() => {
    fetchData(true);
  }, [
    fetchData,
    filters.type,
    filters.status_group,
    filters.status,
    filters.priority,
    filters.floor,
    filters.staff_id,
    filters.search,
    filters.sla,
  ]);

  // 10-second automatic polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Dynamic floors derived from rooms summary (e.g. 1..5)
  const dynamicFloors = useMemo(() => {
    if (roomsSummary?.by_floor && Object.keys(roomsSummary.by_floor).length > 0) {
      return Object.keys(roomsSummary.by_floor).sort((a, b) => Number(a) - Number(b));
    }
    return ['1', '2', '3', '4', '5'];
  }, [roomsSummary]);

  // Dynamic staff list derived from tasks assigned_staff and context
  const dynamicStaffList = useMemo(() => {
    const staffMap = new Map();

    // From live tasks
    tasks.forEach((t) => {
      if (t.assigned_staff?.id && t.assigned_staff?.name) {
        staffMap.set(String(t.assigned_staff.id), {
          id: String(t.assigned_staff.id),
          name: t.assigned_staff.name,
        });
      } else if (t.assigned_staff_id) {
        staffMap.set(String(t.assigned_staff_id), {
          id: String(t.assigned_staff_id),
          name: `Staff #${t.assigned_staff_id}`,
        });
      }
    });

    // From context staff if available
    if (Array.isArray(contextStaff)) {
      contextStaff.forEach((s) => {
        if (s?.id && !staffMap.has(String(s.id))) {
          staffMap.set(String(s.id), {
            id: String(s.id),
            name: s.name || `Staff #${s.id}`,
          });
        }
      });
    }

    return Array.from(staffMap.values());
  }, [tasks, contextStaff]);

  const handleRefresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    tasks,
    summary,
    floors: dynamicFloors,
    staffList: dynamicStaffList,
    loading,
    error,
    refreshTasks: handleRefresh,
  };
}
