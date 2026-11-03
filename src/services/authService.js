/**
 * TEMPORARY MOCK AUTH SERVICE - Phase 1 Only.
 *
 * NOTE: This is an in-memory & localStorage mock service for testing UI flows.
 * Real backend authentication (Node.js + Express + PostgreSQL + JWT + bcrypt)
 * will be implemented in Stage 2.
 * Real OTP SMS/Email provider integration will be implemented in Phase 5.
 */

const STORAGE_USERS_KEY = 'pp_mock_registered_users';
const STORAGE_SESSION_KEY = 'pp_mock_active_session';
const STORAGE_PENDING_OTP_KEY = 'pp_mock_pending_otp';

// Default mock student account for quick testing
const DEFAULT_DEMO_USER = {
  id: 'usr_demo_101',
  fullName: 'Tanishka Sahu',
  email: 'tanishkasahu191@gmail.com',
  phone: '9876543210',
  password: 'Password123!',
  createdAt: new Date().toISOString(),
  isVerified: true
};

/**
 * Returns list of registered mock users from localStorage.
 */
function getRegisteredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      const initial = [DEFAULT_DEMO_USER];
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_DEMO_USER];
  }
}

/**
 * Saves registered users to localStorage.
 */
function saveRegisteredUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export const authService = {
  /**
   * Mock login with email and password.
   */
  async login(email, password) {
    // Artificial small delay to simulate network latency
    await new Promise((res) => setTimeout(res, 400));

    const users = getRegisteredUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      throw new Error('No account found with this email. Please sign up.');
    }

    if (user.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    const sessionData = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  },

  /**
   * Mock signup registration.
   * Stores user and sets up pending OTP verification.
   */
  async signUp(userData) {
    await new Promise((res) => setTimeout(res, 400));

    const users = getRegisteredUsers();
    const exists = users.some(
      (u) => u.email.toLowerCase() === userData.email.trim().toLowerCase()
    );

    if (exists) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      fullName: userData.fullName.trim(),
      email: userData.email.trim().toLowerCase(),
      phone: userData.phone.trim(),
      password: userData.password,
      createdAt: new Date().toISOString(),
      isVerified: false
    };

    users.push(newUser);
    saveRegisteredUsers(users);

    // Save pending OTP state for mock verification
    // TODO: Real OTP email/SMS delivery will be handled by the backend in Phase 5.
    const mockOtp = '123456';
    localStorage.setItem(
      STORAGE_PENDING_OTP_KEY,
      JSON.stringify({
        email: newUser.email,
        otp: mockOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        purpose: 'signup'
      })
    );

    return {
      email: newUser.email,
      mockOtpHint: mockOtp
    };
  },

  /**
   * Request OTP for forgot password.
   * TODO: Real OTP email/SMS delivery in Phase 5.
   */
  async forgotPassword(email) {
    await new Promise((res) => setTimeout(res, 400));

    const users = getRegisteredUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      throw new Error('No account found with this email.');
    }

    // Set pending OTP
    // TODO: Real OTP will be generated securely and sent via email/SMS in Phase 5.
    const mockOtp = '123456';
    localStorage.setItem(
      STORAGE_PENDING_OTP_KEY,
      JSON.stringify({
        email: user.email,
        otp: mockOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        purpose: 'reset_password'
      })
    );

    return {
      email: user.email,
      mockOtpHint: mockOtp
    };
  },

  /**
   * Mock verify OTP.
   * TODO: Real OTP verification in Phase 5 via backend endpoint.
   */
  async verifyOtp(email, enteredOtp) {
    await new Promise((res) => setTimeout(res, 400));

    const rawPending = localStorage.getItem(STORAGE_PENDING_OTP_KEY);
    if (!rawPending) {
      // Allow default mock OTP 123456 even if pending session was cleared
      if (enteredOtp === '123456') {
        return this._completeVerification(email);
      }
      throw new Error('OTP session expired. Please request a new code.');
    }

    const pending = JSON.parse(rawPending);
    // TODO: In Phase 5, validate OTP against backend store with expiration
    if (enteredOtp !== '123456' && enteredOtp !== pending.otp) {
      throw new Error('Invalid OTP code. For Phase 1 testing, use 123456.');
    }

    localStorage.removeItem(STORAGE_PENDING_OTP_KEY);
    return this._completeVerification(email);
  },

  _completeVerification(email) {
    const users = getRegisteredUsers();
    const userIndex = users.findIndex(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    let activeUser = users[userIndex];
    if (userIndex !== -1) {
      users[userIndex].isVerified = true;
      saveRegisteredUsers(users);
      activeUser = users[userIndex];
    } else {
      activeUser = {
        id: 'usr_' + Date.now(),
        fullName: 'Student User',
        email: email,
        phone: '9876543210'
      };
    }

    const sessionData = {
      id: activeUser.id,
      fullName: activeUser.fullName,
      email: activeUser.email,
      phone: activeUser.phone,
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
    return sessionData;
  },

  /**
   * Mock logout.
   */
  async logout() {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  },

  /**
   * Retrieves currently logged in user session if present.
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
   * Gets pending OTP info (email, purpose)
   */
  getPendingOtpInfo() {
    try {
      const raw = localStorage.getItem(STORAGE_PENDING_OTP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

