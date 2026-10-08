import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { hotelApi } from '../api/hotelApi';

const HotelContext = createContext(null);

// Initial Mock Rooms Data (Matching Prototype & Database)
const INITIAL_ROOMS = [
  { id: 1, room_number: '405', floor: 4, room_type: 'DELUXE', status: 'OCCUPIED', priority_score: 95, is_vip: true, early_check_in: true, next_arrival: '13:00' },
  { id: 2, room_number: '406', floor: 4, room_type: 'STANDARD', status: 'READY', priority_score: 10, is_vip: false, early_check_in: false, next_arrival: '16:00' },
  { id: 3, room_number: '301', floor: 3, room_type: 'SUITE', status: 'DIRTY', priority_score: 85, is_vip: true, early_check_in: false, next_arrival: '14:30' },
  { id: 4, room_number: '302', floor: 3, room_type: 'STANDARD', status: 'CLEANING', priority_score: 50, is_vip: false, early_check_in: true, next_arrival: '15:00' },
  { id: 5, room_number: '401', floor: 4, room_type: 'DELUXE', status: 'MAINTENANCE', priority_score: 90, is_vip: false, early_check_in: false, next_arrival: '18:00' },
];

// Initial Staff Data
const INITIAL_STAFF = [
  { id: 201, name: 'Priya Deshmukh', role: 'HOUSEKEEPING', assigned_floor: 4, is_available: true, active_task_count: 1 },
  { id: 202, name: 'Neha Patil', role: 'HOUSEKEEPING', assigned_floor: 4, is_available: true, active_task_count: 0 },
  { id: 203, name: 'Sunita More', role: 'HOUSEKEEPING', assigned_floor: 3, is_available: true, active_task_count: 0 },
  { id: 301, name: 'Rakesh Jadhav', role: 'MAINTENANCE', assigned_floor: 4, is_available: true, active_task_count: 0 },
];

export const HotelProvider = ({ children }) => {
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [staff, setStaff] = useState(INITIAL_STAFF);
  const [tasks, setTasks] = useState([]);
  const [traces, setTraces] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [roomsSummary, setRoomsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [simulationActive, setSimulationActive] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTaskForReassign, setSelectedTaskForReassign] = useState(null);

  // Add Execution Trace
  const addTrace = useCallback((agent, action, details, status = 'COMPLETED', payload = null) => {
    const newTrace = {
      id: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      agent,
      action,
      details,
      status,
      payload,
    };
    setTraces((prev) => [newTrace, ...prev.slice(0, 99)]);
  }, []);

  const [attentionCount, setAttentionCount] = useState(0);

  // Fetch backend status & tasks & rooms summary & attention items
  const refreshData = useCallback(async () => {
    try {
      const health = await hotelApi.checkHealth();
      const online = health.status === 'ok' || health.status === 'healthy';
      setIsOnline(online);

      if (online) {
        const [fetchedTasks, fetchedSummary, fetchedRooms, fetchedDashboard] = await Promise.allSettled([
          hotelApi.getTasks(),
          hotelApi.getRoomsSummary(),
          hotelApi.getRooms(),
          hotelApi.getDashboardSummary(),
        ]);
        if (fetchedTasks.status === 'fulfilled') setTasks(fetchedTasks.value);
        if (fetchedSummary.status === 'fulfilled') setRoomsSummary(fetchedSummary.value);
        if (fetchedRooms.status === 'fulfilled' && Array.isArray(fetchedRooms.value)) {
          setRooms(fetchedRooms.value);
        }
        if (fetchedDashboard.status === 'fulfilled' && fetchedDashboard.value) {
          const count = fetchedDashboard.value.needs_attention?.length ?? 0;
          setAttentionCount(count);
        }
      }
    } catch (err) {
      console.warn('Backend offline, using client store:', err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    addTrace('OPERATIONS_ORCHESTRATOR', 'INITIALIZE_SYSTEM', 'Autonomous Hotel System Ready', 'COMPLETED');
  }, [refreshData, addTrace]);

  // Global 10-second polling for active data sync
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Simulation loop ticker
  useEffect(() => {
    if (!simulationActive) return;
    const interval = setInterval(() => {
      // Simulate slight score adjustments or SLA ticks
      setRooms((prev) =>
        prev.map((r) => {
          if (r.status === 'DIRTY' && r.priority_score < 100) {
            return { ...r, priority_score: Math.min(100, r.priority_score + 1) };
          }
          return r;
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [simulationActive]);

  // Actions
  const triggerCheckout = async (roomId = 1) => {
    const room = rooms.find((r) => r.id === roomId) || rooms[0];
    addTrace('OPERATIONS_ORCHESTRATOR', 'GUEST_CHECKED_OUT', `Checkout received for Room ${room.room_number}`, 'ROUTED', { roomId, propertyId: 1 });

    try {
      if (isOnline) {
        const res = await hotelApi.processCheckout({
          property_id: 1,
          room_id: room.id,
          reservation_id: 5001,
          checkout_time: new Date().toISOString(),
        });
        
        addTrace('ROOM_READINESS_AGENT', 'EVALUATE_CHECKOUT', `Evaluated priority for Room ${room.room_number}`, 'COMPLETED', res.room_readiness);
        addTrace('HOUSEKEEPING_AGENT', 'ASSIGN_TASK', `Task assigned to staff #${res.housekeeping?.assigned_staff_id || 'Queued'}`, 'COMPLETED', res.housekeeping);
        await refreshData();
      } else {
        // Fallback local state update
        setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: 'DIRTY', priority_score: 95 } : r)));
        addTrace('ROOM_READINESS_AGENT', 'EVALUATE_CHECKOUT', `Room ${room.room_number} set to DIRTY. Priority: HIGH`, 'COMPLETED');
        addTrace('HOUSEKEEPING_AGENT', 'ASSIGN_TASK', `Housekeeping task queued for Room ${room.room_number}`, 'COMPLETED');
      }
    } catch (err) {
      addTrace('ERROR', 'CHECKOUT_FAILED', err.message, 'FAILED');
    }
  };

  const reportMaintenance = async (roomId, category, severity, description) => {
    const room = rooms.find((r) => r.id === roomId) || rooms[0];
    addTrace('MAINTENANCE_AGENT', 'REPORT_INCIDENT', `${severity} ${category} issue reported for Room ${room.room_number}`, 'ROUTED');

    try {
      if (isOnline) {
        const res = await hotelApi.reportMaintenance({
          property_id: 1,
          room_id: room.id,
          category,
          severity,
          description,
        });
        addTrace('MAINTENANCE_AGENT', 'DISPATCH_TECHNICIAN', `Technician assigned for Room ${room.room_number}`, 'COMPLETED', res);
        await refreshData();
      } else {
        setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: 'MAINTENANCE' } : r)));
        addTrace('MAINTENANCE_AGENT', 'DISPATCH_TECHNICIAN', `Assigned Rakesh Jadhav to Room ${room.room_number}`, 'COMPLETED');
      }
    } catch (err) {
      addTrace('ERROR', 'MAINTENANCE_FAILED', err.message, 'FAILED');
    }
  };

  const completeTask = async (taskId) => {
    try {
      if (isOnline) {
        await hotelApi.completeTask(taskId);
        addTrace('OPERATIONS_ORCHESTRATOR', 'TASK_COMPLETED', `Task ${taskId} completed successfully`, 'COMPLETED');
        await refreshData();
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        addTrace('OPERATIONS_ORCHESTRATOR', 'TASK_COMPLETED', `Task ${taskId} completed locally`, 'COMPLETED');
      }
    } catch (err) {
      addTrace('ERROR', 'TASK_COMPLETE_FAILED', err.message, 'FAILED');
    }
  };

  const resetSystem = async () => {
    try {
      if (isOnline) {
        await hotelApi.resetSystem();
        await refreshData();
      }
      setRooms(INITIAL_ROOMS);
      setStaff(INITIAL_STAFF);
      addTrace('SYSTEM', 'RESET_STATE', 'System state successfully reset', 'COMPLETED');
    } catch (err) {
      addTrace('ERROR', 'RESET_FAILED', err.message, 'FAILED');
    }
  };

  // Performance optimized memoized values
  const metrics = useMemo(() => {
    const dirtyCount = rooms.filter((r) => r.status === 'DIRTY').length;
    const cleaningCount = rooms.filter((r) => r.status === 'CLEANING').length;
    const readyCount = rooms.filter((r) => r.status === 'READY').length;
    const maintenanceCount = rooms.filter((r) => r.status === 'MAINTENANCE').length;
    const criticalCount = rooms.filter((r) => r.priority_score >= 80 && r.status !== 'READY').length;
    return { dirtyCount, cleaningCount, readyCount, maintenanceCount, criticalCount };
  }, [rooms]);

  const value = {
    rooms,
    roomsSummary,
    totalRooms: roomsSummary?.total ?? rooms.length,
    staff,
    tasks,
    traces,
    incidents,
    loading,
    isOnline,
    simulationActive,
    activeTab,
    attentionCount,
    metrics,
    selectedTaskForReassign,
    setActiveTab,
    setSimulationActive,
    setSelectedTaskForReassign,
    triggerCheckout,
    reportMaintenance,
    completeTask,
    resetSystem,
    refreshData,
    addTrace,
  };

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
};

export const useHotel = () => {
  const context = useContext(HotelContext);
  if (!context) throw new Error('useHotel must be used within a HotelProvider');
  return context;
};
