import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { getLocalDateString } from '@smart-budget-tracker/shared';
import { toDateString } from '../scheduler/worker.js';

const NewMonthSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/),
  pocketMoneyPaise: z.number().int().nonnegative(),
  receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  savingsGoalPaise: z.number().int().nonnegative(),
  dailyLimitMode: z.enum(['auto', 'custom']).default('auto'),
  customDailyLimitPaise: z.number().int().positive().optional(),
  emailTimeLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()
});

export const budgetRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/budget/check-month
   * Checks whether a budget period exists for the given or current month.
   * If not, returns prefill values from the user's most recent previous period.
   */
  fastify.get('/check-month', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { monthKey?: string };

    const userRes = await dbQuery<{ timezone: string }>(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';
    const targetMonthKey = query.monthKey || getLocalDateString(new Date(), timezone).substring(0, 7);

    // 1. Check if period exists for target month
    const existingPeriodRes = await dbQuery<{
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
      [userId, targetMonthKey]
    );

    if (existingPeriodRes.rows.length > 0) {
      const p = existingPeriodRes.rows[0];
      return reply.send({
        hasPeriod: true,
        monthKey: targetMonthKey,
        period: {
          id: p.id,
          monthKey: p.month_key,
          pocketMoneyPaise: Number(p.pocket_money_paise),
          receivedOn: toDateString(p.received_on),
          savingsGoalPaise: Number(p.savings_goal_paise),
          spendingBudgetPaise: Number(p.spending_budget_paise),
          ruleVersion: p.rule_version
        }
      });
    }

    // 2. Fetch the most recent past budget period to prefill values
    const lastPeriodRes = await dbQuery<{
      id: string;
      month_key: string;
      pocket_money_paise: string | number;
      received_on: Date | string;
      savings_goal_paise: string | number;
    }>(
      `SELECT id, month_key, pocket_money_paise, received_on, savings_goal_paise
       FROM budget_periods
       WHERE user_id = $1
       ORDER BY month_key DESC
       LIMIT 1`,
      [userId]
    );

    let lastLimitMode = 'auto';
    let lastCustomLimitPaise: number | undefined;

    if (lastPeriodRes.rows[0]) {
      const limitRes = await dbQuery<{ mode: string; limit_paise: string | number }>(
        `SELECT mode, limit_paise
         FROM daily_limit_settings
         WHERE budget_period_id = $1
         ORDER BY effective_from DESC, created_at DESC
         LIMIT 1`,
        [lastPeriodRes.rows[0].id]
      );
      if (limitRes.rows[0]) {
        lastLimitMode = limitRes.rows[0].mode;
        if (lastLimitMode === 'custom') {
          lastCustomLimitPaise = Number(limitRes.rows[0].limit_paise);
        }
      }
    }

    // Get current notification prefs
    const notifRes = await dbQuery<{ send_time_local: string }>(
      'SELECT send_time_local FROM notification_prefs WHERE user_id = $1',
      [userId]
    );

    const prevRow = lastPeriodRes.rows[0];
    const prevReceivedDay = prevRow ? Number(toDateString(prevRow.received_on).split('-')[2]) : 1;

    return reply.send({
      hasPeriod: false,
      monthKey: targetMonthKey,
      prefill: {
        pocketMoneyPaise: prevRow ? Number(prevRow.pocket_money_paise) : 500000,
        savingsGoalPaise: prevRow ? Number(prevRow.savings_goal_paise) : 100000,
        receivedDay: prevReceivedDay,
        dailyLimitMode: lastLimitMode,
        customDailyLimitPaise: lastCustomLimitPaise,
        emailTimeLocal: notifRes.rows[0]?.send_time_local || '22:00'
      }
    });
  });

  /**
   * POST /api/budget/new-month
   * Sets up a fresh budget period for a new month.
   * Guarantees that nothing carries over (previous overspending, shortfall, reservoir balance are reset).
   */
  fastify.post('/new-month', async (request, reply) => {
    const userId = request.user!.id;
    const data = NewMonthSchema.parse(request.body);

    if (data.savingsGoalPaise > data.pocketMoneyPaise) {
      return reply.status(400).send({
        error: 'Savings goal cannot exceed pocket money'
      });
    }

    const spendingBudgetPaise = data.pocketMoneyPaise - data.savingsGoalPaise;

    // Check if period already exists
    const checkRes = await dbQuery<{ id: string }>(
      'SELECT id FROM budget_periods WHERE user_id = $1 AND month_key = $2',
      [userId, data.monthKey]
    );

    if (checkRes.rows.length > 0) {
      return reply.status(409).send({
        error: `A budget period for ${data.monthKey} already exists`
      });
    }

    // Insert new budget period
    const periodRes = await dbQuery<{
      id: string;
      month_key: string;
      pocket_money_paise: string;
      received_on: Date;
      savings_goal_paise: string;
      spending_budget_paise: string;
      rule_version: number;
    }>(
      `INSERT INTO budget_periods (
        user_id, month_key, pocket_money_paise, received_on,
        savings_goal_paise, spending_budget_paise, rule_version
      ) VALUES ($1, $2, $3, $4, $5, $6, 2)
      RETURNING id, month_key, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise, rule_version`,
      [
        userId,
        data.monthKey,
        data.pocketMoneyPaise,
        data.receivedOn,
        data.savingsGoalPaise,
        spendingBudgetPaise
      ]
    );

    const newPeriod = periodRes.rows[0];

    // Compute or set daily limit
    let limitPaise = data.customDailyLimitPaise || 0;
    if (data.dailyLimitMode === 'auto') {
      const [yearStr, monthStr] = data.monthKey.split('-');
      const totalDays = new Date(Date.UTC(Number(yearStr), Number(monthStr), 0)).getUTCDate();
      const startDay = Number(data.receivedOn.split('-')[2]);
      const periodDays = Math.max(1, totalDays - startDay + 1);
      limitPaise = Math.floor(spendingBudgetPaise / periodDays);
    }

    await dbQuery(
      `INSERT INTO daily_limit_settings (budget_period_id, effective_from, limit_paise, mode)
       VALUES ($1, $2, $3, $4)`,
      [newPeriod.id, data.receivedOn, limitPaise, data.dailyLimitMode]
    );

    // Update notification prefs send_time_local if provided
    if (data.emailTimeLocal) {
      await dbQuery(
        `INSERT INTO notification_prefs (user_id, send_time_local)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET send_time_local = $2, updated_at = CURRENT_TIMESTAMP`,
        [userId, data.emailTimeLocal]
      );
    }

    return reply.status(201).send({
      success: true,
      budgetPeriod: {
        id: newPeriod.id,
        monthKey: newPeriod.month_key,
        pocketMoneyPaise: Number(newPeriod.pocket_money_paise),
        receivedOn: toDateString(newPeriod.received_on),
        savingsGoalPaise: Number(newPeriod.savings_goal_paise),
        spendingBudgetPaise: Number(newPeriod.spending_budget_paise),
        ruleVersion: newPeriod.rule_version
      }
    });
  });
};
