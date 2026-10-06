import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom hook to load Housekeeping board data (workload summary, columns, attendants)
 * with floor filtering, dynamic floor extraction, and automatic 10-second polling.
 */
export function useHousekeeping(initialFloor = 'All') {
  const [selectedFloor, setSelectedFloor] = useState(initialFloor);
  const [boardData, setBoardData] = useState(null);
  const [roomsSummary, setRoomsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const floorRef = useRef(selectedFloor);
  useEffect(() => {
    floorRef.current = selectedFloor;
  }, [selectedFloor]);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    setError(null);

    try {
      const activeFloor = floorRef.current === 'All' ? null : floorRef.current;
      const [boardRes, roomsSummaryRes] = await Promise.allSettled([
        hotelApi.getHousekeepingBoard(activeFloor),
        hotelApi.getRoomsSummary(),
      ]);

      if (boardRes.status === 'fulfilled') {
        setBoardData(boardRes.value);
      } else {
        throw new Error(boardRes.reason?.message || 'Failed to load housekeeping board');
      }

      if (roomsSummaryRes.status === 'fulfilled') {
        setRoomsSummary(roomsSummaryRes.value);
      }
    } catch (err) {
      console.error('Failed to load housekeeping board:', err);
      setError(err.message || 'Unable to connect to housekeeping service');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when floor selection changes
  useEffect(() => {
    fetchData(true);
  }, [fetchData, selectedFloor]);

  // 10-second automatic polling with clean teardown
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Dynamic floors derived from rooms summary or fallback 1..5
  const dynamicFloors = useMemo(() => {
    if (roomsSummary?.by_floor && Object.keys(roomsSummary.by_floor).length > 0) {
      return Object.keys(roomsSummary.by_floor).sort((a, b) => Number(a) - Number(b));
    }
    return ['1', '2', '3', '4', '5'];
  }, [roomsSummary]);

  const handleRefresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    boardData,
    summary: boardData?.summary || null,
    columns: boardData?.columns || [],
    attendants: boardData?.attendants || [],
    generatedAt: boardData?.generated_at || null,
    floors: dynamicFloors,
    selectedFloor,
    setSelectedFloor,
    loading,
    error,
    refreshHousekeeping: handleRefresh,
  };
}
