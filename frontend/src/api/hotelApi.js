const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Hotel Agentic AI API Client
 */
export const hotelApi = {
  /**
   * Check backend health status
   */
  async checkHealth() {
    try {
      const res = await fetch('http://localhost:8000/api/v1/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline' };
    }
  },

  /**
   * READ: Fetch operational tasks with flexible query parameters
   */
  async getTasks(params = {}) {
    const searchParams = new URLSearchParams();
    if (typeof params === 'string') {
      if (params) searchParams.append('status', params);
    } else if (params && typeof params === 'object') {
      if (params.type && params.type !== 'all') searchParams.append('type', params.type);
      if (params.status_group && params.status_group !== 'all') searchParams.append('status_group', params.status_group);
      if (params.status && params.status !== 'All' && params.status !== 'ALL') searchParams.append('status', params.status);
      if (params.priority && params.priority !== 'All' && params.priority !== 'ALL') searchParams.append('priority', params.priority);
      if (params.floor && params.floor !== 'All' && params.floor !== 'ALL') searchParams.append('floor', params.floor);
      if (params.staff_id && params.staff_id !== 'All' && params.staff_id !== 'ALL') searchParams.append('staff_id', params.staff_id);
      if (params.room_id) searchParams.append('room_id', params.room_id);
      if (params.search) searchParams.append('search', params.search);
    }

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/tasks${query}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch tasks (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * READ: Fetch tasks aggregate summary statistics
   */
  async getTasksSummary() {
    const res = await fetch(`${API_BASE}/tasks/summary`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch tasks summary');
    }
    return await res.json();
  },

  /**
   * READ: Fetch specific task details
   */
  async getTaskById(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Task not found');
    }
    return await res.json();
  },

  /**
   * READ: Fetch all rooms from database with optional filters
   */
  async getRooms(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.floor !== undefined && params.floor !== null && params.floor !== 'All') {
      searchParams.append('floor', params.floor);
    }
    if (params.status && params.status !== 'All') {
      searchParams.append('status', params.status);
    }
    if (params.room_type && params.room_type !== 'All') {
      searchParams.append('room_type', params.room_type);
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/rooms${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch rooms');
    }
    return await res.json();
  },

  /**
   * READ: Fetch aggregated rooms summary from database
   */
  async getRoomsSummary() {
    const res = await fetch(`${API_BASE}/rooms/summary`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch rooms summary');
    }
    return await res.json();
  },

  /**
   * READ: Fetch room details by ID
   */
  async getRoom(roomId) {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Room not found');
    }
    return await res.json();
  },

  /**
   * READ: Fetch enriched task detail for drawer view
   */
  async getTaskDetail(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/detail`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch task detail (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * READ: Fetch assignable staff for task reassignment
   */
  async getAssignableStaff(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/assignable-staff`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch assignable staff (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Start an operational task (cleaning or repair)
   */
  async startTask(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to start task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Mark an operational task as blocked with an optional reason
   */
  async blockTask(taskId, reason = null) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reason ? { reason } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to block task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Escalate an operational task with an optional note
   */
  async escalateTask(taskId, note = null) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note ? { note } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to escalate task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Cancel an operational task
   */
  async cancelTask(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to cancel task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Reassign task to another staff member
   */
  async reassignTask(taskId, staffId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/reassign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: Number(staffId) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to reassign task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Change task priority as a human override
   */
  async changeTaskPriority(taskId, priority) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/priority`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update priority (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * UPDATE: Complete an operational task and release staff
   */
  async completeTask(taskId) {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to complete task (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * CREATE: Process checkout event (Triggers Room Readiness & Housekeeping agents)
   */
  async processCheckout(payload) {
    const res = await fetch(`${API_BASE}/events/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to process checkout');
    }
    return await res.json();
  },

  /**
   * CREATE: Report a maintenance issue (Triggers Maintenance agent)
   */
  async reportMaintenance(payload) {
    const res = await fetch(`${API_BASE}/events/maintenance-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit maintenance report');
    }
    return await res.json();
  },

  /**
   * Alias: reportMaintenanceIssue matching convention
   */
  async reportMaintenanceIssue(payload) {
    return this.reportMaintenance(payload);
  },

  /**
   * READ: Fetch Maintenance Board (7 summary KPIs, tabs, issues, technicians, warnings)
   */
  async getMaintenanceBoard(params = {}) {
    const searchParams = new URLSearchParams();
    if (typeof params === 'string') {
      if (params) searchParams.append('tab', params);
    } else if (params && typeof params === 'object') {
      if (params.tab && params.tab !== 'all' && params.tab !== 'All') {
        searchParams.append('tab', params.tab.toLowerCase());
      }
      if (params.floor !== undefined && params.floor !== null && params.floor !== 'All' && params.floor !== 'ALL') {
        searchParams.append('floor', params.floor);
      }
      if (params.search && params.search.trim()) {
        searchParams.append('search', params.search.trim());
      }
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/maintenance/board${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch maintenance board (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * READ: Fetch enriched Maintenance Issue Detail
   */
  async getMaintenanceDetail(incidentOrTaskId) {
    const res = await fetch(`${API_BASE}/maintenance/${incidentOrTaskId}/detail`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch maintenance detail (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Override AI classification for a maintenance incident
   */
  async overrideClassification(incidentId, payload) {
    const res = await fetch(`${API_BASE}/maintenance/${incidentId}/override-classification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to override classification (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * ACTION: Mark a maintenance incident resolved
   */
  async resolveMaintenance(incidentId, payload = {}) {
    const res = await fetch(`${API_BASE}/maintenance/${incidentId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to resolve maintenance issue (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * READ: Fetch staff members from real database endpoint
   */
  async getStaff(role = null) {
    const searchParams = new URLSearchParams();
    if (role && role !== 'All' && role !== 'ALL') {
      searchParams.append('role', role);
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/staff${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch staff members');
    }
    return await res.json();
  },

  /**
   * READ: Fetch Housekeeping Board (workload summary, columns, attendants, SLA)
   */
  async getHousekeepingBoard(floor = null) {
    const searchParams = new URLSearchParams();
    if (floor !== null && floor !== undefined && floor !== 'All' && floor !== 'ALL') {
      searchParams.append('floor', floor);
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/housekeeping/board${queryString}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch housekeeping board (HTTP ${res.status})`);
    }
    return await res.json();
  },

  /**
   * DELETE / RESET: Reset database state and seed data back to initial state
   */
  async resetSystem() {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to reset system');
    }
    return await res.json();
  },
};

