import { useState, useEffect, useCallback, useRef } from 'react';
import { useHotel } from '../context/HotelContext';
import { hotelApi } from '../api/hotelApi';
import { getPlaceholderRoomMeta } from '../data/roomsPlaceholder';

export const formatStatusName = (rawStatus) => {
  if (!rawStatus) return 'Ready';
  const str = String(rawStatus).trim();
  const upper = str.toUpperCase().replace(/[\s_-]+/g, '_');
  const map = {
    'OCCUPIED': 'Occupied',
    'DIRTY': 'Dirty',
    'CLEANING': 'Cleaning',
    'MAINTENANCE': 'Maintenance',
    'INSPECTION': 'Inspection',
    'READY': 'Ready',
    'OUT_OF_ORDER': 'Out of order',
    'OUT_OF_SERVICE': 'Out of order',
  };
  return map[upper] || str;
};

export const formatRoomTypeName = (rawType) => {
  if (!rawType) return 'Deluxe King';
  const str = String(rawType).trim();
  const upper = str.toUpperCase().replace(/[\s_-]+/g, '_');
  const map = {
    'DELUXE': 'Deluxe King',
    'DELUXE_KING': 'Deluxe King',
    'DELUXE_TWIN': 'Deluxe Twin',
    'EXECUTIVE': 'Executive',
    'SUITE': 'Suite',
    'STANDARD': 'Standard King',
  };
  return map[upper] || str;
};

/**
 * Custom hook to load rooms and summary from backend with automatic 10s polling,
 * formatting room attributes to match prototype exact styling.
 */
export function useRooms(filters = {}) {
  const { rooms: contextRooms, refreshData } = useHotel();
  const [rooms, setRooms] = useState([]);
  const [summary, setSummary] = useState(null);
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
      // 1. Fetch Summary
      let fetchedSummary = null;
      try {
        fetchedSummary = await hotelApi.getRoomsSummary();
        setSummary(fetchedSummary);
      } catch (sumErr) {
        console.warn('Failed to fetch rooms summary:', sumErr);
      }

      // 2. Fetch Rooms with optional backend floor filter
      let rawRooms = [];
      try {
        const queryParams = {};
        if (filtersRef.current?.floor && filtersRef.current.floor !== 'All') {
          queryParams.floor = filtersRef.current.floor;
        }
        const res = await hotelApi.getRooms(queryParams);
        if (Array.isArray(res)) {
          rawRooms = res;
        } else {
          rawRooms = contextRooms || [];
        }
      } catch (roomErr) {
        console.warn('Failed to fetch rooms:', roomErr);
        if (contextRooms && contextRooms.length > 0) {
          rawRooms = contextRooms;
        } else {
          throw roomErr;
        }
      }

      const enhancedRooms = rawRooms.map((r) => {
        const roomNumStr = String(r.room_number || r.id || '101');
        const floorNum = r.floor || parseInt(roomNumStr.charAt(0), 10) || 1;
        const extra = getPlaceholderRoomMeta(r.id || roomNumStr);
        const formattedStatus = formatStatusName(r.status);
        const formattedType = formatRoomTypeName(r.room_type);

        return {
          id: r.id || roomNumStr,
          property_id: r.property_id || 1,
          room_number: roomNumStr,
          floor: floorNum,
          room_type: formattedType,
          status: formattedStatus,
          raw_status: r.status,
          current_reservation_id: r.current_reservation_id ?? null,
          guest: extra.guest,
          vip: r.is_vip || extra.vip || false,
          arrival: extra.arrival,
          priority: extra.priority || (r.priority_score >= 80 ? 'High' : 'Low'),
          note: extra.note,
          maint: Boolean(r.open_issue_category),
          maintCategory: r.open_issue_category
            ? r.open_issue_category.charAt(0).toUpperCase() + r.open_issue_category.slice(1).toLowerCase()
            : null,
        };
      });

      setRooms(enhancedRooms);
    } catch (err) {
      console.error('Failed to load room data:', err);
      setError(err.message || 'Unable to fetch room data from server');
    } finally {
      setLoading(false);
    }
  }, [contextRooms]);

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData, filters.floor]);

  // 10-second Polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    if (refreshData) await refreshData();
    await fetchData(true);
  };

  return { rooms, summary, loading, error, refreshRooms: handleRefresh };
}
