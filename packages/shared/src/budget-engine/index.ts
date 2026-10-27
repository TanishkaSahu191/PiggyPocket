import {
  MonthBudgetInput,
  MonthSummaryOutput,
  DayBreakdownRow,
  DailySummaryOutput,
  CategoryTotal,
  GoalStatus
} from '../types/index.js';

export function getLocalDateString(
  dateInput: string | Date,
  timezone: string = 'Asia/Kolkata'
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date provided: ${String(dateInput)}`);
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

export function parseYearMonth(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid YYYY-MM-DD date string: ${dateStr}`);
  }
  return { year: parts[0], month: parts[1], day: parts[2] };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDayString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function getAllDaysInMonth(year: number, month: number): string[] {
  const totalDays = getDaysInMonth(year, month);
  const days: string[] = [];
  for (let d = 1; d <= totalDays; d++) {
    days.push(formatDayString(year, month, d));
  }
  return days;
}

export function validateBudgetInput(input: MonthBudgetInput): void {
  const { pocketMoneyPaise, originalSavingsGoalPaise } = input;

  if (
    typeof pocketMoneyPaise !== 'number' ||
    !Number.isInteger(pocketMoneyPaise) ||
    pocketMoneyPaise < 0
  ) {
    throw new Error(
      `pocketMoneyPaise must be a non-negative integer paise. Received: ${pocketMoneyPaise}`
    );
  }

  if (
    typeof originalSavingsGoalPaise !== 'number' ||
    !Number.isInteger(originalSavingsGoalPaise) ||
    originalSavingsGoalPaise < 0
  ) {
    throw new Error(
      `originalSavingsGoalPaise must be a non-negative integer paise. Received: ${originalSavingsGoalPaise}`
    );
  }

  if (originalSavingsGoalPaise > pocketMoneyPaise) {
    throw new Error(
      `originalSavingsGoalPaise (${originalSavingsGoalPaise}) cannot exceed pocketMoneyPaise (${pocketMoneyPaise})`
    );
  }
}

/**
 * Computes auto daily limits distributing leftover paise across the earliest period days
 * so that the sum of limits over all period days equals spendingBudget exactly.
 */
export function computeAutoDailyLimits(
  spendingBudgetPaise: number,
  receivedOn: string,
  _timezone: string = 'Asia/Kolkata'
): Map<string, number> {
  const { year, month, day: startDay } = parseYearMonth(receivedOn);
  const totalDaysInMonth = getDaysInMonth(year, month);
  const periodDays = totalDaysInMonth - startDay + 1;

  if (periodDays <= 0) {
    throw new Error(`receivedOn (${receivedOn}) is beyond month days`);
  }

  const baseDailyLimit = Math.floor(spendingBudgetPaise / periodDays);
  const leftoverPaise = spendingBudgetPaise % periodDays;

  const limits = new Map<string, number>();

  for (let i = 0; i < periodDays; i++) {
    const day = startDay + i;
    const dateStr = formatDayString(year, month, day);
    // Distribute leftover paise to the first leftoverPaise days
    const dailyLimit = i < leftoverPaise ? baseDailyLimit + 1 : baseDailyLimit;
    limits.set(dateStr, dailyLimit);
  }

  return limits;
}

export function computeDailyBreakdown(input: MonthBudgetInput): DayBreakdownRow[] {
  validateBudgetInput(input);

  const timezone = input.timezone || 'Asia/Kolkata';
  const { pocketMoneyPaise, originalSavingsGoalPaise, receivedOn } = input;
  const spendingBudgetPaise = pocketMoneyPaise - originalSavingsGoalPaise;

  const { year, month } = parseYearMonth(receivedOn);
  const allDays = getAllDaysInMonth(year, month);
  const autoDailyLimits = computeAutoDailyLimits(spendingBudgetPaise, receivedOn, timezone);

  // Group active (non-deleted) transactions belonging to this calendar month by local date
  const spentByDay = new Map<string, number>();
  for (const tx of input.transactions || []) {
    if (tx.deletedAt) continue;
    if (typeof tx.amountPaise !== 'number' || !Number.isInteger(tx.amountPaise) || tx.amountPaise < 0) {
      throw new Error(`Invalid transaction amountPaise: ${tx.amountPaise}`);
    }
    const localDate = getLocalDateString(tx.occurredAt, timezone);
    // Only accumulate for the days in this month
    const existing = spentByDay.get(localDate) || 0;
    spentByDay.set(localDate, existing + tx.amountPaise);
  }

  // Pre-sort effective custom limits
  const sortedCustomLimits = [...(input.effectiveDailyLimits || [])].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  );

  const resolveLimitForDay = (dateStr: string): number => {
    if (dateStr < receivedOn) return 0;

    // Find the latest custom limit whose effectiveFrom <= dateStr
    let applicableLimit: number | null = null;
    for (const item of sortedCustomLimits) {
      if (item.effectiveFrom <= dateStr) {
        applicableLimit = item.limitPaise;
      } else {
        break;
      }
    }

    if (applicableLimit !== null) {
      return applicableLimit;
    }

    return autoDailyLimits.get(dateStr) || 0;
  };

  const rows: DayBreakdownRow[] = [];
  let runningCumulativeOverspend = 0;

  for (const dateStr of allDays) {
    const isPeriodDay = dateStr >= receivedOn;
    const limitPaise = resolveLimitForDay(dateStr);
    const spentPaise = spentByDay.get(dateStr) || 0;

    let overspendPaise = 0;
    let remainingPaise = 0;

    if (isPeriodDay) {
      overspendPaise = Math.max(0, spentPaise - limitPaise);
      remainingPaise = Math.max(0, limitPaise - spentPaise);
      runningCumulativeOverspend += overspendPaise;
    }

    const adjustedProjectedSavingsPaise =
      originalSavingsGoalPaise - runningCumulativeOverspend;

    rows.push({
      date: dateStr,
      isPeriodDay,
      limitPaise,
      spentPaise,
      remainingPaise,
      overspendPaise,
      cumulativeOverspendPaise: runningCumulativeOverspend,
      adjustedProjectedSavingsPaise
    });
  }

  return rows;
}

export function computeDailySummary(
  input: MonthBudgetInput,
  targetDate: string
): DailySummaryOutput {
  const breakdown = computeDailyBreakdown(input);
  const row = breakdown.find((r) => r.date === targetDate);
  if (!row) {
    throw new Error(
      `Date ${targetDate} is outside the calendar month of receivedOn (${input.receivedOn})`
    );
  }
  return { ...row };
}

export function computeMonthSummary(
  input: MonthBudgetInput,
  asOfDateInput?: string
): MonthSummaryOutput {
  validateBudgetInput(input);
  const timezone = input.timezone || 'Asia/Kolkata';
  const { pocketMoneyPaise, originalSavingsGoalPaise, receivedOn } = input;
  const spendingBudgetPaise = pocketMoneyPaise - originalSavingsGoalPaise;

  const { year, month, day: startDay } = parseYearMonth(receivedOn);
  const totalDaysInMonth = getDaysInMonth(year, month);
  const periodDays = totalDaysInMonth - startDay + 1;
  const lastDayOfMonth = formatDayString(year, month, totalDaysInMonth);

  const asOfDate = asOfDateInput || getLocalDateString(new Date(), timezone);
  const breakdown = computeDailyBreakdown(input);

  // Cumulative overspend up to asOfDate
  let cumulativeOverspendPaise = 0;
  for (const row of breakdown) {
    if (row.date <= asOfDate && row.isPeriodDay) {
      cumulativeOverspendPaise = row.cumulativeOverspendPaise;
    }
  }

  // Total spent in this calendar month
  let totalSpentPaise = 0;
  for (const row of breakdown) {
    totalSpentPaise += row.spentPaise;
  }

  const remainingMonthlyBudgetPaise = spendingBudgetPaise - totalSpentPaise;
  const adjustedProjectedSavingsPaise =
    originalSavingsGoalPaise - cumulativeOverspendPaise;

  // Remaining days in period including asOfDate
  let remainingDays: number;
  if (asOfDate > lastDayOfMonth) {
    remainingDays = 0;
  } else {
    const effectiveStartDate = asOfDate < receivedOn ? receivedOn : asOfDate;
    const { day: effStartDay } = parseYearMonth(effectiveStartDate);
    remainingDays = Math.max(0, totalDaysInMonth - effStartDay + 1);
  }

  const recommendedDailyLimitPaise =
    remainingDays > 0
      ? Math.floor(Math.max(0, remainingMonthlyBudgetPaise) / remainingDays)
      : 0;

  const isMonthFinished = asOfDate > lastDayOfMonth;
  let goalStatus: GoalStatus;

  if (isMonthFinished) {
    if (cumulativeOverspendPaise === 0) {
      goalStatus = 'ACHIEVED';
    } else if (adjustedProjectedSavingsPaise > 0) {
      goalStatus = 'PARTIAL';
    } else {
      goalStatus = 'MISSED';
    }
  } else {
    if (cumulativeOverspendPaise === 0) {
      goalStatus = 'ON_TRACK';
    } else if (adjustedProjectedSavingsPaise > 0) {
      goalStatus = 'REDUCED';
    } else {
      goalStatus = 'AT_RISK_OR_LOST';
    }
  }

  return {
    pocketMoneyPaise,
    originalSavingsGoalPaise,
    spendingBudgetPaise,
    totalSpentPaise,
    remainingMonthlyBudgetPaise,
    cumulativeOverspendPaise,
    adjustedProjectedSavingsPaise,
    recommendedDailyLimitPaise,
    goalStatus,
    monthlyBudgetExceeded: remainingMonthlyBudgetPaise < 0,
    asOfDate,
    periodDays,
    remainingDays
  };
}

export function computeCategoryTotals(
  transactions: MonthBudgetInput['transactions'],
  options: {
    timezone?: string;
    targetYearMonth?: string; // 'YYYY-MM'
  } = {}
): CategoryTotal[] {
  const tz = options.timezone || 'Asia/Kolkata';
  const totals = new Map<string, { totalPaise: number; count: number }>();
  let overallTotalPaise = 0;

  for (const tx of transactions || []) {
    if (tx.deletedAt) continue;

    if (options.targetYearMonth) {
      const localDate = getLocalDateString(tx.occurredAt, tz);
      if (!localDate.startsWith(options.targetYearMonth)) {
        continue;
      }
    }

    const cat = tx.category || 'General';
    const existing = totals.get(cat) || { totalPaise: 0, count: 0 };
    existing.totalPaise += tx.amountPaise;
    existing.count += 1;
    totals.set(cat, existing);
    overallTotalPaise += tx.amountPaise;
  }

  const result: CategoryTotal[] = [];
  for (const [category, data] of totals.entries()) {
    result.push({
      category,
      totalPaise: data.totalPaise,
      count: data.count,
      percentageOfTotal:
        overallTotalPaise > 0
          ? Math.round((data.totalPaise / overallTotalPaise) * 10000) / 100
          : 0
    });
  }

  // Sort descending by totalPaise
  return result.sort((a, b) => b.totalPaise - a.totalPaise);
}
