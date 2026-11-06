/**
 * SCHEDULER SERVICE - Automated Daily Email Summaries
 *
 * Capabilities:
 * - Uses node-cron for background job scheduling even when the app is closed.
 * - Respects each user's configured time zone (default Asia/Kolkata).
 * - Matches user's delivery time (8 PM, 9 PM, 10 PM, 11 PM; default 10 PM).
 * - Prevents duplicate sends via database constraints & logs.
 * - Automatic retry with exponential backoff on delivery failure.
 * - Shared financeEngine calculations for all numbers.
 * - Manual trigger support for instant testing.
 */

import cron from 'node-cron';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { budgetService } from './budgetService.js';
import { renderDailySummaryHtml } from '../templates/dailySummaryEmail.js';
import { emailService } from './emailService.js';

export const schedulerService = {
  cronTask: null,

  /**
   * Initializes the hourly cron scheduler.
   */
  initScheduler() {
    // Run at minute 0 of every hour
    this.cronTask = cron.schedule('0 * * * *', async () => {
      console.log(`[SCHEDULER] Running hourly email delivery check at ${new Date().toISOString()}`);
      await this.processScheduledSummaries();
    });

    console.log('[SCHEDULER] Daily email summary scheduler initialized (hourly check: 0 * * * *)');
  },

  /**
   * Stops the cron scheduler.
   */
  stopScheduler() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  },

  /**
   * Processes email summaries for all active users based on their timezone and delivery hour.
   */
  async processScheduledSummaries() {
    const usersRes = await query(
      `SELECT u.id, u.email, u.full_name, s.daily_email_enabled, s.delivery_hour, s.time_zone, s.notification_email
       FROM users u
       LEFT JOIN user_settings s ON u.id = s.user_id`
    );

    const now = new Date();
    const results = [];

    for (const user of usersRes.rows) {
      const isEnabled = user.daily_email_enabled !== false;
      if (!isEnabled) continue;

      const userTimeZone = user.time_zone || 'Asia/Kolkata';
      const targetHour = Number(user.delivery_hour ?? 22);

      // Determine local hour and local date for user
      const { localHour, localDateStr } = this.getUserLocalTime(now, userTimeZone);

      if (localHour === targetHour) {
        const sendResult = await this.sendDailySummaryForUser({
          userId: user.id,
          targetDate: localDateStr,
          isManual: false,
        });
        results.push(sendResult);
      }
    }

    return results;
  },

  /**
   * Computes the current hour and YYYY-MM-DD date in a specified time zone.
   * @param {Date} date
   * @param {string} timeZone
   * @returns {{ localHour: number, localDateStr: string }}
   */
  getUserLocalTime(date, timeZone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
      });

      const parts = formatter.formatToParts(date);
      const values = {};
      for (const p of parts) {
        values[p.type] = p.value;
      }

      const localHour = parseInt(values.hour, 10);
      const localDateStr = `${values.year}-${values.month}-${values.day}`;
      return { localHour, localDateStr };
    } catch {
      // Fallback to UTC if timezone string is unrecognized
      const h = date.getUTCHours();
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return { localHour: h, localDateStr: `${y}-${m}-${d}` };
    }
  },

  /**
   * Sends the daily summary email for a single user with duplicate check and retries.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {string} [params.targetDate]
   * @param {boolean} [params.isManual=false]
   * @returns {Promise<{ success: boolean, message: string, logId?: string }>}
   */
  async sendDailySummaryForUser({ userId, targetDate, isManual = false }) {
    // 1. Fetch user & settings
    const userRes = await query(
      `SELECT u.id, u.email, u.full_name, s.daily_email_enabled, s.time_zone, s.notification_email
       FROM users u
       LEFT JOIN user_settings s ON u.id = s.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found.');
    }

    const user = userRes.rows[0];
    const recipientEmail = (user.notification_email || user.email).trim().toLowerCase();
    const timeZone = user.time_zone || 'Asia/Kolkata';

    const effectiveDate = targetDate || this.getUserLocalTime(new Date(), timeZone).localDateStr;
    const monthStr = effectiveDate.slice(0, 7);

    // 2. Prevent duplicate sends for scheduled daily summaries
    const emailType = isManual ? 'test_email' : 'daily_summary';
    if (!isManual) {
      const existingRes = await query(
        `SELECT id FROM email_logs WHERE user_id = $1 AND email_type = $2 AND date_sent = $3`,
        [userId, emailType, effectiveDate]
      );

      if (existingRes.rows.length > 0) {
        return {
          success: true,
          skipped: true,
          message: `Daily summary already sent for ${effectiveDate}. Duplicate send prevented.`,
        };
      }
    }

    // 3. Compute numbers using the shared financeEngine
    const monthBudget = await budgetService.getMonthBudget(userId, monthStr);
    const dayBreakdown = monthBudget.calculation.perDayBreakdown.find((d) => d.date === effectiveDate) || {
      date: effectiveDate,
      dailyLimit: monthBudget.daily_limit,
      actualSpending: 0,
      surplus: monthBudget.daily_limit,
      overspending: 0,
      reserveUsed: 0,
      savingsDeduction: 0,
      newReserve: monthBudget.calculation.currentReserveBalance,
    };

    // 4. Generate clean HTML
    const htmlContent = renderDailySummaryHtml({
      userName: user.full_name,
      targetDate: effectiveDate,
      monthName: monthStr,
      daily: {
        dailyLimit: dayBreakdown.dailyLimit,
        actualSpending: dayBreakdown.actualSpending,
        overspending: dayBreakdown.overspending,
        reserveUsed: dayBreakdown.reserveUsed,
        savingsDeduction: dayBreakdown.savingsDeduction,
        newReserve: dayBreakdown.newReserve,
      },
      monthly: {
        pocketMoney: monthBudget.pocket_money,
        originalSavingsGoal: monthBudget.savings_goal,
        totalSpent: monthBudget.calculation.totalSpent,
        remainingSpendingBudget: monthBudget.calculation.remainingSpendingBudget,
        currentReserveBalance: monthBudget.calculation.currentReserveBalance,
        reserveUsed: monthBudget.calculation.reserveUsed,
        cumulativeSavingsDeductions: monthBudget.calculation.cumulativeSavingsDeductions,
        adjustedProjectedSavings: monthBudget.calculation.adjustedProjectedSavings,
      },
    });

    // 5. Send with automatic retry (up to 3 attempts)
    const logId = 'eml_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    let attempt = 0;
    let sendError = null;
    let isSent = false;

    while (attempt < 3 && !isSent) {
      attempt++;
      try {
        await this.dispatchEmail({
          to: recipientEmail,
          subject: `PiggyPocket Daily Summary: ${effectiveDate}`,
          html: htmlContent,
        });
        isSent = true;
      } catch (err) {
        sendError = err;
        console.warn(`[EMAIL DISPATCH] Attempt ${attempt} failed:`, err.message);
        if (attempt < 3) {
          // Brief exponential backoff
          await new Promise((res) => setTimeout(res, 300 * Math.pow(2, attempt)));
        }
      }
    }

    // 6. Record delivery status in database
    await query(
      `INSERT INTO email_logs (id, user_id, email_type, recipient_email, date_sent, sent_at, status, retry_count, error_message)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
       ON CONFLICT (user_id, email_type, date_sent) DO UPDATE SET
         status = EXCLUDED.status,
         retry_count = EXCLUDED.retry_count,
         error_message = EXCLUDED.error_message,
         sent_at = NOW()`,
      [
        logId,
        userId,
        emailType,
        recipientEmail,
        effectiveDate,
        isSent ? 'sent' : 'failed',
        attempt - 1,
        sendError ? sendError.message : null,
      ]
    );

    if (!isSent) {
      throw new Error(`Email delivery failed after ${attempt} attempts: ${sendError?.message}`);
    }

    return {
      success: true,
      logId,
      recipientEmail,
      dateSent: effectiveDate,
      message: `Daily summary successfully dispatched to ${recipientEmail}`,
    };
  },

  /**
   * Email transport dispatcher: SMTP or Resend API via unified emailService.
   */
  async dispatchEmail({ to, subject, html }) {
    await emailService.sendMail({
      to,
      subject,
      html,
    });
  },

  /**
   * Fetches recent email logs for a user.
   */
  async getEmailLogs(userId) {
    const res = await query(
      `SELECT * FROM email_logs WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 10`,
      [userId]
    );
    return res.rows;
  },
};

