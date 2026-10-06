import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#f7f7f7] font-sans text-[#222222] antialiased selection:bg-[#ff385c] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6 max-w-[1560px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
