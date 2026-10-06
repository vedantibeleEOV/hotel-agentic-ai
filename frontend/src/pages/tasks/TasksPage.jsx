import React, { useState, useMemo, useCallback } from 'react';
import { useTasks } from '../../hooks/useTasks';
import TasksFilters from './TasksFilters';
import TasksTable from './TasksTable';
import TaskDetailDrawer from './TaskDetailDrawer';
import { RefreshCw, Search, AlertCircle, CheckCircle2, Sparkles, ClipboardCheck } from 'lucide-react';
import '../../styles/tasks.css';

export default function TasksPage() {
  const [filters, setFilters] = useState({
    type: 'all',
    status_group: 'open',
    status: 'All',
    priority: 'All',
    sla: 'All',
    floor: 'All',
    staff_id: 'All',
    search: '',
  });

  const [selectedTask, setSelectedTask] = useState(null);

  const {
    tasks,
    summary,
    floors,
    staffList,
    loading,
    error,
    refreshTasks,
  } = useTasks(filters);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      type: 'all',
      status_group: 'open',
      status: 'All',
      priority: 'All',
      sla: 'All',
      floor: 'All',
      staff_id: 'All',
      search: '',
    });
  }, []);

  // Header Subtitle: "{open_count} open · {assigned_count} assigned by agents"
  const subtitleText = useMemo(() => {
    if (summary) {
      const openCount = summary.open_count ?? 0;
      const assignedCount = summary.assigned_count ?? 0;
      return `${openCount} open · ${assignedCount} assigned by agents`;
    }
    const openCount = tasks.filter((t) => t.status !== 'COMPLETED').length;
    const assignedCount = tasks.filter((t) => t.assigned_staff || t.assigned_staff_id).length;
    return `${openCount} open · ${assignedCount} assigned by agents`;
  }, [summary, tasks]);

  const isInspectionTab = filters.type === 'inspection';

  return (
    <div className="tasks-container">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">Tasks</h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-0.5 font-medium">{subtitleText}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={refreshTasks}
            title="Refresh tasks"
            className="p-2 rounded-xl border border-[#dddddd] bg-white text-[#6a6a6a] hover:text-[#222222] hover:bg-[#f7f7f7] transition-all shadow-2xs"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <TasksFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        floors={floors}
        staffList={staffList}
      />

      {/* 3. Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Loading State */}
      {loading && tasks.length === 0 && (
        <div className="p-16 text-center text-[#6a6a6a] font-medium text-sm flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin text-[#ff385c]" />
          <span>Loading tasks...</span>
        </div>
      )}

      {/* 5. Main Content: Inspection Empty State / Normal Table / Empty State */}
      {isInspectionTab ? (
        <div className="bg-white border border-[#dddddd] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f2] text-[#6a6a6a] flex items-center justify-center mx-auto">
            <ClipboardCheck size={22} />
          </div>
          <h3 className="font-bold text-[#222222] text-base">No inspection tasks</h3>
          <p className="text-xs text-[#6a6a6a] max-w-sm mx-auto">
            Inspection workflows will automatically be generated here after room turnover cleanings are completed.
          </p>
          <button
            onClick={() => handleFilterChange('type', 'all')}
            className="btn-dark px-4 py-2 text-white text-xs font-semibold rounded-xl inline-block mt-2 shadow-2xs"
          >
            <span className="text-white">View all tasks</span>
          </button>
        </div>
      ) : !loading && !error && tasks.length === 0 ? (
        <div className="bg-white border border-[#dddddd] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f2] text-[#6a6a6a] flex items-center justify-center mx-auto">
            <Search size={20} />
          </div>
          <h3 className="font-bold text-[#222222] text-base">No tasks found</h3>
          <p className="text-xs text-[#6a6a6a]">Try clearing your search term or adjusting filters.</p>
          <button
            onClick={handleResetFilters}
            className="btn-dark px-4 py-2 text-white text-xs font-semibold rounded-xl inline-block mt-2 shadow-2xs"
          >
            <span className="text-white">Clear filters</span>
          </button>
        </div>
      ) : (
        (!loading || tasks.length > 0) && (
          <TasksTable tasks={tasks} onSelectTask={setSelectedTask} />
        )
      )}

      {/* 6. Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={refreshTasks}
        />
      )}
    </div>
  );
}
