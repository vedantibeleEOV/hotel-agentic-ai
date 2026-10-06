import React from 'react';
import { HotelProvider, useHotel } from './context/HotelContext';
import AppLayout from './components/layout/AppLayout';
import DashboardView from './components/dashboard/DashboardView';
import RoomsPage from './pages/rooms/RoomsPage';
import HousekeepingPage from './pages/housekeeping/HousekeepingPage';
import MaintenanceView from './components/maintenance/MaintenanceView';
import AgentTracesView from './components/traces/AgentTracesView';
import TasksPage from './pages/tasks/TasksPage';
import './styles/rooms.css';
import './styles/tasks.css';
import './styles/housekeeping.css';

function AppContent() {
  const { activeTab } = useHotel();

  return (
    <AppLayout>
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'rooms' && <RoomsPage />}
      {activeTab === 'housekeeping' && <HousekeepingPage />}
      {activeTab === 'maintenance' && <MaintenanceView />}
      {activeTab === 'traces' && <AgentTracesView />}
      {activeTab === 'tasks' && <TasksPage />}
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
