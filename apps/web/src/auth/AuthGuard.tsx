import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ============================================================================
 * AUTH GUARD STUB (Phase 1)
 * ============================================================================
 * NOTE: Real authentication arrives in Phase 3.
 * As specified in Phase 1 requirements, this stub always evaluates
 * `isAuthenticated = false`.
 * Any unauthenticated attempt to access protected routes will redirect to `/login`.
 * ============================================================================
 */
export const useAuthStub = () => {
  // STUB: Always returns false until Phase 3 auth implementation
  const isAuthenticated = false;
  return { isAuthenticated };
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStub();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect unauthenticated user to /login, saving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
