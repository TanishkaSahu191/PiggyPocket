/**
 * SETTINGS & SCHEDULER CONTROLLER - Email Preferences & Test Triggers
 */

import { query } from '../config/db.js';
import { schedulerService } from '../services/schedulerService.js';

export const settingsController = {
  /**
   * GET /api/settings
   * Retrieves email preferences, timezone, delivery time, and logs
   */
  async getSettings(req, res) {
    try {
      const userId = req.user.id;

      const userRes = await query(
        `SELECT u.email, s.daily_email_enabled, s.delivery_hour, s.time_zone, s.notification_email
         FROM users u
         LEFT JOIN user_settings s ON u.id = s.user_id
         WHERE u.id = $1`,
        [userId]
      );

      const settings = userRes.rows[0] || {};
      const logs = await schedulerService.getEmailLogs(userId);

      return res.json({
        success: true,
        settings: {
          dailyEmailEnabled: settings.daily_email_enabled !== false,
          deliveryHour: Number(settings.delivery_hour ?? 22),
          timeZone: settings.time_zone || 'Asia/Kolkata',
          notificationEmail: settings.notification_email || settings.email,
        },
        logs,
      });
    } catch (err) {
      console.error('getSettings error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * PUT /api/settings
   * Updates delivery time, timezone, email address, and notification toggle
   */
  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const { dailyEmailEnabled, deliveryHour, timeZone, notificationEmail } = req.body;

      const validHour = Math.max(0, Math.min(23, Number(deliveryHour ?? 22)));
      const validZone = (timeZone || 'Asia/Kolkata').trim();
      const validEmail = (notificationEmail || '').trim().toLowerCase();

      await query(
        `INSERT INTO user_settings (user_id, daily_email_enabled, delivery_hour, time_zone, notification_email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           daily_email_enabled = EXCLUDED.daily_email_enabled,
           delivery_hour = EXCLUDED.delivery_hour,
           time_zone = EXCLUDED.time_zone,
           notification_email = EXCLUDED.notification_email`,
        [userId, Boolean(dailyEmailEnabled), validHour, validZone, validEmail || null]
      );

      return res.json({
        success: true,
        message: 'Email preferences saved successfully.',
        settings: {
          dailyEmailEnabled: Boolean(dailyEmailEnabled),
          deliveryHour: validHour,
          timeZone: validZone,
          notificationEmail: validEmail,
        },
      });
    } catch (err) {
      console.error('updateSettings error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/settings/send-test-email
   * Triggers an immediate test summary email to verify settings
   */
  async sendTestEmail(req, res) {
    try {
      const userId = req.user.id;
      const result = await schedulerService.sendDailySummaryForUser({
        userId,
        isManual: true,
      });

      const logs = await schedulerService.getEmailLogs(userId);

      return res.json({
        success: true,
        message: result.message,
        logId: result.logId,
        logs,
      });
    } catch (err) {
      console.error('sendTestEmail error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/settings/trigger-daily-scheduler
   * Manually runs the daily email scheduler job for testing
   */
  async triggerDailyScheduler(req, res) {
    try {
      const userId = req.user.id;
      const result = await schedulerService.sendDailySummaryForUser({
        userId,
        isManual: false,
      });

      const logs = await schedulerService.getEmailLogs(userId);

      return res.json({
        success: true,
        message: result.message,
        skipped: result.skipped || false,
        logs,
      });
    } catch (err) {
      console.error('triggerDailyScheduler error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
