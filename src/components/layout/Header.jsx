import React from 'react';
import { useLocation } from 'react-router-dom';
import { PiggyBank, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Map route to friendly title
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard':
        return 'Student Dashboard';
      case '/expenses':
        return 'Daily Expenses';
      case '/reports':
        return 'Budget Analytics & Reports';
      case '/history':
        return 'Monthly History';
      case '/settings':
        return 'Account & App Settings';
      case '/setup':
        return 'Monthly Budget Setup';
      default:
        return 'PiggyPocket';
    }
  };

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Student';

  return (
    <header className="app-header">
      <div className="header-left">
        {/* Mobile brand header (shown on small screens) */}
        <div className="mobile-header-brand">
          <PiggyBank size={24} color="var(--primary)" />
          <span>Piggy<span>Pocket</span></span>
        </div>
        {/* Desktop title */}
        <h1 className="header-title" style={{ display: 'none' }}>
          {getPageTitle(location.pathname)}
        </h1>
      </div>

      <div className="header-right">
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Hey, <strong>{firstName}</strong> 👋
        </span>

        <button
          onClick={logout}
          title="Sign Out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <LogOut size={15} />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
}

