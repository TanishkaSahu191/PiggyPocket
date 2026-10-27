import type { FastifyPluginAsync } from 'fastify';
import { dbQuery } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import {
  computeFullMonthlyReport,
  getLocalDateString,
  MonthBudgetInput,
  TransactionInput
} from '@smart-budget-tracker/shared';
import { toDateString } from '../scheduler/worker.js';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/reports/months
   * Returns all available monthKeys for the authenticated user, sorted descending.
   */
  fastify.get('/months', async (request, reply) => {
    const userId = request.user!.id;
    const userRes = await dbQuery<{ timezone: string }>(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';
    const currentMonthKey = getLocalDateString(new Date(), timezone).substring(0, 7);

    // Get all budget periods for this user
    const periodsRes = await dbQuery<{ month_key: string }>(
      'SELECT month_key FROM budget_periods WHERE user_id = $1 ORDER BY month_key DESC',
      [userId]
    );

    const monthKeys = periodsRes.rows.map((r) => r.month_key);
    // If currentMonthKey is not yet in periods, we still know about it if transactions exist
    const txMonthsRes = await dbQuery<{ tx_month: string }>(
      `SELECT DISTINCT TO_CHAR(occurred_at AT TIME ZONE $2, 'YYYY-MM') as tx_month
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY tx_month DESC`,
      [userId, timezone]
    );

    for (const row of txMonthsRes.rows) {
      if (row.tx_month && !monthKeys.includes(row.tx_month)) {
        monthKeys.push(row.tx_month);
      }
    }

    monthKeys.sort().reverse();

    return reply.send({
      currentMonthKey,
      availableMonths: monthKeys.map((mk) => ({
        monthKey: mk,
        isCurrent: mk === currentMonthKey,
        isFinished: mk < currentMonthKey
      }))
    });
  });

  /**
   * GET /api/reports/monthly
   * Returns comprehensive monthly report for any month, calculated live from data.
   * Query params: monthKey (e.g. '2026-10')
   */
  fastify.get('/monthly', async (request, reply) => {
    const userId = request.user!.id;
    const query = request.query as { monthKey?: string; asOfDate?: string };

    const userRes = await dbQuery<{ timezone: string }>(
      'SELECT timezone FROM users WHERE id = $1',
      [userId]
    );
    const timezone = userRes.rows[0]?.timezone || 'Asia/Kolkata';

    const localToday = getLocalDateString(new Date(), timezone);
    const targetMonthKey = query.monthKey || localToday.substring(0, 7);

    // 1. Fetch budget period for target month
    const periodRes = await dbQuery<{
      id: string;
      pocket_money_paise: string | number;
      received_on: Date | string;
      savings_goal_paise: string | number;
      spending_budget_paise: string | number;
      rule_version: number;
    }>(
      `SELECT id, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise, rule_version
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2`,
      [userId, targetMonthKey]
    );

    if (periodRes.rows.length === 0) {
      return reply.status(404).send({
        error: `No budget period found for month ${targetMonthKey}`
      });
    }

    const period = periodRes.rows[0];
    const receivedOnStr = toDateString(period.received_on);

    // 2. Fetch daily limits for target month
    const limitsRes = await dbQuery<{
      effective_from: Date | string;
      limit_paise: string | number;
    }>(
      `SELECT effective_from, limit_paise
       FROM daily_limit_settings
       WHERE budget_period_id = $1
       ORDER BY effective_from ASC`,
      [period.id]
    );

    const effectiveDailyLimits = limitsRes.rows.map((l) => ({
      effectiveFrom: toDateString(l.effective_from),
      limitPaise: Number(l.limit_paise)
    }));

    // 3. Fetch all active transactions for this user
    const txRes = await dbQuery<{
      id: string;
      amount_paise: string | number;
      category: string;
      note: string | null;
      occurred_at: Date;
    }>(
      `SELECT id, amount_paise, category, note, occurred_at
       FROM transactions
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY occurred_at ASC`,
      [userId]
    );

    const allTransactions: TransactionInput[] = txRes.rows.map((t) => ({
      id: t.id,
      amountPaise: Number(t.amount_paise),
      category: t.category,
      note: t.note || undefined,
      description: t.note || undefined,
      occurredAt: t.occurred_at
    }));

    // 4. Calculate previous month key for comparison
    const [yearNum, monthNum] = targetMonthKey.split('-').map(Number);
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const previousMonthKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    // Fetch previous month budget period if exists
    const prevPeriodRes = await dbQuery<{
      id: string;
      pocket_money_paise: string | number;
      received_on: Date | string;
      savings_goal_paise: string | number;
      spending_budget_paise: string | number;
      rule_version: number;
    }>(
      `SELECT id, pocket_money_paise, received_on, savings_goal_paise, spending_budget_paise, rule_version
       FROM budget_periods
       WHERE user_id = $1 AND month_key = $2`,
      [userId, previousMonthKey]
    );

    let previousMonthInput: MonthBudgetInput | null = null;
    if (prevPeriodRes.rows.length > 0) {
      const prevPeriod = prevPeriodRes.rows[0];
      const prevLimitsRes = await dbQuery<{
        effective_from: Date | string;
        limit_paise: string | number;
      }>(
        `SELECT effective_from, limit_paise
         FROM daily_limit_settings
         WHERE budget_period_id = $1
         ORDER BY effective_from ASC`,
        [prevPeriod.id]
      );

      previousMonthInput = {
        pocketMoneyPaise: Number(prevPeriod.pocket_money_paise),
        receivedOn: toDateString(prevPeriod.received_on),
        originalSavingsGoalPaise: Number(prevPeriod.savings_goal_paise),
        timezone,
        rule_version: prevPeriod.rule_version,
        effectiveDailyLimits: prevLimitsRes.rows.map((l) => ({
          effectiveFrom: toDateString(l.effective_from),
          limitPaise: Number(l.limit_paise)
        })),
        transactions: allTransactions
      };
    }

    const currentMonthInput: MonthBudgetInput = {
      pocketMoneyPaise: Number(period.pocket_money_paise),
      receivedOn: receivedOnStr,
      originalSavingsGoalPaise: Number(period.savings_goal_paise),
      timezone,
      rule_version: period.rule_version,
      effectiveDailyLimits,
      transactions: allTransactions
    };

    const isFinished = targetMonthKey < localToday.substring(0, 7);

    const report = computeFullMonthlyReport({
      input: currentMonthInput,
      asOfDate: query.asOfDate,
      isFinished,
      previousMonthInput,
      previousMonthKey
    });

    return reply.send(report);
  });
};
