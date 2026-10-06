import React, { useState } from 'react';
import { Filter, Search, CheckCircle, Clock, UserCheck, AlertCircle } from 'lucide-react';

export default function TaskBoard({ tasks = [], onCompleteTask, completingTaskId, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter ? task?.status === statusFilter : true;
    const searchLower = searchTerm.toLowerCase();
    const taskId = String(task?.id ?? task?.task_id ?? '');
    const taskType = String(task?.task_type ?? '');
    const roomId = String(task?.room_id ?? '');
    const staffId = task?.assigned_staff_id ? String(task.assigned_staff_id) : '';

    const matchesSearch =
      taskId.toLowerCase().includes(searchLower) ||
      taskType.toLowerCase().includes(searchLower) ||
      roomId.includes(searchLower) ||
      staffId.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="badge badge-completed"><CheckCircle size={12} /> Completed</span>;
      case 'ASSIGNED':
        return <span className="badge badge-assigned"><UserCheck size={12} /> Assigned</span>;
      case 'PENDING':
        return <span className="badge badge-pending"><Clock size={12} /> Pending</span>;
      case 'ON_HOLD':
        return <span className="badge badge-on_hold"><AlertCircle size={12} /> On Hold</span>;
      default:
        return <span className="badge">{status || 'UNKNOWN'}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls / Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search by Room, Type, or Staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-input"
              style={{ paddingLeft: '32px', width: '260px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#94a3b8" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-input"
            >
              <option value="">All Statuses</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          Showing <strong>{filteredTasks.length}</strong> of <strong>{tasks.length}</strong> tasks
        </div>
      </div>

      {/* Tasks Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task Type & ID</th>
              <th>Room #</th>
              <th>Assigned Staff</th>
              <th>Status</th>
              <th>Created At</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div className="spinner" />
                    <span>Loading operational tasks...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  No tasks matching your criteria. Use "Agent Dispatch" to trigger checkout or maintenance events.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, index) => {
                const taskId = task?.id ?? task?.task_id ?? '';
                const isCompleting = completingTaskId === taskId;
                const isCompleted = task?.status === 'COMPLETED';

                return (
                  <tr key={taskId || index}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{task?.task_type ?? 'Task'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                        {(String(taskId)).substring(0, 8)}{taskId ? '...' : ''}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: '700', color: '#38bdf8' }}>Room {task?.room_id ?? '-'}</span>
                    </td>
                    <td>
                      {task?.assigned_staff_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} color="#10b981" />
                          <span>Staff #{task.assigned_staff_id}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>Unassigned / Waiting</span>
                      )}
                    </td>
                    <td>{getStatusBadge(task?.status)}</td>
                    <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {task?.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isCompleted ? (
                        <button
                          onClick={() => onCompleteTask(taskId)}
                          disabled={isCompleting || !taskId}
                          className="btn btn-success"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          title="Complete task and release assigned staff back to available pool"
                        >
                          {isCompleting ? (
                            <>
                              <div className="spinner" /> Completing...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} /> Mark Complete
                            </>
                          )}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Resolved</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
