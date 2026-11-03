/**
 * AUTHENTICATION SERVICE - Connected to Node.js Backend API
 *
 * Communicates with /api/auth routes (signup, login, OTP verification, password reset)
 * with graceful fallback to local session when offline.
 */

const STORAGE_SESSION_KEY = 'pp_active_session_v1';
const STORAGE_ACCESS_TOKEN = 'pp_jwt_access_token';
const STORAGE_PENDING_OTP_KEY = 'pp_pending_otp_v1';

export const authService = {
  /**
   * Logs in a user via Backend API
   */
  async login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      localStorage.setItem(STORAGE_ACCESS_TOKEN, data.accessToken);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      // If network fails (backend not running), support offline demo fallback
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return this._offlineLogin(email, password);
      }
      throw err;
    }
  },

  /**
   * Registers a user and requests OTP via Backend API
   */
  async signUp(userData) {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: userData.fullName,
          email: userData.email,
          phone: userData.phone,
          password: userData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      localStorage.setItem(
        STORAGE_PENDING_OTP_KEY,
        JSON.stringify({ email: userData.email, purpose: 'signup' })
      );

      return {
        email: userData.email,
        message: data.message,
      };
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return this._offlineSignUp(userData);
      }
      throw err;
    }
  },

  /**
   * Verifies 6-digit OTP code via Backend API
   */
  async verifyOtp(email, code, purpose = 'signup') {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      if (data.accessToken) {
        localStorage.setItem(STORAGE_ACCESS_TOKEN, data.accessToken);
      }
      if (data.user) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(data.user));
      }
      localStorage.removeItem(STORAGE_PENDING_OTP_KEY);

      return data.user || { email };
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return this._offlineVerify(email, code);
      }
      throw err;
    }
  },

  /**
   * Requests password reset OTP via Backend API
   */
  async forgotPassword(email) {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset.');
      }

      localStorage.setItem(
        STORAGE_PENDING_OTP_KEY,
        JSON.stringify({ email, purpose: 'reset_password' })
      );

      return { email, message: data.message };
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        localStorage.setItem(
          STORAGE_PENDING_OTP_KEY,
          JSON.stringify({ email, purpose: 'reset_password' })
        );
        return { email };
      }
      throw err;
    }
  },

  /**
   * Logs out user and cleans up tokens
   */
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  /**
   * Returns current logged in user session
   */
  getCurrentSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Returns authorization headers for API calls
   */
  getAuthHeaders() {
    const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Pending OTP session info
   */
  getPendingOtpInfo() {
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_OTP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // ----------------------------------------------------
  // Offline fallback helpers when server is not started
  // ----------------------------------------------------
  _offlineLogin(email, password) {
    const mockUser = {
      id: 'usr_demo_101',
      fullName: 'Tanishka Sahu',
      email: email.toLowerCase(),
      phone: '9876543210',
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(mockUser));
    return mockUser;
  },

  _offlineSignUp(userData) {
    localStorage.setItem(
      STORAGE_PENDING_OTP_KEY,
      JSON.stringify({ email: userData.email, purpose: 'signup' })
    );
    return { email: userData.email, message: 'OTP sent (Dev fallback: 123456)' };
  },

  _offlineVerify(email, code) {
    const mockUser = {
      id: 'usr_' + Date.now(),
      fullName: 'Student User',
      email: email.toLowerCase(),
      phone: '9876543210',
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(mockUser));
    localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
    return mockUser;
  },
};
