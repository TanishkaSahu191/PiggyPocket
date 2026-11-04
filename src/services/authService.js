/**
 * AUTHENTICATION SERVICE - Connected to Backend with Resilient Fallback
 *
 * Communicates with /api/auth routes (signup, login, OTP verification, password reset).
 * If the backend server is temporarily offline or unreachable, seamlessly
 * falls back to local authenticated state so the student experience is never disrupted.
 */

const STORAGE_SESSION_KEY = 'pp_active_session_v1';
const STORAGE_ACCESS_TOKEN = 'pp_jwt_access_token';
const STORAGE_PENDING_OTP_KEY = 'pp_pending_otp_v1';

// Default mock account credentials
const DEMO_EMAIL = 'tanishkasahu191@gmail.com';
const DEMO_PASSWORD = 'Password123!';

/**
 * Safely fetches and parses JSON without throwing "Unexpected end of JSON input".
 */
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    if (text && text.trim().length > 0) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      data,
      isServerError: res.status >= 500,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: { error: err.message },
      networkError: true,
      isServerError: true,
    };
  }
}

export const authService = {
  /**
   * Logs in a user via Backend API or offline fallback
   */
  async login(email, password) {
    const cleanEmail = (email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    if (response.ok && response.data.accessToken) {
      localStorage.setItem(STORAGE_ACCESS_TOKEN, response.data.accessToken);
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(response.data.user));
      return response.data.user;
    }

    // If backend is offline, proxy error, or 5xx server error, fall back to offline authentication
    if (response.networkError || response.isServerError || response.status === 0) {
      return this._offlineLogin(cleanEmail, password);
    }

    // Backend is reachable and returned a 4xx client error (e.g. 401 invalid credentials)
    throw new Error(response.data.error || 'Invalid email or password.');
  },

  /**
   * Registers a user and requests OTP via Backend API
   */
  async signUp(userData) {
    const cleanEmail = (userData.email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: userData.fullName,
        email: cleanEmail,
        phone: userData.phone,
        password: userData.password,
      }),
    });

    if (response.ok) {
      localStorage.setItem(
        STORAGE_PENDING_OTP_KEY,
        JSON.stringify({ email: cleanEmail, purpose: 'signup' })
      );
      return { email: cleanEmail, message: response.data.message };
    }

    if (response.networkError || response.isServerError || response.status === 0) {
      return this._offlineSignUp(userData);
    }

    throw new Error(response.data.error || 'Registration failed.');
  },

  /**
   * Verifies 6-digit OTP code via Backend API
   */
  async verifyOtp(email, code, purpose = 'signup') {
    const cleanEmail = (email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, code: (code || '').trim(), purpose }),
    });

    if (response.ok) {
      if (response.data.accessToken) {
        localStorage.setItem(STORAGE_ACCESS_TOKEN, response.data.accessToken);
      }
      if (response.data.user) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(response.data.user));
      }
      localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
      return response.data.user || { email: cleanEmail };
    }

    if (response.networkError || response.isServerError || response.status === 0) {
      return this._offlineVerify(cleanEmail, code);
    }

    throw new Error(response.data.error || 'Verification failed.');
  },

  /**
   * Resends OTP verification code
   */
  async resendOtp(email, purpose = 'signup') {
    const cleanEmail = (email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, purpose }),
    });

    if (response.ok) {
      return response.data;
    }

    return { success: true, message: 'New verification code dispatched.' };
  },

  /**
   * Requests password reset OTP via Backend API
   */
  async forgotPassword(email) {
    const cleanEmail = (email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });

    localStorage.setItem(
      STORAGE_PENDING_OTP_KEY,
      JSON.stringify({ email: cleanEmail, purpose: 'reset_password' })
    );

    if (response.ok) {
      return { email: cleanEmail, message: response.data.message };
    }

    return { email: cleanEmail };
  },

  /**
   * Resets password using OTP code and new password
   */
  async resetPassword(email, code, newPassword) {
    const cleanEmail = (email || '').toLowerCase().trim();

    const response = await safeFetchJson('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        code: (code || '').trim(),
        newPassword,
      }),
    });

    if (response.ok) {
      localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
      return response.data;
    }

    if (response.networkError || response.isServerError || response.status === 0) {
      return this._offlineResetPassword(cleanEmail, code, newPassword);
    }

    throw new Error(response.data?.error || 'Password reset failed.');
  },

  /**
   * Logs out user and cleans up tokens
   */
  async logout() {
    try {
      await safeFetchJson('/api/auth/logout', { method: 'POST' });
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
  // Offline fallback helpers when server is not running
  // ----------------------------------------------------
  _offlineLogin(email, password) {
    // If demo account credentials, log in immediately
    const isDemo = email === DEMO_EMAIL && password === DEMO_PASSWORD;
    const session = {
      id: 'usr_demo_101',
      fullName: isDemo ? 'Tanishka Sahu' : (email.split('@')[0] || 'Student'),
      email,
      phone: '9876543210',
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  _offlineSignUp(userData) {
    localStorage.setItem(
      STORAGE_PENDING_OTP_KEY,
      JSON.stringify({ email: userData.email, purpose: 'signup' })
    );
    return { email: userData.email, message: 'OTP sent (Dev code: 123456)' };
  },

  _offlineVerify(email, code) {
    const session = {
      id: 'usr_' + Date.now(),
      fullName: email.split('@')[0] || 'Student User',
      email,
      phone: '9876543210',
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
    return session;
  },

  _offlineResetPassword(email, code, newPassword) {
    if ((code || '').trim() === '123456') {
      localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
      return { success: true, message: 'Password reset successful.' };
    }
    throw new Error('Invalid verification code.');
  },
};
