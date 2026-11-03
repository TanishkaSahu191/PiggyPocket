/**
 * SMART BUDGET TRACKER - CORE FINANCIAL CALCULATION ENGINE
 *
 * Pure mathematical functions for student budget calculations.
 * STRICT RULES:
 * - Standalone module: NO React or UI imports.
 * - Pure functions only (no side effects, no mutations).
 * - Reserve Wallet must never be negative.
 * - Original Savings Goal is never overwritten.
 * - Adjusted Projected Savings is a projection, not a bank balance.
 * - Reusable on web, Node.js backend, and Android (Capacitor).
 */

/**
 * Calculates the initial monthly spending budget.
 * Initial Monthly Spending Budget = Pocket Money - Original Savings Goal.
 *
 * @param {number} pocketMoney - Total pocket money for the cycle.
 * @param {number} savingsGoal - The student's locked savings target.
 * @returns {number} Initial spending budget (clamped to >= 0).
 */
export function calculateInitialSpendingBudget(pocketMoney, savingsGoal) {
  const pm = Number(pocketMoney) || 0;
  const sg = Number(savingsGoal) || 0;
  return Math.max(0, pm - sg);
}

/**
 * Calculates the default daily spending limit.
 * Default Daily Limit = Initial Monthly Spending Budget / days in month.
 *
 * @param {number} spendingBudget - Monthly spending budget.
 * @param {number} daysInMonth - Number of days in the monthly cycle.
 * @returns {number} Default daily spending limit.
 */
export function calculateDefaultDailyLimit(spendingBudget, daysInMonth) {
  const budget = Number(spendingBudget) || 0;
  const days = Number(daysInMonth) || 0;
  if (days <= 0 || budget <= 0) return 0;
  return Number((budget / days).toFixed(2));
}

/**
 * Processes daily spending against the daily limit and virtual reserve.
 *
 * Exact Formulas:
 * 1. Daily Surplus = max(0, DailyLimit - ActualSpending)
 * 2. Daily Overspending = max(0, ActualSpending - DailyLimit)
 * 3. Reserve Used = min(PreviousReserveBalance, DailyOverspending)
 * 4. Savings Deduction = DailyOverspending - ReserveUsed
 * 5. New Reserve Balance = PreviousReserve + DailySurplus - ReserveUsed
 *
 * Hard Rules:
 * - Reserve Wallet must never be negative.
 *
 * @param {object} params
 * @param {number} params.dailyLimit - Target daily spending limit.
 * @param {number} [params.actualSpending=0] - Actual money spent on this day.
 * @param {number} [params.previousReserve=0] - Reserve balance brought forward.
 * @returns {{
 *   surplus: number,
 *   overspending: number,
 *   reserveUsed: number,
 *   savingsDeduction: number,
 *   newReserve: number
 * }}
 */
export function processDay({ dailyLimit = 0, actualSpending = 0, previousReserve = 0 }) {
  const limit = Math.max(0, Number(dailyLimit) || 0);
  const spent = Math.max(0, Number(actualSpending) || 0);
  const prevReserve = Math.max(0, Number(previousReserve) || 0);

  // 1. Daily Surplus = max(0, DailyLimit - ActualSpending)
  const surplus = Math.max(0, limit - spent);

  // 2. Daily Overspending = max(0, ActualSpending - DailyLimit)
  const overspending = Math.max(0, spent - limit);

  // 3. Reserve Used = min(PreviousReserveBalance, DailyOverspending)
  const reserveUsed = Math.min(prevReserve, overspending);

  // 4. Savings Deduction = DailyOverspending - ReserveUsed
  const savingsDeduction = overspending - reserveUsed;

  // 5. New Reserve Balance = PreviousReserve + DailySurplus - ReserveUsed
  // Clamped to >= 0 to enforce the hard rule that reserve is never negative
  const newReserve = Math.max(0, prevReserve + surplus - reserveUsed);

  return {
    surplus,
    overspending,
    reserveUsed,
    savingsDeduction,
    newReserve,
  };
}

/**
 * Helper to get the number of days in a specific year and month.
 * @param {number} year
 * @param {number} month - 1-indexed (1 = January, 12 = December)
 * @returns {number}
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Helper to generate calendar date strings (YYYY-MM-DD) for a monthly cycle
 * starting on any day of the month (e.g. 1st, 5th, 20th).
 *
 * @param {number} year - e.g. 2026
 * @param {number} month - 1 to 12
 * @param {number} [receivedDate=1] - Day of the month money is received (1-31).
 * @returns {string[]} Array of ISO date strings for the cycle.
 */
export function generateCycleDates(year, month, receivedDate = 1) {
  const dates = [];
  const startDay = Math.max(1, Math.min(31, Number(receivedDate) || 1));
  const startDate = new Date(year, month - 1, startDay);

  // Cycle lasts until the day before the next month's received date
  const nextMonthStart = new Date(year, month, startDay);
  const currentDate = new Date(startDate);

  while (currentDate < nextMonthStart) {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

/**
 * Groups raw transaction objects by their date string or key.
 * Sums amounts for multiple transactions on the same date.
 *
 * @param {Array<{ date: string|number, amount?: number, actualSpending?: number }>} transactions
 * @returns {Record<string, { totalAmount: number, items: Array<object> }>}
 */
export function groupTransactionsByDate(transactions = []) {
  const grouped = {};
  for (const tx of transactions) {
    if (!tx) continue;
    const dateKey = String(tx.date ?? tx.day ?? '').trim();
    if (!dateKey) continue;

    const amount = Number(tx.amount ?? tx.actualSpending ?? 0);
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        totalAmount: 0,
        items: []
      };
    }
    grouped[dateKey].totalAmount += amount;
    grouped[dateKey].items.push(tx);
  }
  return grouped;
}

/**
 * Recalculates an entire monthly cycle chronologically.
 *
 * Supports:
 * - Standard months starting on the 1st or custom dates (e.g. 5th, 10th).
 * - Explicit days list (e.g. ['Sat', 'Sun', 'Mon', 'Tue'] or ['2026-11-01', ...]).
 * - Chronological replay of reserve and savings deduction from received date.
 * - Guaranteed immutability of the original savings goal.
 *
 * @param {object} params
 * @param {string|object} [params.month] - Month string (e.g. '2026-11') or object { year, month }.
 * @param {number} [params.receivedDate=1] - Day of the month pocket money was received.
 * @param {number} params.dailyLimit - Configured daily spending limit.
 * @param {number} params.savingsGoal - Original locked savings target.
 * @param {number} [params.pocketMoney] - Monthly pocket money (optional).
 * @param {Array<object>} [params.transactions=[]] - Array of transaction objects.
 * @param {number} [params.startingReserve=0] - Initial reserve brought into this cycle.
 * @param {string[]} [params.dates] - Optional explicit list of dates/day labels to process.
 * @returns {{
 *   perDayBreakdown: Array<object>,
 *   totalSpent: number,
 *   remainingSpendingBudget: number,
 *   initialSpendingBudget: number,
 *   reserveAccumulated: number,
 *   reserveUsed: number,
 *   currentReserveBalance: number,
 *   cumulativeSavingsDeductions: number,
 *   originalSavingsGoal: number,
 *   adjustedProjectedSavings: number,
 *   savingsGoalAchieved: boolean,
 *   isProjectionNotice: string
 * }}
 */
export function recalculateMonth({
  month,
  receivedDate = 1,
  dailyLimit = 0,
  savingsGoal = 0,
  pocketMoney,
  transactions = [],
  startingReserve = 0,
  dates: explicitDates,
}) {
  // Preserve original inputs immutably
  const originalGoal = Number(savingsGoal) || 0;
  const limit = Math.max(0, Number(dailyLimit) || 0);
  let runningReserve = Math.max(0, Number(startingReserve) || 0);

  // Group transactions by date
  const groupedTx = groupTransactionsByDate(transactions);

  // Determine chronological dates to process
  let dateSequence = [];

  if (Array.isArray(explicitDates) && explicitDates.length > 0) {
    dateSequence = [...explicitDates];
  } else if (typeof month === 'string' && month.includes('-')) {
    const [y, m] = month.split('-').map(Number);
    dateSequence = generateCycleDates(y, m, receivedDate);
  } else if (typeof month === 'object' && month !== null && month.year && month.month) {
    dateSequence = generateCycleDates(month.year, month.month, receivedDate);
  } else {
    // If no calendar month is provided, extract unique dates from transactions preserve insertion order
    const txDates = Object.keys(groupedTx);
    dateSequence = txDates.length > 0 ? txDates : [];
  }

  const perDayBreakdown = [];
  let totalSpent = 0;
  let reserveAccumulated = 0;
  let totalReserveUsed = 0;
  let cumulativeSavingsDeductions = 0;

  for (const dateKey of dateSequence) {
    const txData = groupedTx[dateKey];
    const actualSpending = txData ? txData.totalAmount : 0;
    const dayTransactions = txData ? txData.items : [];

    const dayResult = processDay({
      dailyLimit: limit,
      actualSpending,
      previousReserve: runningReserve,
    });

    totalSpent += actualSpending;
    reserveAccumulated += dayResult.surplus;
    totalReserveUsed += dayResult.reserveUsed;
    cumulativeSavingsDeductions += dayResult.savingsDeduction;

    perDayBreakdown.push({
      date: dateKey,
      dailyLimit: limit,
      actualSpending,
      surplus: dayResult.surplus,
      overspending: dayResult.overspending,
      reserveUsed: dayResult.reserveUsed,
      savingsDeduction: dayResult.savingsDeduction,
      startingReserve: runningReserve,
      newReserve: dayResult.newReserve,
      hasWarning: dayResult.savingsDeduction > 0, // Alert: Reserve wallet ran out, touched savings
      transactions: dayTransactions,
    });

    // Advance running reserve to next day
    runningReserve = dayResult.newReserve;
  }

  // Calculate adjusted projected savings
  const adjustedProjectedSavings = originalGoal - cumulativeSavingsDeductions;
  const savingsGoalAchieved = cumulativeSavingsDeductions === 0 && adjustedProjectedSavings >= originalGoal;

  // Determine initial monthly budget
  const initialSpendingBudget = pocketMoney !== undefined
    ? calculateInitialSpendingBudget(pocketMoney, originalGoal)
    : limit * dateSequence.length;

  const remainingSpendingBudget = initialSpendingBudget - totalSpent;

  return {
    perDayBreakdown,
    totalSpent,
    initialSpendingBudget,
    remainingSpendingBudget,
    reserveAccumulated,
    reserveUsed: totalReserveUsed,
    currentReserveBalance: runningReserve,
    cumulativeSavingsDeductions,
    originalSavingsGoal: originalGoal,
    adjustedProjectedSavings,
    savingsGoalAchieved,
    isProjectionNotice: 'Adjusted Projected Savings is a PROJECTION, not a real bank balance.',
  };
}

/**
 * Pure helper to recalculate from a specific date forward after editing or deleting a transaction.
 *
 * @param {object} params
 * @param {Array<object>} params.transactions - Updated list of transactions.
 * @param {object} params.monthConfig - Configuration for the month (month, dailyLimit, savingsGoal, etc.).
 * @returns {object} Full recalculated monthly state.
 */
export function recalculateAfterTransactionChange({ transactions, monthConfig }) {
  return recalculateMonth({
    ...monthConfig,
    transactions,
  });
}

