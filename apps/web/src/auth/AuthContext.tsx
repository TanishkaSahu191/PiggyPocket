import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client.js';
import { tokenStorage } from '../services/storage.js';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  timezone: string;
  emailVerifiedAt?: string | null;
}

export interface BudgetPeriod {
  id: string;
  monthKey: string;
  pocketMoneyPaise: number;
  receivedOn: string;
  savingsGoalPaise: number;
  spendingBudgetPaise: number;
  ruleVersion: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasActiveBudget: boolean;
  currentBudget: BudgetPeriod | null;
  register: (name: string, email: string, phone?: string) => Promise<{ message: string }>;
  requestOtp: (email: string, purpose?: 'register' | 'login') => Promise<{ message: string }>;
  verifyOtp: (email: string, code: string, purpose?: 'register' | 'login') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasActiveBudget, setHasActiveBudget] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<BudgetPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getAccessToken() || tokenStorage.getRefreshToken();
    if (!token) {
      setUser(null);
      setHasActiveBudget(false);
      setCurrentBudget(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{
        user: User;
        hasActiveBudget: boolean;
        currentBudget: BudgetPeriod | null;
      }>('/api/auth/me');

      setUser(data.user);
      setHasActiveBudget(data.hasActiveBudget);
      setCurrentBudget(data.currentBudget);
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
      setHasActiveBudget(false);
      setCurrentBudget(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const register = async (name: string, email: string, phone?: string) => {
    return apiRequest<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        phone,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
      })
    });
  };

  const requestOtp = async (email: string, purpose: 'register' | 'login' = 'login') => {
    return apiRequest<{ message: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose })
    });
  };

  const verifyOtp = async (email: string, code: string, purpose: 'register' | 'login' = 'login') => {
    const data = await apiRequest<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, purpose })
    });

    tokenStorage.setAccessToken(data.accessToken);
    tokenStorage.setRefreshToken(data.refreshToken);
    setUser(data.user);

    // Fetch user details & budget status
    await refreshUser();
  };

  const logout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      setHasActiveBudget(false);
      setCurrentBudget(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        hasActiveBudget,
        currentBudget,
        register,
        requestOtp,
        verifyOtp,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
