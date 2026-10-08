import React from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import AppLayout from './components/layout/AppLayout';
import DashboardView from './components/dashboard/DashboardView';
import RoomsPage from './pages/rooms/RoomsPage';
import HousekeepingPage from './pages/housekeeping/HousekeepingPage';
import MaintenanceView from './components/maintenance/MaintenanceView';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import AgentTracesView from './components/traces/AgentTracesView';
import TasksPage from './pages/tasks/TasksPage';
import StaffPage from './pages/staff/StaffPage';
import IssuesPage from './pages/issues/IssuesPage';
import ActivityLogPage from './pages/activity/ActivityLogPage';
import ReportsPage from './pages/reports/ReportsPage';
import './styles/dashboard.css';
import './styles/rooms.css';
import './styles/tasks.css';
import './styles/housekeeping.css';
import './styles/maintenance.css';
import './styles/staff.css';
import './styles/issues.css';
import './styles/activityLog.css';
import './styles/reports.css';

function AppContent() {
  const { activeTab } = useHotel();

  return (
    <AppLayout>
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'rooms' && <RoomsPage />}
      {activeTab === 'housekeeping' && <HousekeepingPage />}
      {activeTab === 'maintenance' && <MaintenancePage />}
      {activeTab === 'traces' && <AgentTracesView />}
      {activeTab === 'tasks' && <TasksPage />}
      {activeTab === 'staff' && <StaffPage />}
      {activeTab === 'issues' && <IssuesPage />}
      {activeTab === 'activity' && <ActivityLogPage />}
      {activeTab === 'reports' && <ReportsPage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <HotelProvider>
      <AppContent />
    </HotelProvider>
  );
}
