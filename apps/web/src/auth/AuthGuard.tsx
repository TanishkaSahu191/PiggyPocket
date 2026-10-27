import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { Skeleton } from '../components/ui/index.js';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, hasActiveBudget } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="mobile-view-wrapper" style={{ padding: '2rem', gap: '1rem', justifyContent: 'center' }}>
        <Skeleton height="2rem" width="60%" />
        <Skeleton height="1rem" width="100%" />
        <Skeleton height="1rem" width="80%" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but has not completed onboarding for the current month
  if (!hasActiveBudget && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user already has an active budget for this month, skip onboarding
  if (hasActiveBudget && location.pathname === '/onboarding') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
