import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast.js';
import { AuthProvider } from './auth/AuthContext.js';
import { WelcomePage } from './pages/Welcome.js';
import { LoginPage } from './pages/Login.js';
import { RegisterPage } from './pages/Register.js';
import { VerifyOtpPage } from './pages/VerifyOtp.js';
import { OnboardingPage } from './pages/Onboarding.js';
import { HomePage } from './pages/Home.js';
import { NotificationPreferencesPage } from './pages/NotificationPreferences.js';
import { DailySummaryPage } from './pages/DailySummary.js';
import { MonthlyReportPage } from './pages/MonthlyReport.js';
import { SettingsPage } from './pages/Settings.js';
import { ProtectedRoute } from './auth/AuthGuard.js';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
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
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <OnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notification-preferences"
                element={
                  <ProtectedRoute>
                    <NotificationPreferencesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/daily-summary"
                element={
                  <ProtectedRoute>
                    <DailySummaryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monthly-report"
                element={
                  <ProtectedRoute>
                    <MonthlyReportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Any other route redirects to /login as per specification */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

