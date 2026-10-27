import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.js';
import { WelcomePage } from './pages/Welcome.js';
import { LoginPage } from './pages/Login.js';
import { RegisterPage } from './pages/Register.js';
import { VerifyOtpPage } from './pages/VerifyOtp.js';
import { DashboardStub } from './pages/DashboardStub.js';
import { ProtectedRoute } from './auth/AuthGuard.js';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            {/* Public Unauthenticated Routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />

            {/* Protected Routes (redirects unauthenticated users to /login) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardStub />
                </ProtectedRoute>
              }
            />

            {/* Any other route redirects to /login as per Phase 1 specification */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
};
