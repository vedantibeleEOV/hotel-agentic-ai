import { useState, useEffect, useCallback } from 'react';
import { hotelApi } from '../api/hotelApi';

/**
 * Custom Hook to aggregate hotel operational issues and exceptions needing human attention
 * Matches exact logic from Voyage Ops Prototype getAttention() using real database data.
 */
export function useIssues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIssues = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);

    try {
      const [tasksRes, roomsRes, staffRes] = await Promise.all([
        hotelApi.getTasks(),
        hotelApi.getRooms(),
        hotelApi.getStaff(),
      ]);

      const rawTasks = Array.isArray(tasksRes) ? tasksRes : tasksRes.tasks || [];
      const rawRooms = Array.isArray(roomsRes) ? roomsRes : roomsRes.rooms || [];
      const rawStaff = Array.isArray(staffRes) ? staffRes : staffRes.staff || [];

      // Create lookup maps
      const roomMap = {};
      rawRooms.forEach((r) => {
        roomMap[r.id] = r;
      });

      const staffMap = {};
      rawStaff.forEach((s) => {
        staffMap[s.id] = s;
      });

      const now = new Date();
      const attentionList = [];
      const seen = new Set();

      const addIssue = (task, item) => {
        if (seen.has(task.id)) return;
        seen.add(task.id);
        attentionList.push({
          task,
          ...item,
        });
      };

      // Filter active (open) tasks
      const activeTasks = rawTasks.filter((t) => {
        const st = (t.status || '').toUpperCase();
        return st === 'ASSIGNED' || st === 'IN_PROGRESS' || st === 'PENDING' || st === 'ON_HOLD' || st === 'CLEANING' || st === 'IN_REPAIR';
      });

      activeTasks.forEach((t) => {
        const rObj = roomMap[t.room_id] || {};
        const roomNum = t.room_number || rObj.room_number || t.room_id || '—';
        const rawType = String(t.task_type || t.type_label || t.type || '').toUpperCase();
        const isMaint = rawType.includes('MAINT');
        const stUpper = (t.status || '').toUpperCase();
        const pLevel = String(t.priority_level || t.incident_severity || '').toUpperCase();
        const isCritical = pLevel === 'CRITICAL' || pLevel === 'URGENT';
        
        const staffObj = t.assigned_staff || staffMap[t.assigned_staff_id] || null;
        const staffName = staffObj ? staffObj.name : null;

        // Calculate SLA breach / countdown
        let isBreached = false;
        let slaDiffText = null;
        if (t.sla_deadline) {
          const deadline = new Date(t.sla_deadline);
          const diffMs = deadline.getTime() - now.getTime();
          if (diffMs < 0) {
            isBreached = true;
            const absSec = Math.floor(Math.abs(diffMs) / 1000);
            const h = Math.floor(absSec / 3600);
            const m = Math.floor((absSec % 3600) / 60);
            const s = absSec % 60;
            slaDiffText = h > 0 ? `+${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `+${m}:${String(s).padStart(2, '0')}`;
          } else {
            const absSec = Math.floor(diffMs / 1000);
            const h = Math.floor(absSec / 3600);
            const m = Math.floor((absSec % 3600) / 60);
            const s = absSec % 60;
            slaDiffText = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} left` : `${m}:${String(s).padStart(2, '0')} left`;
          }
        }

        const category = t.incident_category || (isMaint ? 'Maintenance' : 'Housekeeping');
        const desc = t.description || t.notes || (isMaint ? 'Maintenance issue' : 'Room cleaning');

        // 1. Critical maintenance issues (Level 0)
        if (isMaint && isCritical) {
          addIssue(t, {
            id: t.id,
            level: 0,
            icon: 'flame',
            title: `Critical · ${category} — Room ${roomNum}`,
            body: `“${desc}” · ${staffName ? `${staffName} responding` : 'Unassigned'}`,
            cta: 'Open issue',
            isBreached,
            slaDiffText,
            room: roomNum,
            type: isMaint ? 'Maintenance' : 'Cleaning',
          });
          return;
        }

        // 2. Unassigned maintenance or no technician available (Level 1)
        if (isMaint && !staffName && stUpper !== 'ON_HOLD') {
          addIssue(t, {
            id: t.id,
            level: 1,
            icon: 'userx',
            title: `No technician available — Room ${roomNum}`,
            body: `${category} · “${desc}” · escalated to Duty Manager`,
            cta: 'Assign technician',
            isBreached,
            slaDiffText,
            room: roomNum,
            type: 'Maintenance',
          });
          return;
        }

        // 3. SLA Breached / Overdue tasks (Level 1)
        if (isBreached && stUpper !== 'ON_HOLD') {
          addIssue(t, {
            id: t.id,
            level: 1,
            icon: 'clock',
            title: isMaint ? `SLA breached — Room ${roomNum}` : `Cleaning overdue — Room ${roomNum}`,
            body: `${t.display_id || t.id} · ${staffName || 'Unassigned'}${rObj.arrival_time ? ` · next guest ${rObj.arrival_time}` : ''}`,
            cta: 'Reassign',
            isBreached,
            slaDiffText,
            room: roomNum,
            type: isMaint ? 'Maintenance' : 'Cleaning',
          });
          return;
        }

        // 4. Blocked tasks (Level 2)
        if (stUpper === 'ON_HOLD' || stUpper === 'BLOCKED') {
          addIssue(t, {
            id: t.id,
            level: 2,
            icon: 'lock',
            title: `Blocked — Room ${roomNum}`,
            body: `${t.display_id || t.id} · ${t.notes || 'Waiting on parts or human decision'}`,
            cta: 'Open',
            isBreached: false,
            slaDiffText: null,
            room: roomNum,
            type: isMaint ? 'Maintenance' : 'Cleaning',
          });
          return;
        }

        // 5. Unassigned Priority cleaning tasks (Level 2)
        if (!isMaint && !staffName && (pLevel === 'HIGH' || pLevel === 'URGENT' || rObj.is_priority)) {
          addIssue(t, {
            id: t.id,
            level: 2,
            icon: 'star',
            title: `Priority room waiting for attendant — Room ${roomNum}`,
            body: `Room ${roomNum} is high priority for today's arrivals`,
            cta: 'Assign',
            isBreached: false,
            slaDiffText: null,
            room: roomNum,
            type: 'Cleaning',
          });
        }
      });

      // Sort by level ascending (Critical -> Overdue -> Review)
      attentionList.sort((a, b) => a.level - b.level);
      setIssues(attentionList);
    } catch (err) {
      console.error('Failed to load issues:', err);
      setError(err.message || 'Unable to load issues');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIssues(true);
  }, [fetchIssues]);

  // Periodic polling every 5 seconds for live SLA countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIssues(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchIssues]);

  // Grouped issues
  const criticalIssues = issues.filter((i) => i.level === 0);
  const overdueIssues = issues.filter((i) => i.level === 1);
  const reviewIssues = issues.filter((i) => i.level === 2);

  return {
    issues,
    criticalIssues,
    overdueIssues,
    reviewIssues,
    totalCount: issues.length,
    loading,
    error,
    refreshIssues: () => fetchIssues(true),
  };
}
