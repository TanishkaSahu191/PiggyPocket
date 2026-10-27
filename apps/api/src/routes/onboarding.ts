import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  validateBudgetInput,
  computeAutoDailyLimits,
  getDaysInMonth,
  parseYearMonth
} from '@smart-budget-tracker/shared';
import { withTransaction, dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { validateWithZod, BadRequestError } from '../utils/errors.js';

const previewSchema = z.object({
  pocketMoneyPaise: z.number().int().min(0, 'Pocket money must be a positive integer in paise'),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'receivedOn must be YYYY-MM-DD'),
  savingsGoalPaise: z.number().int().min(0, 'Savings goal must be a non-negative integer in paise'),
  dailyLimitMode: z.enum(['auto', 'custom']).default('auto'),
  customDailyLimitPaise: z.number().int().min(0).optional()
});

const completeOnboardingSchema = previewSchema.extend({
  sendTimeLocal: z.string().regex(/^\d{2}:\d{2}$/, 'sendTimeLocal must be HH:MM').default('22:00'),
  emailNotificationsEnabled: z.boolean().default(true)
});

export const onboardingRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // All onboarding routes require authentication
  app.addHook('preHandler', authenticate);

  // 1. PREVIEW
  app.post('/preview', async (req, reply) => {
    const data = validateWithZod(previewSchema, req.body);

    // Validate using Phase 2 Budget Engine
    try {
      validateBudgetInput({
        pocketMoneyPaise: data.pocketMoneyPaise,
        originalSavingsGoalPaise: data.savingsGoalPaise,
        receivedOn: data.receivedOn,
        transactions: []
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid budget input';
      throw new BadRequestError(msg);
    }

    const spendingBudgetPaise = data.pocketMoneyPaise - data.savingsGoalPaise;
    const { year, month, day: startDay } = parseYearMonth(data.receivedOn);
    const totalDaysInMonth = getDaysInMonth(year, month);
    const periodDays = totalDaysInMonth - startDay + 1;

    if (periodDays <= 0) {
      throw new BadRequestError('receivedOn cannot be beyond the end of the month');
    }

    const autoDailyLimits = computeAutoDailyLimits(spendingBudgetPaise, data.receivedOn);
    const baseAutoDailyLimitPaise = Math.floor(spendingBudgetPaise / periodDays);

    let effectiveDailyLimitPaise = baseAutoDailyLimitPaise;
    if (data.dailyLimitMode === 'custom') {
      if (typeof data.customDailyLimitPaise !== 'number') {
        throw new BadRequestError('customDailyLimitPaise is required when mode is custom');
      }
      effectiveDailyLimitPaise = data.customDailyLimitPaise;
    }

    const sumOfDailyLimits = effectiveDailyLimitPaise * periodDays;
    const unallocatedBudgetPaise = spendingBudgetPaise - sumOfDailyLimits;
    const limitsExceedSpendingBudget = sumOfDailyLimits > spendingBudgetPaise;

    return reply.send({
      pocketMoneyPaise: data.pocketMoneyPaise,
      savingsGoalPaise: data.savingsGoalPaise,
      spendingBudgetPaise,
      periodDays,
      baseAutoDailyLimitPaise,
      effectiveDailyLimitPaise,
      dailyLimitMode: data.dailyLimitMode,
      unallocatedBudgetPaise,
      limitsExceedSpendingBudget,
      firstDayAutoLimitPaise: autoDailyLimits.get(data.receivedOn) || baseAutoDailyLimitPaise
    });
  });

  // 2. COMPLETE SETUP
  app.post('/complete', async (req, reply) => {
    const userId = req.user!.id;
    const data = validateWithZod(completeOnboardingSchema, req.body);

    // Validate with Phase 2 Budget Engine
    try {
      validateBudgetInput({
        pocketMoneyPaise: data.pocketMoneyPaise,
        originalSavingsGoalPaise: data.savingsGoalPaise,
        receivedOn: data.receivedOn,
        transactions: []
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid budget input';
      throw new BadRequestError(msg);
    }

    const spendingBudgetPaise = data.pocketMoneyPaise - data.savingsGoalPaise;
    const { year, month, day: startDay } = parseYearMonth(data.receivedOn);
    const totalDaysInMonth = getDaysInMonth(year, month);
    const periodDays = totalDaysInMonth - startDay + 1;

    let effectiveDailyLimitPaise = Math.floor(spendingBudgetPaise / periodDays);
    if (data.dailyLimitMode === 'custom') {
      if (typeof data.customDailyLimitPaise !== 'number') {
        throw new BadRequestError('customDailyLimitPaise is required when mode is custom');
      }
      effectiveDailyLimitPaise = data.customDailyLimitPaise;
    }

    const monthKey = data.receivedOn.substring(0, 7);

    // Execute in one database transaction
    const result = await withTransaction(async (client) => {
      // 1. Insert or update budget_period for this month
      const periodRes = await client.query<{ id: string }>(
        `INSERT INTO budget_periods (
          user_id, month_key, pocket_money_paise, received_on,
          savings_goal_paise, spending_budget_paise, rule_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, 2)
        ON CONFLICT (user_id, month_key) DO UPDATE SET
          pocket_money_paise = EXCLUDED.pocket_money_paise,
          received_on = EXCLUDED.received_on,
          savings_goal_paise = EXCLUDED.savings_goal_paise,
          spending_budget_paise = EXCLUDED.spending_budget_paise,
          rule_version = 2,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id;`,
        [
          userId,
          monthKey,
          data.pocketMoneyPaise,
          data.receivedOn,
          data.savingsGoalPaise,
          spendingBudgetPaise
        ]
      );

      const periodId = periodRes.rows[0].id;

      // 2. Insert daily limit setting
      await client.query(
        `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
         VALUES ($1, $2, $3, $4);`,
        [periodId, data.receivedOn, effectiveDailyLimitPaise, data.dailyLimitMode]
      );

      // 3. Insert or update notification preferences
      await client.query(
        `INSERT INTO notification_prefs (user_id, email_enabled, send_time_local)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET
           email_enabled = EXCLUDED.email_enabled,
           send_time_local = EXCLUDED.send_time_local,
           updated_at = CURRENT_TIMESTAMP;`,
        [userId, data.emailNotificationsEnabled, data.sendTimeLocal]
      );

      return { budgetPeriodId: periodId, monthKey };
    });

    return reply.status(201).send({
      success: true,
      budgetPeriodId: result.budgetPeriodId,
      monthKey: result.monthKey
    });
  });

  // 3. GET CURRENT BUDGET FOR USER
  app.get('/period', async (req, reply) => {
    const userId = req.user!.id;
    const query = req.query as { monthKey?: string };

    let targetMonth = query.monthKey;
    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    // Scoped strictly to authenticated user
    const periodRes = await dbQuery<{
      id: string;
      user_id: string;
      month_key: string;
      pocket_money_paise: string;
      received_on: string;
      savings_goal_paise: string;
      spending_budget_paise: string;
      rule_version: number;
    }>(
      `SELECT * FROM budget_periods WHERE user_id = $1 AND month_key = $2;`,
      [userId, targetMonth]
    );

    if (periodRes.rows.length === 0) {
      return reply.send({ budgetPeriod: null });
    }

    const period = periodRes.rows[0];

    // Fetch limits for this period
    const limitsRes = await dbQuery(
      `SELECT * FROM daily_limit_settings WHERE budget_period_id = $1 ORDER BY effective_from ASC;`,
      [period.id]
    );

    // Fetch notification preferences
    const prefsRes = await dbQuery(
      `SELECT * FROM notification_prefs WHERE user_id = $1;`,
      [userId]
    );

    return reply.send({
      budgetPeriod: {
        id: period.id,
        monthKey: period.month_key,
        pocketMoneyPaise: Number(period.pocket_money_paise),
        receivedOn: period.received_on,
        savingsGoalPaise: Number(period.savings_goal_paise),
        spendingBudgetPaise: Number(period.spending_budget_paise),
        ruleVersion: period.rule_version
      },
      dailyLimits: limitsRes.rows,
      notificationPrefs: prefsRes.rows[0] || null
    });
  });
};
