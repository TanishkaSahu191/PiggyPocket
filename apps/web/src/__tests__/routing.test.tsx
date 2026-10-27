// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WelcomePage } from '../pages/Welcome.js';
import { LoginPage } from '../pages/Login.js';
import { RegisterPage } from '../pages/Register.js';
import { VerifyOtpPage } from '../pages/VerifyOtp.js';
import { OnboardingPage } from '../pages/Onboarding.js';
import { HomePage } from '../pages/Home.js';
import { ProtectedRoute } from '../auth/AuthGuard.js';
import { ToastProvider } from '../components/ui/Toast.js';
import { AuthProvider } from '../auth/AuthContext.js';
import { tokenStorage } from '../services/storage.js';

function renderWithRouter(initialEntries: string[]) {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
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
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('Web Routing & Login-First Flow Tests', () => {
  beforeEach(() => {
    tokenStorage.clearTokens();
  });

  it('Unauthenticated visitor sees Welcome page on /', () => {
    renderWithRouter(['/']);
    expect(screen.getByText('PiggyPocket')).toBeDefined();
    expect(screen.getByText(/Master your monthly pocket money/i)).toBeDefined();
  });

  it('Unauthenticated visitor can view /login', () => {
    renderWithRouter(['/login']);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
  });

  it('Unauthenticated visitor can view /register', () => {
    renderWithRouter(['/register']);
    expect(screen.getByRole('heading', { name: /Create Account/i })).toBeDefined();
  });

  it('Unauthenticated visitor can view /verify-otp', () => {
    renderWithRouter(['/verify-otp']);
    expect(screen.getByRole('heading', { name: /Verify OTP/i })).toBeDefined();
  });

  it('Accessing protected /dashboard redirects unauthenticated visitor to /login', () => {
    renderWithRouter(['/dashboard']);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
  });

  it('Accessing protected /home redirects unauthenticated visitor to /login', () => {
    renderWithRouter(['/home']);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
  });

  it('Accessing protected /onboarding redirects unauthenticated visitor to /login', () => {
    renderWithRouter(['/onboarding']);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
  });

  it('Accessing any arbitrary unknown route redirects to /login', () => {
    renderWithRouter(['/unknown-settings-route']);
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeDefined();
  });
});

