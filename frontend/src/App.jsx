import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelProvider, useHotel } from './context/HotelContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardView from './components/dashboard/DashboardView';
import RoomsPage from './pages/rooms/RoomsPage';
import HousekeepingPage from './pages/housekeeping/HousekeepingPage';
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
import './styles/login.css';

function AppContent() {
  const { activeTab } = useHotel();
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#222222] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#6a6a6a]">Loading Voyage Ops...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

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
    <AuthProvider>
      <HotelProvider>
        <AppContent />
      </HotelProvider>
    </AuthProvider>
  );
}
