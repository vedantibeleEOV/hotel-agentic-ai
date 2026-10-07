import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom Hook for Staff Management using real backend PostgreSQL data
 */
export function useStaff(initialCategory = 'All') {
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [staffList, setStaffList] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);

    try {
      const [staffRes, tasksRes, roomsRes] = await Promise.all([
        hotelApi.getStaff(),
        hotelApi.getTasks(),
        hotelApi.getRooms(),
      ]);

      const rawStaff = Array.isArray(staffRes) ? staffRes : staffRes.staff || [];
      const rawTasks = Array.isArray(tasksRes) ? tasksRes : tasksRes.tasks || [];
      const rawRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];

      // Create lookup for rooms
      const roomMap = {};
      rawRooms.forEach((r) => {
        roomMap[r.id] = r;
      });

      // Enrich staff with real tasks and database attributes
      const enriched = rawStaff.map((s) => {
        const staffTasks = rawTasks.filter((t) => t.assigned_staff_id === s.id);
        const activeTasks = staffTasks.filter((t) => {
          const st = (t.status || '').toUpperCase();
          return st === 'ASSIGNED' || st === 'IN_PROGRESS' || st === 'PENDING' || st === 'ON_HOLD' || st === 'CLEANING' || st === 'IN_REPAIR';
        });

        const completedTasks = staffTasks.filter((t) => {
          const st = (t.status || '').toUpperCase();
          return st === 'COMPLETED' || st === 'RESOLVED' || st === 'DONE';
        });

        // Current ongoing task
        const inProgTask = activeTasks.find((t) => {
          const st = (t.status || '').toUpperCase();
          return st === 'IN_PROGRESS' || st === 'CLEANING' || st === 'IN_REPAIR';
        }) || activeTasks[0];

        let currentTaskObj = null;
        if (inProgTask) {
          const rObj = roomMap[inProgTask.room_id];
          const rNum = rObj ? rObj.room_number : (inProgTask.room_number || inProgTask.room_id || '—');
          
          const rawType = String(inProgTask.task_type || inProgTask.type_label || inProgTask.type || '').toUpperCase();
          const isMaint = rawType.includes('MAINT');
          const tType = isMaint ? 'Maintenance' : 'Cleaning';
          
          const rawStatus = String(inProgTask.status || '').toUpperCase();
          let tStatus = inProgTask.status_label || inProgTask.status;
          if (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN_REPAIR' || rawStatus === 'CLEANING') {
            tStatus = isMaint ? 'In repair' : 'Cleaning';
          } else if (rawStatus === 'ASSIGNED') {
            tStatus = 'Assigned';
          }

          currentTaskObj = {
            id: inProgTask.id,
            room: rNum,
            type: tType,
            status: tStatus,
          };
        }

        // Determine category & role label
        const roleUpper = (s.role || '').toUpperCase();
        let cat = 'Housekeeping';
        let roleLabel = 'Room Attendant';

        if (roleUpper === 'MAINTENANCE') {
          cat = 'Maintenance';
          roleLabel = 'Maintenance Technician';
        } else if (roleUpper === 'SUPERVISOR') {
          cat = 'Supervisors';
          roleLabel = 'Floor Supervisor';
        } else if (roleUpper === 'MANAGER' || roleUpper === 'FRONT_DESK') {
          cat = 'Managers';
          roleLabel = roleUpper === 'FRONT_DESK' ? 'Front Desk' : 'Duty Manager';
        } else {
          cat = 'Housekeeping';
          roleLabel = s.id === 201 ? 'Senior Attendant' : 'Room Attendant';
        }

        // Determine availability status
        const rawAvail = (s.availability_status || '').toUpperCase();
        let avail = 'Available';
        if (rawAvail === 'OFFLINE') {
          avail = 'Offline';
        } else if (rawAvail === 'ON_LEAVE') {
          avail = 'On Leave';
        } else if (inProgTask && (inProgTask.status === 'IN_PROGRESS' || inProgTask.status === 'CLEANING' || inProgTask.status === 'IN_REPAIR')) {
          avail = 'Busy';
        } else {
          avail = 'Available';
        }

        // Skills list
        let skillArr = [];
        if (Array.isArray(s.skills)) {
          skillArr = s.skills;
        } else if (typeof s.skills === 'string' && s.skills) {
          skillArr = s.skills.split(',').map((x) => x.trim());
        }

        // Format location
        const location = s.assigned_floor !== null && s.assigned_floor !== undefined
          ? `Floor ${s.assigned_floor}`
          : 'Hotel';

        return {
          id: s.id,
          name: s.name,
          role: s.role,
          roleLabel,
          category: cat,
          availability: avail,
          availabilityNote: s.availability_note,
          currentTask: currentTaskObj,
          skills: skillArr,
          location,
          floor: s.assigned_floor,
          completedToday: completedTasks.length,
          activeCount: activeTasks.length,
          workload: activeTasks.length,
        };
      });

      setStaffList(enriched);
      setTasks(rawTasks);
      setRooms(rawRooms);
    } catch (err) {
      console.error('Failed to fetch staff data:', err);
      setError(err.message || 'Unable to load staff directory');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // 10-second polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtered by selected category tab
  const filteredStaff = staffList.filter((s) => {
    if (activeCategory === 'All') return true;
    return s.category.toLowerCase() === activeCategory.toLowerCase();
  });

  // Category counts
  const categoryCounts = {
    All: staffList.length,
    Housekeeping: staffList.filter((s) => s.category === 'Housekeeping').length,
    Maintenance: staffList.filter((s) => s.category === 'Maintenance').length,
    Supervisors: staffList.filter((s) => s.category === 'Supervisors').length,
    Managers: staffList.filter((s) => s.category === 'Managers').length,
  };

  // Availability counts for the active view
  const availCounts = {
    Available: filteredStaff.filter((s) => s.availability === 'Available').length,
    Busy: filteredStaff.filter((s) => s.availability === 'Busy').length,
    Offline: filteredStaff.filter((s) => s.availability === 'Offline').length,
    'On Leave': filteredStaff.filter((s) => s.availability === 'On Leave').length,
  };

  return {
    staffList,
    filteredStaff,
    activeCategory,
    setActiveCategory,
    categoryCounts,
    availCounts,
    loading,
    error,
    refreshStaff: () => fetchData(true),
  };
}
