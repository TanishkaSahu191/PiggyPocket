/**
 * AUTH CONTEXT & SESSION MANAGEMENT
 *
 * Provides authentication state and actions for user login, signup,
 * and OTP verification. Integrates with authService and token storage.
 */

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingOtpEmail, setPendingOtpEmail] = useState('');

  // Hydrate session from localStorage on initial mount
  useEffect(() => {
    try {
      const activeSession = authService.getCurrentSession();
      if (activeSession) {
        setUser(activeSession);
      }
      const pending = authService.getPendingOtpInfo();
      if (pending?.email) {
        setPendingOtpEmail(pending.email);
      }
    } catch (err) {
      console.error('Error restoring session:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Log in user with email and password
   */
  const login = useCallback(async (email, password) => {
    const session = await authService.login(email, password);
    setUser(session);
    return session;
  }, []);

  /**
   * Register a new user and initiate OTP verification
   */
  const signup = useCallback(async (formData) => {
    const res = await authService.signUp(formData);
    setPendingOtpEmail(res.email);
    return res;
  }, []);

  /**
   * Initiate forgot password flow
   */
  const forgotPassword = useCallback(async (email) => {
    const res = await authService.forgotPassword(email);
    setPendingOtpEmail(res.email);
    return res;
  }, []);

  /**
   * Verify 6-digit OTP via auth service
   */
  const verifyOtp = useCallback(async (otpCode) => {
    const emailToVerify = pendingOtpEmail || authService.getPendingOtpInfo()?.email;
    if (!emailToVerify) {
      throw new Error('No pending OTP verification session found.');
    }
    const session = await authService.verifyOtp(emailToVerify, otpCode);
    setUser(session);
    setPendingOtpEmail('');
    return session;
  }, [pendingOtpEmail]);

  /**
   * Resend OTP verification code
   */
  const resendOtp = useCallback(async (email) => {
    const emailToResend = email || pendingOtpEmail || authService.getPendingOtpInfo()?.email;
    return await authService.resendOtp(emailToResend);
  }, [pendingOtpEmail]);

  /**
   * Complete password reset with OTP and new password
   */
  const resetPassword = useCallback(async (otpCode, newPassword) => {
    const emailToReset = pendingOtpEmail || authService.getPendingOtpInfo()?.email;
    if (!emailToReset) {
      throw new Error('No pending password reset session found.');
    }
    const res = await authService.resetPassword(emailToReset, otpCode, newPassword);
    setPendingOtpEmail('');
    return res;
  }, [pendingOtpEmail]);

  /**
   * Log in user with Google authentication
   */
  const loginWithGoogle = useCallback(async (googlePayload) => {
    const session = await authService.loginWithGoogle(googlePayload);
    setUser(session);
    setPendingOtpEmail('');
    return session;
  }, []);

  /**
   * Log out active user
   */
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    pendingOtpEmail,
    setPendingOtpEmail,
    login,
    signup,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    verifyOtp,
    resendOtp,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

