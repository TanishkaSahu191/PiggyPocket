/**
 * BUDGET & FINANCE SERVICE - Server-side Execution
 *
 * CRITICAL RULE: Uses the EXACT pure functions from /src/core/financeEngine.js.
 * Zero duplicated logic. Results match the frontend down to the cent.
 */

import crypto from 'crypto';
import { query } from '../config/db.js';
import {
  recalculateMonth,
  calculateInitialSpendingBudget,
  calculateDefaultDailyLimit,
  getDaysInMonth,
} from '../../../src/core/financeEngine.js';

export const budgetService = {
  /**
   * Retrieves a single month budget with calculated financial metrics.
   *
   * @param {string} userId
   * @param {string} monthStr - e.g. "2026-11"
   * @returns {Promise<object>}
   */
  async getMonthBudget(userId, monthStr) {
    const budgetRes = await query(
      `SELECT * FROM monthly_budgets WHERE user_id = $1 AND month = $2`,
      [userId, monthStr]
    );

    let budget = budgetRes.rows[0] || null;

    if (!budget) {
      budget = {
        id: 'mb_' + Date.now(),
        user_id: userId,
        month: monthStr,
        pocket_money: 2500,
        date_received: 1,
        savings_goal: 1000,
        daily_limit: 50,
        is_custom_limit: false,
        starting_reserve: 0,
        carry_forward_decision: null,
        previous_month_remaining_reserve: 0,
        is_configured: false,
      };
    }

    const txRes = await query(
      `SELECT * FROM transactions WHERE user_id = $1 AND month = $2 ORDER BY transaction_date ASC, created_at ASC`,
      [userId, monthStr]
    );

    const formattedTxs = txRes.rows.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      category: t.category,
      date: typeof t.transaction_date === 'string'
        ? t.transaction_date.slice(0, 10)
        : t.transaction_date.toISOString().slice(0, 10),
      note: t.note,
      createdAt: t.created_at,
    }));

    // Execute pure shared financeEngine
    const calculation = recalculateMonth({
      month: budget.month,
      receivedDate: Number(budget.date_received),
      dailyLimit: Number(budget.daily_limit),
      savingsGoal: Number(budget.savings_goal),
      pocketMoney: Number(budget.pocket_money),
      transactions: formattedTxs,
      startingReserve: Number(budget.starting_reserve),
    });

    return {
      ...budget,
      transactions: formattedTxs,
      calculation,
    };
  },

  /**
   * Saves or updates monthly budget configuration.
   */
  async saveMonthBudget(userId, budgetData) {
    const month = budgetData.month;
    const existing = await query(
      `SELECT id FROM monthly_budgets WHERE user_id = $1 AND month = $2`,
      [userId, month]
    );

    const id = existing.rows[0]?.id || 'mb_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const pocketMoney = Math.max(0, Number(budgetData.pocketMoney ?? budgetData.pocket_money) || 0);
    const dateReceived = Math.max(1, Math.min(31, Number(budgetData.dateReceived ?? budgetData.date_received) || 1));
    const savingsGoal = Math.max(0, Number(budgetData.savingsGoal ?? budgetData.savings_goal) || 0);
    const dailyLimit = Math.max(0, Number(budgetData.dailyLimit ?? budgetData.daily_limit) || 0);
    const isCustomLimit = Boolean(budgetData.isCustomLimit ?? budgetData.is_custom_limit);
    const startingReserve = Math.max(0, Number(budgetData.startingReserve ?? budgetData.starting_reserve) || 0);
    const carryDecision = budgetData.carryForwardDecision ?? budgetData.carry_forward_decision ?? null;
    const prevRemaining = Number(budgetData.previousMonthRemainingReserve ?? budgetData.previous_month_remaining_reserve) || 0;
    const isConfigured = true;

    await query(
      `INSERT INTO monthly_budgets (
        id, user_id, month, pocket_money, date_received, savings_goal,
        daily_limit, is_custom_limit, starting_reserve, carry_forward_decision,
        previous_month_remaining_reserve, is_configured, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (user_id, month) DO UPDATE SET
        pocket_money = EXCLUDED.pocket_money,
        date_received = EXCLUDED.date_received,
        savings_goal = EXCLUDED.savings_goal,
        daily_limit = EXCLUDED.daily_limit,
        is_custom_limit = EXCLUDED.is_custom_limit,
        starting_reserve = EXCLUDED.starting_reserve,
        carry_forward_decision = EXCLUDED.carry_forward_decision,
        previous_month_remaining_reserve = EXCLUDED.previous_month_remaining_reserve,
        is_configured = EXCLUDED.is_configured,
        updated_at = NOW()`,
      [
        id, userId, month, pocketMoney, dateReceived, savingsGoal,
        dailyLimit, isCustomLimit, startingReserve, carryDecision,
        prevRemaining, isConfigured
      ]
    );

    return this.getMonthBudget(userId, month);
  },

  /**
   * Adds or updates a transaction in the database.
   * Runs shared financeEngine and cascades downstream if reserve carried forward.
   */
  async addOrUpdateTransaction(userId, txData) {
    const id = txData.id || 'tx_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const amount = Math.max(0, Number(txData.amount) || 0);
    const category = txData.category || 'Other';
    const dateStr = txData.date || txData.transaction_date;
    const monthStr = dateStr.slice(0, 7);
    const note = (txData.note || '').trim();

    // Ensure month budget row exists
    let monthRes = await query(
      `SELECT id FROM monthly_budgets WHERE user_id = $1 AND month = $2`,
      [userId, monthStr]
    );

    let monthId = monthRes.rows[0]?.id;
    if (!monthId) {
      const newMonth = await this.saveMonthBudget(userId, { month: monthStr });
      monthId = newMonth.id;
    }

    await query(
      `INSERT INTO transactions (id, user_id, month_id, month, amount, category, transaction_date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         amount = EXCLUDED.amount,
         category = EXCLUDED.category,
         transaction_date = EXCLUDED.transaction_date,
         note = EXCLUDED.note,
         updated_at = NOW()`,
      [id, userId, monthId, monthStr, amount, category, dateStr, note]
    );

    // Cascade downstream reserve recalculation
    await this.cascadeDownstream(userId, monthStr);

    return this.getMonthBudget(userId, monthStr);
  },

  /**
   * Deletes a transaction and recalculates the budget.
   */
  async deleteTransaction(userId, txId) {
    const txRes = await query(
      `SELECT month FROM transactions WHERE id = $1 AND user_id = $2`,
      [txId, userId]
    );

    if (txRes.rows.length === 0) {
      throw new Error('Transaction not found or unauthorized.');
    }

    const monthStr = txRes.rows[0].month;

    await query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
      [txId, userId]
    );

    await this.cascadeDownstream(userId, monthStr);
    return this.getMonthBudget(userId, monthStr);
  },

  /**
   * Resolves carry-forward decision on new month.
   */
  async resolveCarryForward(userId, { newMonth, carryForward }) {
    const [year, month] = newMonth.split('-').map(Number);
    const prevMonthStr = month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, '0')}`;

    const prevMonthBudget = await this.getMonthBudget(userId, prevMonthStr);
    const prevFinalReserve = prevMonthBudget.calculation.currentReserveBalance;

    // Record decision and remaining reserve in previous month
    await query(
      `UPDATE monthly_budgets
       SET carry_forward_decision = $1, previous_month_remaining_reserve = $2, updated_at = NOW()
       WHERE user_id = $3 AND month = $4`,
      [carryForward ? 'carried' : 'reset', prevFinalReserve, userId, prevMonthStr]
    );

    const startingReserve = carryForward ? prevFinalReserve : 0;

    // Initialize or update new month's starting reserve
    await this.saveMonthBudget(userId, {
      month: newMonth,
      pocketMoney: prevMonthBudget.pocket_money,
      dateReceived: prevMonthBudget.date_received,
      savingsGoal: prevMonthBudget.savings_goal,
      dailyLimit: prevMonthBudget.daily_limit,
      isCustomLimit: prevMonthBudget.is_custom_limit,
      startingReserve,
      carryForwardDecision: carryForward ? 'carried' : 'reset',
    });

    return this.getMonthBudget(userId, newMonth);
  },

  /**
   * Cascades reserve balance adjustments to downstream months if carried forward.
   */
  async cascadeDownstream(userId, startMonthStr) {
    let currentMonth = startMonthStr;

    while (true) {
      const budget = await this.getMonthBudget(userId, currentMonth);
      if (budget.carry_forward_decision !== 'carried') {
        break;
      }

      const [y, m] = currentMonth.split('-').map(Number);
      const nextMonthStr = m === 12
        ? `${y + 1}-01`
        : `${y}-${String(m + 1).padStart(2, '0')}`;

      const nextRes = await query(
        `SELECT id FROM monthly_budgets WHERE user_id = $1 AND month = $2`,
        [userId, nextMonthStr]
      );

      if (nextRes.rows.length === 0) {
        break;
      }

      const newFinalReserve = budget.calculation.currentReserveBalance;

      await query(
        `UPDATE monthly_budgets
         SET starting_reserve = $1, previous_month_remaining_reserve = $1, updated_at = NOW()
         WHERE user_id = $2 AND month = $3`,
        [newFinalReserve, userId, nextMonthStr]
      );

      currentMonth = nextMonthStr;
    }
  },

  /**
   * Returns all month records for the user in chronological order.
   */
  async getAllMonths(userId) {
    const res = await query(
      `SELECT month FROM monthly_budgets WHERE user_id = $1 ORDER BY month ASC`,
      [userId]
    );

    const months = [];
    for (const row of res.rows) {
      const b = await this.getMonthBudget(userId, row.month);
      months.push(b);
    }
    return months;
  },

  /**
   * Migrates local localStorage records into PostgreSQL upon initial login.
   */
  async syncLocalData(userId, localRecordsDict = {}) {
    for (const [monthKey, localRec] of Object.entries(localRecordsDict)) {
      if (!localRec) continue;
      // Save budget record
      await this.saveMonthBudget(userId, {
        month: monthKey,
        pocketMoney: localRec.pocketMoney,
        dateReceived: localRec.dateReceived,
        savingsGoal: localRec.savingsGoal,
        dailyLimit: localRec.dailyLimit,
        isCustomLimit: localRec.isCustomLimit,
        startingReserve: localRec.startingReserve || 0,
        carryForwardDecision: localRec.carryForwardDecision,
      });

      // Insert all transactions
      if (Array.isArray(localRec.transactions)) {
        for (const tx of localRec.transactions) {
          await this.addOrUpdateTransaction(userId, {
            id: tx.id,
            amount: tx.amount,
            category: tx.category,
            date: tx.date,
            note: tx.note,
          });
        }
      }
    }
    return this.getAllMonths(userId);
  },
};

