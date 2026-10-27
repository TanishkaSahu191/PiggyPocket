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

/**
 * Resolves the applicable limit for each day in the calendar month.
 */
function resolveLimitsForMonth(
  allDays: string[],
  receivedOn: string,
  autoDailyLimits: Map<string, number>,
  customLimits: MonthBudgetInput['effectiveDailyLimits']
): Map<string, number> {
  const sortedCustom = [...(customLimits || [])].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  );

  const limits = new Map<string, number>();

  for (const dateStr of allDays) {
    if (dateStr < receivedOn) {
      limits.set(dateStr, 0);
      continue;
    }

    let customLimit: number | null = null;
    for (const item of sortedCustom) {
      if (item.effectiveFrom <= dateStr) {
        customLimit = item.limitPaise;
      } else {
        break;
      }
    }

    if (customLimit !== null) {
      limits.set(dateStr, customLimit);
    } else {
      limits.set(dateStr, autoDailyLimits.get(dateStr) || 0);
    }
  }

  return limits;
}

/**
 * Computes daily breakdown for the month, implementing the Reservoir algorithm
 * in chronological date order from receivedOn.
 */
export function computeDailyBreakdown(
  input: MonthBudgetInput,
  asOfDateInput?: string
): DayBreakdownRow[] {
  validateBudgetInput(input);

  const timezone = input.timezone || 'Asia/Kolkata';
  const { pocketMoneyPaise, originalSavingsGoalPaise, receivedOn } = input;
  const spendingBudgetPaise = pocketMoneyPaise - originalSavingsGoalPaise;
  const ruleVersion = String(input.rule_version || 'v2');

  const { year, month } = parseYearMonth(receivedOn);
  const allDays = getAllDaysInMonth(year, month);
  const autoDailyLimits = computeAutoDailyLimits(spendingBudgetPaise, receivedOn, timezone);
  const customLimitsList = input.effectiveDailyLimits || (input as any).dailyLimits;
  const dailyLimits = resolveLimitsForMonth(
    allDays,
    receivedOn,
    autoDailyLimits,
    customLimitsList
  );

  // Group active (non-deleted) transactions belonging to this calendar month by local date
  const spentByDay = new Map<string, number>();
  for (const tx of input.transactions || []) {
    if (tx.deletedAt) continue;
    if (
      typeof tx.amountPaise !== 'number' ||
      !Number.isInteger(tx.amountPaise) ||
      tx.amountPaise < 0
    ) {
      throw new Error(`Invalid transaction amountPaise: ${tx.amountPaise}`);
    }
    const localDate = getLocalDateString(tx.occurredAt, timezone);
    const existing = spentByDay.get(localDate) || 0;
    spentByDay.set(localDate, existing + tx.amountPaise);
  }

  const asOfDate = asOfDateInput || getLocalDateString(new Date(), timezone);
  const rows: DayBreakdownRow[] = [];

  let runningReservoir = 0;
  let runningCumulativeShortfall = 0;

  for (const dateStr of allDays) {
    const isPeriodDay = dateStr >= receivedOn;
    const limitPaise = dailyLimits.get(dateStr) || 0;
    const spentPaise = spentByDay.get(dateStr) || 0;

    let dailyOverspendPaise = 0;
    let bankedPaise = 0;
    let reservoirUsedPaise = 0;
    let shortfallPaise = 0;

    if (isPeriodDay) {
      if (ruleVersion === 'v1') {
        // Legacy v1 rule: No reservoir buffer, raw daily overspends directly accumulate
        dailyOverspendPaise = Math.max(0, spentPaise - limitPaise);
        shortfallPaise = dailyOverspendPaise;
        runningCumulativeShortfall += shortfallPaise;
      } else {
        // v2 Reservoir algorithm (Default)
        if (spentPaise <= limitPaise) {
          bankedPaise = limitPaise - spentPaise;
          runningReservoir += bankedPaise;
          reservoirUsedPaise = 0;
          shortfallPaise = 0;
          dailyOverspendPaise = 0;
        } else {
          // Spent exceeds limit
          const excess = spentPaise - limitPaise;
          dailyOverspendPaise = excess;
          const covered = Math.min(excess, runningReservoir);
          runningReservoir -= covered;
          reservoirUsedPaise = covered;
          bankedPaise = 0;
          shortfallPaise = excess - covered;
          runningCumulativeShortfall += shortfallPaise;
        }
      }
    }

    const projectedSavingsPaise =
      originalSavingsGoalPaise - runningCumulativeShortfall;
    const isTodayProvisionally = dateStr === asOfDate;

    // Remaining allowance for this specific day
    const remainingPaise = isPeriodDay ? Math.max(0, limitPaise - spentPaise) : 0;

    rows.push({
      date: dateStr,
      isPeriodDay,
      limitPaise,
      spentPaise,
      dailyOverspendPaise,
      bankedPaise,
      reservoirUsedPaise,
      reservoirBalancePaise: runningReservoir,
      shortfallPaise,
      cumulativeShortfallPaise: runningCumulativeShortfall,
      projectedSavingsPaise,
      isTodayProvisionally,
      // Backwards-compatibility aliases
      remainingPaise,
      overspendPaise: dailyOverspendPaise,
      cumulativeOverspendPaise: runningCumulativeShortfall,
      adjustedProjectedSavingsPaise: projectedSavingsPaise
    });
  }

  return rows;
}

/**
 * Computes summary metrics for a specific single day.
 */
export function computeDailySummary(
  input: MonthBudgetInput,
  targetDate: string
): DailySummaryOutput {
  const breakdown = computeDailyBreakdown(input, targetDate);
  const targetIndex = breakdown.findIndex((r) => r.date === targetDate);
  if (targetIndex === -1) {
    throw new Error(
      `Date ${targetDate} is outside the calendar month of receivedOn (${input.receivedOn})`
    );
  }

  const row = breakdown[targetIndex];

  // Start of day reservoir = reservoir from previous period day (or 0 if first period day)
  let startOfDayReservoirPaise = 0;
  if (targetIndex > 0) {
    const prevRow = breakdown[targetIndex - 1];
    if (prevRow.isPeriodDay) {
      startOfDayReservoirPaise = prevRow.reservoirBalancePaise;
    }
  }

  // availableToSpendToday = today's remaining allowance + reservoir from earlier days
  const todayRemainingAllowance = Math.max(0, row.limitPaise - row.spentPaise);
  const availableToSpendTodayPaise = row.isPeriodDay
    ? todayRemainingAllowance + startOfDayReservoirPaise
    : 0;

  return {
    ...row,
    startOfDayReservoirPaise,
    availableToSpendTodayPaise
  };
}

/**
 * Computes full monthly budget summary as of a given date.
 */
export function computeMonthSummary(
  input: MonthBudgetInput,
  asOfDateInput?: string
): MonthSummaryOutput {
  validateBudgetInput(input);
  const timezone = input.timezone || 'Asia/Kolkata';
  const { pocketMoneyPaise, originalSavingsGoalPaise, receivedOn } = input;
  const spendingBudgetPaise = pocketMoneyPaise - originalSavingsGoalPaise;
  const ruleVersion = String(input.rule_version || 'v2');

  const { year, month, day: startDay } = parseYearMonth(receivedOn);
  const totalDaysInMonth = getDaysInMonth(year, month);
  const periodDays = totalDaysInMonth - startDay + 1;
  const lastDayOfMonth = formatDayString(year, month, totalDaysInMonth);

  const asOfDate = asOfDateInput || getLocalDateString(new Date(), timezone);
  const breakdown = computeDailyBreakdown(input, asOfDate);

  // Reservoir balance and cumulative shortfall as of asOfDate
  let reservoirBalancePaise = 0;
  let cumulativeShortfallPaise = 0;
  let asOfRow: DayBreakdownRow | undefined;
  let prevRowBeforeAsOf: DayBreakdownRow | undefined;

  for (let i = 0; i < breakdown.length; i++) {
    const row = breakdown[i];
    if (row.date <= asOfDate && row.isPeriodDay) {
      reservoirBalancePaise = row.reservoirBalancePaise;
      cumulativeShortfallPaise = row.cumulativeShortfallPaise;
    }
    if (row.date === asOfDate) {
      asOfRow = row;
      if (i > 0 && breakdown[i - 1].isPeriodDay) {
        prevRowBeforeAsOf = breakdown[i - 1];
      }
    }
  }

  // Total spent across the calendar month
  let totalSpentPaise = 0;
  let sumOfPeriodLimits = 0;
  for (const row of breakdown) {
    totalSpentPaise += row.spentPaise;
    if (row.isPeriodDay) {
      sumOfPeriodLimits += row.limitPaise;
    }
  }

  const remainingMonthlyBudgetPaise = spendingBudgetPaise - totalSpentPaise;
  const projectedSavingsPaise = originalSavingsGoalPaise - cumulativeShortfallPaise;
  const protectedSavingsPaise = originalSavingsGoalPaise; // Never changes

  // unallocatedBudget = spendingBudget - sum of daily allowances for the period
  const unallocatedBudgetPaise = spendingBudgetPaise - sumOfPeriodLimits;
  const limitsExceedSpendingBudget = sumOfPeriodLimits > spendingBudgetPaise;

  // availableToSpendToday = today's remaining allowance + reservoir from earlier days
  let availableToSpendTodayPaise = 0;
  if (asOfRow && asOfRow.isPeriodDay) {
    const todayRemainingAllowance = Math.max(0, asOfRow.limitPaise - asOfRow.spentPaise);
    const reservoirFromEarlierDays = prevRowBeforeAsOf ? prevRowBeforeAsOf.reservoirBalancePaise : 0;
    availableToSpendTodayPaise = todayRemainingAllowance + reservoirFromEarlierDays;
  }

  // Unspent reservoir at month end (reported as unspent budget, not added to savings automatically)
  const lastPeriodRow = breakdown[breakdown.length - 1];
  const unspentReservoirPaise = lastPeriodRow ? lastPeriodRow.reservoirBalancePaise : 0;

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
    if (cumulativeShortfallPaise === 0) {
      goalStatus = 'ACHIEVED';
    } else if (projectedSavingsPaise > 0) {
      goalStatus = 'PARTIAL';
    } else {
      goalStatus = 'MISSED';
    }
  } else {
    if (cumulativeShortfallPaise === 0) {
      goalStatus = 'ON_TRACK';
    } else if (projectedSavingsPaise > 0) {
      goalStatus = 'REDUCED';
    } else {
      goalStatus = 'AT_RISK_OR_LOST';
    }
  }

  return {
    pocketMoneyPaise,
    originalSavingsGoalPaise,
    protectedSavingsPaise,
    spendingBudgetPaise,
    totalSpentPaise,
    remainingMonthlyBudgetPaise,
    reservoirBalancePaise,
    cumulativeShortfallPaise,
    projectedSavingsPaise,
    availableToSpendTodayPaise,
    unallocatedBudgetPaise,
    limitsExceedSpendingBudget,
    unspentReservoirPaise,
    recommendedDailyLimitPaise,
    goalStatus,
    monthlyBudgetExceeded: remainingMonthlyBudgetPaise < 0,
    asOfDate,
    periodDays,
    remainingDays,
    rule_version: ruleVersion,
    // Backwards-compatibility aliases
    cumulativeOverspendPaise: cumulativeShortfallPaise,
    adjustedProjectedSavingsPaise: projectedSavingsPaise
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

  return result.sort((a, b) => b.totalPaise - a.totalPaise);
}
