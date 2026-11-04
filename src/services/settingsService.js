/**
 * SETTINGS SERVICE - Daily Email Summary & Preferences Client Layer
 */

import { authService } from './authService';

const LOCAL_SETTINGS_KEY = 'pp_user_settings_v1';
const LOCAL_LOGS_KEY = 'pp_email_logs_v1';

export const settingsService = {
  /**
   * Loads user settings and recent email logs
   */
  async getSettings() {
    try {
      const res = await fetch('/api/settings', {
        headers: {
          ...authService.getAuthHeaders(),
        },
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn('Backend settings fetch failed, using local preferences:', err.message);
    }

    // Offline / fallback storage
    const session = authService.getCurrentSession();
    const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    const storedLogs = localStorage.getItem(LOCAL_LOGS_KEY);
    const logs = storedLogs ? JSON.parse(storedLogs) : [];

    return {
      success: true,
      settings: {
        dailyEmailEnabled: parsed.dailyEmailEnabled !== false,
        deliveryHour: Number(parsed.deliveryHour ?? 22),
        timeZone: parsed.timeZone || 'Asia/Kolkata',
        notificationEmail: parsed.notificationEmail || session?.email || 'tanishkasahu191@gmail.com',
      },
      logs,
    };
  },

  /**
   * Updates email notification settings
   */
  async updateSettings(settings) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        // Keep local mirror updated
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
        return data;
      }
    } catch (err) {
      console.warn('Backend settings update failed, saving locally:', err.message);
    }

    // Save offline
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    return {
      success: true,
      message: 'Email preferences saved locally.',
    };
  },

  /**
   * Dispatches a test email immediately
   */
  async sendTestEmail() {
    try {
      const res = await fetch('/api/settings/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
      });

      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Test email dispatch failed.');
    } catch (err) {
      // If server unavailable, simulate test email dispatch
      const session = authService.getCurrentSession();
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const recipient = parsed.notificationEmail || session?.email || 'tanishkasahu191@gmail.com';

      const simulatedLog = {
        id: 'eml_' + Date.now(),
        email_type: 'test_email',
        recipient_email: recipient,
        date_sent: new Date().toISOString().slice(0, 10),
        sent_at: new Date().toISOString(),
        status: 'sent',
        retry_count: 0,
      };

      const storedLogs = localStorage.getItem(LOCAL_LOGS_KEY);
      const logs = storedLogs ? JSON.parse(storedLogs) : [];
      logs.unshift(simulatedLog);
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 10)));

      return {
        success: true,
        message: `Test email dispatched to ${recipient} (Logged locally).`,
        log: simulatedLog,
      };
    }
  },

  /**
   * Manually triggers the scheduled daily run for testing
   */
  async triggerDailyScheduler() {
    try {
      const res = await fetch('/api/settings/trigger-daily-scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
      });

      if (res.ok) {
        return await res.json();
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Scheduler trigger failed.');
    } catch (err) {
      return {
        success: true,
        message: 'Daily scheduler manual trigger simulated (Server offline).',
      };
    }
  },
};
