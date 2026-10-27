import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { validateWithZod, BadRequestError, NotFoundError } from '../utils/errors.js';
import { getMailer } from '../services/mailer/index.js';
import { buildDailyEmailSummary } from '../services/summary/emailContent.js';
import { getUserLocalDateTime, toDateString } from '../scheduler/worker.js';
import { MonthBudgetInput } from '@smart-budget-tracker/shared';
import { env } from '../config/env.js';

const updatePrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  send_time_local: z.string().regex(/^\d{2}:\d{2}$/, 'Must be in HH:MM 24-hour format').optional(),
  timezone: z.string().min(1, 'Timezone cannot be empty').optional()
});

// In-memory test email rate limiter: 5 requests per 10 minutes per user
const testEmailTimestamps = new Map<string, number[]>();

function checkTestEmailRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 5;

  const timestamps = (testEmailTimestamps.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    throw new BadRequestError('Test email rate limit reached. Please wait a few minutes before trying again.');
  }
  timestamps.push(now);
  testEmailTimestamps.set(userId, timestamps);
}

export function computeNextSummaryInfo(
  now: Date,
  timezone: string,
  sendTimeLocal: string
): { nextSummaryDate: string; nextSummaryTime: string; isToday: boolean; formattedHuman: string } {
  const { localDate, totalMinutes: currentMinutes } = getUserLocalDateTime(now, timezone);
  const [schedH, schedM] = sendTimeLocal.split(':').map((v) => parseInt(v, 10));
  const scheduledMinutes = schedH * 60 + schedM;

  if (currentMinutes < scheduledMinutes) {
    // Today later
    return {
      nextSummaryDate: localDate,
      nextSummaryTime: sendTimeLocal,
      isToday: true,
      formattedHuman: `Today at ${formatHumanTime(sendTimeLocal)} (${timezone})`
    };
  }

  // Tomorrow
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { localDate: tomDate } = getUserLocalDateTime(tomorrowDate, timezone);
  return {
    nextSummaryDate: tomDate,
    nextSummaryTime: sendTimeLocal,
    isToday: false,
    formattedHuman: `Tomorrow (${tomDate}) at ${formatHumanTime(sendTimeLocal)} (${timezone})`
  };
}

function formatHumanTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = String(m).padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

export const notificationRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.addHook('preHandler', authenticate);

  // 1. GET PREFERENCES
  app.get('/preferences', async (req, reply) => {
    const userId = req.user!.id;

    const userRes = await dbQuery<{ timezone: string }>(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    const userTz = userRes.rows[0]?.timezone || 'Asia/Kolkata';

    const prefsRes = await dbQuery<{
      email_enabled: boolean;
      send_time_local: string;
      timezone: string;
    }>('SELECT * FROM notification_prefs WHERE user_id = $1', [userId]);

    const prefs = prefsRes.rows[0] || {
      email_enabled: true,
      send_time_local: '22:00',
      timezone: userTz
    };

    const effectiveTz = prefs.timezone || userTz;
    const nextSummary = computeNextSummaryInfo(new Date(), effectiveTz, prefs.send_time_local);

    return reply.send({
      preferences: {
        email_enabled: prefs.email_enabled,
        send_time_local: prefs.send_time_local,
        timezone: effectiveTz
      },
      nextSummary
    });
  });

  // 2. UPDATE PREFERENCES
  app.patch('/preferences', async (req, reply) => {
    const userId = req.user!.id;
    const data = validateWithZod(updatePrefsSchema, req.body);

    if (data.timezone) {
      // Validate timezone format
      try {
        Intl.DateTimeFormat(undefined, { timeZone: data.timezone });
      } catch {
        throw new BadRequestError(`Invalid IANA timezone: ${data.timezone}`);
      }
    }

    const currentRes = await dbQuery<{
      email_enabled: boolean;
      send_time_local: string;
      timezone: string;
    }>('SELECT * FROM notification_prefs WHERE user_id = $1', [userId]);

    const current = currentRes.rows[0] || {
      email_enabled: true,
      send_time_local: '22:00',
      timezone: 'Asia/Kolkata'
    };

    const newEmailEnabled =
      data.email_enabled !== undefined ? data.email_enabled : current.email_enabled;
    const newSendTime = data.send_time_local || current.send_time_local;
    const newTimezone = data.timezone || current.timezone;

    await dbQuery(
      `INSERT INTO notification_prefs (user_id, email_enabled, send_time_local, timezone)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = EXCLUDED.email_enabled,
         send_time_local = EXCLUDED.send_time_local,
         timezone = EXCLUDED.timezone,
         updated_at = CURRENT_TIMESTAMP;`,
      [userId, newEmailEnabled, newSendTime, newTimezone]
    );

    // Also update timezone on users table if provided
    if (data.timezone) {
      await dbQuery('UPDATE users SET timezone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        data.timezone,
        userId
      ]);
    }

    const nextSummary = computeNextSummaryInfo(new Date(), newTimezone, newSendTime);

    return reply.send({
      success: true,
      preferences: {
        email_enabled: newEmailEnabled,
        send_time_local: newSendTime,
        timezone: newTimezone
      },
      nextSummary
    });
  });

  // 3. SEND TEST EMAIL (Rate limited)
  app.post('/test-email', async (req, reply) => {
    const userId = req.user!.id;
    checkTestEmailRateLimit(userId);

    const userRes = await dbQuery<{ name: string; email: string; timezone: string }>(
      'SELECT name, email, timezone FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    const user = userRes.rows[0];

    const { localDate } = getUserLocalDateTime(new Date(), user.timezone);
    const monthKey = localDate.substring(0, 7);

    // Fetch budget period if configured, or use demo fallback
    const periodRes = await dbQuery<{
      pocket_money_paise: string;
      received_on: string;
      savings_goal_paise: string;
      rule_version: number;
      id: string;
    }>('SELECT * FROM budget_periods WHERE user_id = $1 AND month_key = $2', [userId, monthKey]);

    let budgetInput: MonthBudgetInput;

    if (periodRes.rows.length > 0) {
      const period = periodRes.rows[0];
      const limitsRes = await dbQuery<{ effective_from: string; limit_paise: string }>(
        'SELECT effective_from, limit_paise FROM daily_limit_settings WHERE budget_period_id = $1 ORDER BY effective_from ASC',
        [period.id]
      );
      const txRes = await dbQuery<{ id: string; amount_paise: string; occurred_at: Date }>(
        'SELECT id, amount_paise, occurred_at FROM transactions WHERE user_id = $1 AND deleted_at IS NULL ORDER BY occurred_at ASC',
        [userId]
      );

      budgetInput = {
        pocketMoneyPaise: Number(period.pocket_money_paise),
        originalSavingsGoalPaise: Number(period.savings_goal_paise),
        receivedOn: toDateString(period.received_on),
        timezone: user.timezone,
        rule_version: (period.rule_version as 1 | 2) || 2,
        effectiveDailyLimits: limitsRes.rows.map((r) => ({
          effectiveFrom: toDateString(r.effective_from),
          limitPaise: Number(r.limit_paise)
        })),
        transactions: txRes.rows.map((t) => ({
          id: t.id,
          amountPaise: Number(t.amount_paise),
          occurredAt: t.occurred_at
        }))
      };
    } else {
      // Demonstration values for new users
      budgetInput = {
        pocketMoneyPaise: 500000,
        originalSavingsGoalPaise: 100000,
        receivedOn: `${monthKey}-01`,
        timezone: user.timezone,
        rule_version: 2,
        effectiveDailyLimits: [{ effectiveFrom: `${monthKey}-01`, limitPaise: 13300 }],
        transactions: []
      };
    }

    const emailContent = buildDailyEmailSummary({
      user,
      budgetInput,
      targetDate: localDate
    });

    const mailer = getMailer();
    const mailRes = await mailer.sendEmail({
      to: user.email,
      subject: `[TEST] ${emailContent.subject}`,
      text: emailContent.text,
      html: emailContent.html
    });

    const isDevConsole =
      env.NODE_ENV !== 'production' &&
      (!env.EMAIL_API_KEY || env.EMAIL_API_KEY.includes('placeholder'));

    return reply.send({
      success: true,
      messageId: mailRes.messageId,
      recipient: user.email,
      provider: isDevConsole ? 'ConsoleMailer (Dev Console)' : env.EMAIL_PROVIDER,
      hasRealApiKey: !isDevConsole,
      message: isDevConsole
        ? 'Test email generated and printed to server console (no real API key configured).'
        : `Test email dispatched to ${user.email} via ${env.EMAIL_PROVIDER}.`
    });
  });

  // 4. IN-APP DAILY SUMMARY (For any date, independent of email delivery)
  app.get('/daily-summary', async (req, reply) => {
    const userId = req.user!.id;
    const query = req.query as { date?: string };

    const userRes = await dbQuery<{ name: string; email: string; timezone: string }>(
      'SELECT name, email, timezone FROM users WHERE id = $1',
      [userId]
    );
    if (userRes.rows.length === 0) {
      throw new NotFoundError('User not found');
    }
    const user = userRes.rows[0];

    let targetDate = query.date;
    if (!targetDate) {
      const { localDate } = getUserLocalDateTime(new Date(), user.timezone);
      targetDate = localDate;
    }

    const monthKey = targetDate.substring(0, 7);

    // Fetch budget period
    const periodRes = await dbQuery<{
      pocket_money_paise: string;
      received_on: string;
      savings_goal_paise: string;
      rule_version: number;
      id: string;
    }>('SELECT * FROM budget_periods WHERE user_id = $1 AND month_key = $2', [userId, monthKey]);

    if (periodRes.rows.length === 0) {
      return reply.send({
        hasBudget: false,
        targetDate,
        summary: null,
        deliveryStatus: 'no_budget'
      });
    }

    const period = periodRes.rows[0];

    // Fetch limits
    const limitsRes = await dbQuery<{ effective_from: string; limit_paise: string }>(
      'SELECT effective_from, limit_paise FROM daily_limit_settings WHERE budget_period_id = $1 ORDER BY effective_from ASC',
      [period.id]
    );

    // Fetch transactions
    const txRes = await dbQuery<{ id: string; amount_paise: string; occurred_at: Date }>(
      'SELECT id, amount_paise, occurred_at FROM transactions WHERE user_id = $1 AND deleted_at IS NULL ORDER BY occurred_at ASC',
      [userId]
    );

    const budgetInput: MonthBudgetInput = {
      pocketMoneyPaise: Number(period.pocket_money_paise),
      originalSavingsGoalPaise: Number(period.savings_goal_paise),
      receivedOn: toDateString(period.received_on),
      timezone: user.timezone,
      rule_version: (period.rule_version as 1 | 2) || 2,
      effectiveDailyLimits: limitsRes.rows.map((r) => ({
        effectiveFrom: toDateString(r.effective_from),
        limitPaise: Number(r.limit_paise)
      })),
      transactions: txRes.rows.map((t) => ({
        id: t.id,
        amountPaise: Number(t.amount_paise),
        occurredAt: t.occurred_at
      }))
    };

    const emailSummary = buildDailyEmailSummary({
      user,
      budgetInput,
      targetDate
    });

    // Check delivery status from log
    const logRes = await dbQuery<{
      status: string;
      last_error: string | null;
      created_at: Date;
    }>('SELECT status, last_error, created_at FROM email_delivery_log WHERE user_id = $1 AND report_date = $2', [
      userId,
      targetDate
    ]);

    const deliveryStatus = logRes.rows[0]?.status || 'pending';
    const lastError = logRes.rows[0]?.last_error || null;

    return reply.send({
      hasBudget: true,
      targetDate,
      dailyMetrics: emailSummary.dailyMetrics,
      monthMetrics: emailSummary.monthMetrics,
      insight: emailSummary.insight,
      deliveryStatus,
      lastError
    });
  });

  // 5. DELIVERY HISTORY
  app.get('/history', async (req, reply) => {
    const userId = req.user!.id;
    const logsRes = await dbQuery<{
      id: string;
      report_date: string;
      status: string;
      attempt_count: number;
      last_error: string | null;
      provider_message_id: string | null;
      created_at: Date;
    }>(
      `SELECT id, report_date, status, attempt_count, last_error, provider_message_id, created_at
       FROM email_delivery_log
       WHERE user_id = $1
       ORDER BY report_date DESC
       LIMIT 30;`,
      [userId]
    );

    return reply.send({
      history: logsRes.rows.map((r) => ({
        id: r.id,
        reportDate:
          typeof r.report_date === 'string'
            ? r.report_date.substring(0, 10)
            : (r.report_date as Date).toISOString().substring(0, 10),
        status: r.status,
        attemptCount: r.attempt_count,
        lastError: r.last_error,
        providerMessageId: r.provider_message_id,
        createdAt: r.created_at
      }))
    });
  });
};
