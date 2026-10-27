import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { getMailer } from '../services/mailer/index.js';
import { getLocalDateString } from '@smart-budget-tracker/shared';
import { toDateString } from '../scheduler/worker.js';

const ProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional()
});

const TimezoneSchema = z.object({
  timezone: z.string().min(1).max(100)
});

const RequestEmailChangeSchema = z.object({
  newEmail: z.string().email().transform((v) => v.toLowerCase().trim())
});

const VerifyEmailChangeSchema = z.object({
  newEmail: z.string().email().transform((v) => v.toLowerCase().trim()),
  code: z.string().length(6)
});

const UpdateBudgetPeriodSchema = z.object({
  pocketMoneyPaise: z.number().int().nonnegative(),
  savingsGoalPaise: z.number().int().nonnegative(),
  reason: z.string().max(500).optional()
});

const UpdateDailyLimitSchema = z.object({
  mode: z.enum(['auto', 'custom']),
  customLimitPaise: z.number().int().positive().optional()
});

const CategoryRuleSchema = z.object({
  keyword: z.string().min(1).max(100).transform((v) => v.toLowerCase().trim()),
  category: z.string().min(1).max(100).trim()
});

export const settingsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/settings
   * Loads full user settings: profile, budget period, daily limits, notification prefs, category rules, audit log.
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;

    // 1. User profile
    const userRes = await dbQuery<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      timezone: string;
      pending_email: string | null;
    }>(
      'SELECT id, name, email, phone, timezone, pending_email FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return reply.status(404).send({ error: 'User not found' });
    }
    const user = userRes.rows[0];
    const currentMonthKey = getLocalDateString(new Date(), user.timezone).substring(0, 7);

    // 2. Active budget period
    const periodRes = await dbQuery<{
      id: string;
      month_key: string;
      pocket_money_paise: string | number;
      received_on: Date | string;
      savings_goal_paise: string | number;
      spending_budget_paise: string | number;
      rule_version: number;
    }>(
      `SELECT id, month_key, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise, rule_version
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2`,
      [userId, currentMonthKey]
    );

    const currentPeriod = periodRes.rows[0]
      ? {
          id: periodRes.rows[0].id,
          monthKey: periodRes.rows[0].month_key,
          pocketMoneyPaise: Number(periodRes.rows[0].pocket_money_paise),
          receivedOn: toDateString(periodRes.rows[0].received_on),
          savingsGoalPaise: Number(periodRes.rows[0].savings_goal_paise),
          spendingBudgetPaise: Number(periodRes.rows[0].spending_budget_paise),
          ruleVersion: periodRes.rows[0].rule_version
        }
      : null;

    // 3. Daily limit settings
    let dailyLimit = null;
    if (currentPeriod) {
      const limitRes = await dbQuery<{
        id: string;
        effective_from: Date | string;
        limit_paise: string | number;
        mode: string;
      }>(
        `SELECT id, effective_from, limit_paise, mode
         FROM daily_limit_settings
         WHERE budget_period_id = $1
         ORDER BY effective_from DESC, created_at DESC
         LIMIT 1`,
        [currentPeriod.id]
      );

      if (limitRes.rows[0]) {
        dailyLimit = {
          id: limitRes.rows[0].id,
          effectiveFrom: toDateString(limitRes.rows[0].effective_from),
          limitPaise: Number(limitRes.rows[0].limit_paise),
          mode: limitRes.rows[0].mode
        };
      }
    }

    // 4. Notification preferences
    const notifRes = await dbQuery<{
      email_enabled: boolean;
      send_time_local: string;
      timezone: string;
    }>(
      'SELECT email_enabled, send_time_local, timezone FROM notification_prefs WHERE user_id = $1',
      [userId]
    );

    // 5. Category rules
    const rulesRes = await dbQuery<{
      id: string;
      keyword: string;
      category: string;
      created_at: Date;
    }>(
      'SELECT id, keyword, category, created_at FROM category_rules WHERE user_id = $1 ORDER BY keyword ASC',
      [userId]
    );

    // 6. Audit logs
    let auditLogs: Array<{
      id: string;
      old_pocket_money_paise: number;
      new_pocket_money_paise: number;
      old_savings_goal_paise: number;
      new_savings_goal_paise: number;
      reason: string | null;
      created_at: string;
    }> = [];

    if (currentPeriod) {
      const auditRes = await dbQuery<{
        id: string;
        old_pocket_money_paise: string | number;
        new_pocket_money_paise: string | number;
        old_savings_goal_paise: string | number;
        new_savings_goal_paise: string | number;
        reason: string | null;
        created_at: Date;
      }>(
        `SELECT id, old_pocket_money_paise, new_pocket_money_paise, old_savings_goal_paise, new_savings_goal_paise, reason, created_at
         FROM budget_period_audit
         WHERE budget_period_id = $1
         ORDER BY created_at DESC
         LIMIT 10`,
        [currentPeriod.id]
      );

      auditLogs = auditRes.rows.map((r) => ({
        id: r.id,
        old_pocket_money_paise: Number(r.old_pocket_money_paise),
        new_pocket_money_paise: Number(r.new_pocket_money_paise),
        old_savings_goal_paise: Number(r.old_savings_goal_paise),
        new_savings_goal_paise: Number(r.new_savings_goal_paise),
        reason: r.reason,
        created_at: r.created_at.toISOString()
      }));
    }

    return reply.send({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        timezone: user.timezone,
        pendingEmail: user.pending_email
      },
      currentBudget: currentPeriod,
      dailyLimit,
      notificationPrefs: notifRes.rows[0] || {
        email_enabled: true,
        send_time_local: '22:00',
        timezone: user.timezone
      },
      categoryRules: rulesRes.rows,
      auditLogs
    });
  });

  /**
   * PATCH /api/settings/profile
   * Updates user name and phone.
   */
  fastify.patch('/profile', async (request, reply) => {
    const userId = request.user!.id;
    const data = ProfileSchema.parse(request.body);

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(data.phone);
    }

    if (updates.length === 0) {
      return reply.send({ message: 'No changes provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, phone, timezone`;
    const res = await dbQuery(sql, values);

    return reply.send({ user: res.rows[0] });
  });

  /**
   * PATCH /api/settings/timezone
   * Updates user timezone in both users and notification_prefs.
   */
  fastify.patch('/timezone', async (request, reply) => {
    const userId = request.user!.id;
    const { timezone } = TimezoneSchema.parse(request.body);

    await dbQuery('UPDATE users SET timezone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      timezone,
      userId
    ]);

    await dbQuery(
      `INSERT INTO notification_prefs (user_id, timezone)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET timezone = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, timezone]
    );

    return reply.send({ success: true, timezone });
  });

  /**
   * POST /api/settings/email/request-change
   * Initiates email change by sending OTP to the NEW email address.
   */
  fastify.post('/email/request-change', async (request, reply) => {
    const userId = request.user!.id;
    const { newEmail } = RequestEmailChangeSchema.parse(request.body);

    // 1. Check if new email is identical to current email
    const currentUserRes = await dbQuery<{ email: string }>('SELECT email FROM users WHERE id = $1', [
      userId
    ]);
    if (currentUserRes.rows[0]?.email.toLowerCase() === newEmail) {
      return reply.status(400).send({ error: 'New email cannot be the same as your current email' });
    }

    // 2. Check if new email is already registered by another user
    const existingRes = await dbQuery<{ id: string }>('SELECT id FROM users WHERE email = $1', [
      newEmail
    ]);
    if (existingRes.rows.length > 0) {
      return reply.status(409).send({ error: 'This email is already in use by another account' });
    }

    // 3. Generate 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Save OTP code
    await dbQuery(
      `INSERT INTO otp_codes (email, code_hash, purpose, expires_at)
       VALUES ($1, $2, 'change_email', $3)`,
      [newEmail, codeHash, expiresAt]
    );

    // 5. Store pending_email on user
    await dbQuery('UPDATE users SET pending_email = $1 WHERE id = $2', [newEmail, userId]);

    // 6. Send OTP to NEW email address
    const mailer = getMailer();
    await mailer.sendOtp(newEmail, code, 'login');

    return reply.send({
      success: true,
      message: `Verification code sent to ${newEmail}`
    });
  });

  /**
   * POST /api/settings/email/verify-change
   * Verifies OTP sent to the new email, updates users.email and clears pending_email.
   */
  fastify.post('/email/verify-change', async (request, reply) => {
    const userId = request.user!.id;
    const { newEmail, code } = VerifyEmailChangeSchema.parse(request.body);

    // 1. Ensure user has requested this pending email
    const userRes = await dbQuery<{ pending_email: string | null }>(
      'SELECT pending_email FROM users WHERE id = $1',
      [userId]
    );
    if (!userRes.rows[0] || userRes.rows[0].pending_email?.toLowerCase() !== newEmail) {
      return reply.status(400).send({ error: 'No pending email change request for this address' });
    }

    // 2. Hash and check OTP code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const otpRes = await dbQuery<{ id: string; expires_at: Date; consumed_at: Date | null }>(
      `SELECT id, expires_at, consumed_at
       FROM otp_codes
       WHERE email = $1 AND purpose = 'change_email' AND code_hash = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [newEmail, codeHash]
    );

    if (otpRes.rows.length === 0) {
      return reply.status(400).send({ error: 'Invalid verification code' });
    }

    const otp = otpRes.rows[0];
    if (otp.consumed_at) {
      return reply.status(400).send({ error: 'This code has already been used' });
    }
    if (new Date() > new Date(otp.expires_at)) {
      return reply.status(400).send({ error: 'Verification code has expired' });
    }

    // 3. Mark OTP consumed
    await dbQuery('UPDATE otp_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1', [otp.id]);

    // 4. Update user email and clear pending_email
    await dbQuery(
      `UPDATE users
       SET email = $1, pending_email = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newEmail, userId]
    );

    return reply.send({
      success: true,
      email: newEmail,
      message: 'Email address updated successfully'
    });
  });

  /**
   * PATCH /api/settings/budget-period
   * Edits current month's pocket money and savings goal.
   * Keeps audit log of the change, updates budget_period, and recalculates live.
   */
  fastify.patch('/budget-period', async (request, reply) => {
    const userId = request.user!.id;
    const { pocketMoneyPaise, savingsGoalPaise, reason } = UpdateBudgetPeriodSchema.parse(
      request.body
    );

    if (savingsGoalPaise > pocketMoneyPaise) {
      return reply.status(400).send({
        error: 'Savings goal cannot exceed pocket money'
      });
    }

    const userRes = await dbQuery<{ timezone: string }>('SELECT timezone FROM users WHERE id = $1', [
      userId
    ]);
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';
    const currentMonthKey = getLocalDateString(new Date(), timezone).substring(0, 7);

    // Fetch current active period
    const periodRes = await dbQuery<{
      id: string;
      pocket_money_paise: string | number;
      savings_goal_paise: string | number;
    }>(
      `SELECT id, pocket_money_paise, savings_goal_paise
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2`,
      [userId, currentMonthKey]
    );

    if (periodRes.rows.length === 0) {
      return reply.status(404).send({
        error: `No budget period found for active month ${currentMonthKey}`
      });
    }

    const currentPeriod = periodRes.rows[0];
    const oldPocketMoney = Number(currentPeriod.pocket_money_paise);
    const oldSavingsGoal = Number(currentPeriod.savings_goal_paise);
    const newSpendingBudget = pocketMoneyPaise - savingsGoalPaise;

    // 1. Insert audit log row
    await dbQuery(
      `INSERT INTO budget_period_audit (
        budget_period_id, user_id, old_pocket_money_paise, new_pocket_money_paise,
        old_savings_goal_paise, new_savings_goal_paise, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        currentPeriod.id,
        userId,
        oldPocketMoney,
        pocketMoneyPaise,
        oldSavingsGoal,
        savingsGoalPaise,
        reason || 'User modified budget in settings'
      ]
    );

    // 2. Update budget period
    await dbQuery(
      `UPDATE budget_periods
       SET pocket_money_paise = $1, savings_goal_paise = $2, spending_budget_paise = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [pocketMoneyPaise, savingsGoalPaise, newSpendingBudget, currentPeriod.id]
    );

    return reply.send({
      success: true,
      budgetPeriod: {
        id: currentPeriod.id,
        monthKey: currentMonthKey,
        pocketMoneyPaise,
        savingsGoalPaise,
        spendingBudgetPaise: newSpendingBudget
      }
    });
  });

  /**
   * PATCH /api/settings/daily-limit
   * Updates daily limit mode (auto or custom).
   * A changed limit creates a NEW effective-dated entry from today forward and NEVER rewrites past days!
   */
  fastify.patch('/daily-limit', async (request, reply) => {
    const userId = request.user!.id;
    const { mode, customLimitPaise } = UpdateDailyLimitSchema.parse(request.body);

    if (mode === 'custom' && (!customLimitPaise || customLimitPaise <= 0)) {
      return reply.status(400).send({
        error: 'customLimitPaise must be a positive integer when mode is custom'
      });
    }

    const userRes = await dbQuery<{ timezone: string }>('SELECT timezone FROM users WHERE id = $1', [
      userId
    ]);
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';
    const todayLocal = getLocalDateString(new Date(), timezone);
    const currentMonthKey = todayLocal.substring(0, 7);

    // Fetch active budget period
    const periodRes = await dbQuery<{
      id: string;
      pocket_money_paise: string | number;
      savings_goal_paise: string | number;
      spending_budget_paise: string | number;
      received_on: Date | string;
    }>(
      `SELECT id, pocket_money_paise, savings_goal_paise, spending_budget_paise, received_on
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2`,
      [userId, currentMonthKey]
    );

    if (periodRes.rows.length === 0) {
      return reply.status(404).send({
        error: `No budget period found for active month ${currentMonthKey}`
      });
    }

    const period = periodRes.rows[0];
    let limitPaise = customLimitPaise || 0;

    if (mode === 'auto') {
      // Calculate auto daily limit from today forward or spending budget
      const spendingBudget = Number(period.spending_budget_paise);
      const [, monthStr] = currentMonthKey.split('-');
      const totalDays = new Date(
        Date.UTC(Number(currentMonthKey.split('-')[0]), Number(monthStr), 0)
      ).getUTCDate();
      const currentDay = Number(todayLocal.split('-')[2]);
      const remainingDays = Math.max(1, totalDays - currentDay + 1);
      limitPaise = Math.floor(spendingBudget / remainingDays);
    }

    // Insert effective-dated entry for today forward
    const insertRes = await dbQuery<{ id: string; effective_from: Date; limit_paise: string; mode: string }>(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, $2, $3, $4)
       RETURNING id, effective_from, limit_paise, mode`,
      [period.id, todayLocal, limitPaise, mode]
    );

    return reply.send({
      success: true,
      dailyLimit: {
        id: insertRes.rows[0].id,
        effectiveFrom: todayLocal,
        limitPaise: Number(insertRes.rows[0].limit_paise),
        mode: insertRes.rows[0].mode
      }
    });
  });

  /**
   * Category Rules Endpoints
   */
  fastify.get('/category-rules', async (request, reply) => {
    const userId = request.user!.id;
    const res = await dbQuery(
      'SELECT id, keyword, category, created_at FROM category_rules WHERE user_id = $1 ORDER BY keyword ASC',
      [userId]
    );
    return reply.send({ rules: res.rows });
  });

  fastify.post('/category-rules', async (request, reply) => {
    const userId = request.user!.id;
    const { keyword, category } = CategoryRuleSchema.parse(request.body);

    const res = await dbQuery<{ id: string; keyword: string; category: string; created_at: Date }>(
      `INSERT INTO category_rules (user_id, keyword, category)
       VALUES ($1, $2, $3)
       RETURNING id, keyword, category, created_at`,
      [userId, keyword, category]
    );

    return reply.status(201).send({ rule: res.rows[0] });
  });

  fastify.delete('/category-rules/:id', async (request, reply) => {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    await dbQuery('DELETE FROM category_rules WHERE id = $1 AND user_id = $2', [id, userId]);
    return reply.send({ success: true });
  });
};
