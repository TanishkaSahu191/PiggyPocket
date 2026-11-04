import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BudgetProvider } from './context/BudgetContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerification from './pages/auth/OtpVerification';

// App Pages
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Savings from './pages/Savings';
import History from './pages/History';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BudgetProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Auth Routes (Accessible without login) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={
              <PublicRoute>
                <OtpVerification />
              </PublicRoute>
            }
          />

          {/* Protected Routes (Login-First Enforcement) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/savings" element={<Savings />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </BudgetProvider>
  </AuthProvider>
  );
}

