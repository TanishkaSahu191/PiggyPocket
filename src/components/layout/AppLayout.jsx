import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { NewMonthRolloverDialog } from './NewMonthRolloverDialog';

export function AppLayout() {
  return (
    <div className="app-container">
      {/* New Month Rollover Decision Dialog */}
      <NewMonthRolloverDialog />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main App Content Viewport */}
      <div className="app-main-content">
        <Header />
        <main className="page-container">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

