export type GoalStatusCurrent = 'ON_TRACK' | 'REDUCED' | 'AT_RISK_OR_LOST';
export type GoalStatusFinished = 'ACHIEVED' | 'PARTIAL' | 'MISSED';
export type GoalStatus = GoalStatusCurrent | GoalStatusFinished;

export interface EffectiveDailyLimit {
  effectiveFrom: string; // 'YYYY-MM-DD'
  limitPaise: number;
}

export interface TransactionInput {
  id: string;
  amountPaise: number;
  occurredAt: string | Date; // ISO string or Date
  category?: string;
  description?: string;
  deletedAt?: string | Date | null;
}

export interface MonthBudgetInput {
  pocketMoneyPaise: number;
  receivedOn: string; // 'YYYY-MM-DD'
  originalSavingsGoalPaise: number;
  timezone?: string; // default 'Asia/Kolkata'
  effectiveDailyLimits?: EffectiveDailyLimit[];
  transactions: TransactionInput[];
  rule_version?: string | number; // e.g. 'v2' (reservoir-enabled) or 'v1'
}

export interface DayBreakdownRow {
  date: string; // 'YYYY-MM-DD'
  isPeriodDay: boolean; // whether on or after receivedOn in month
  limitPaise: number;
  spentPaise: number;
  dailyOverspendPaise: number; // spent above the limit before the reservoir helps
  bankedPaise: number; // amount of unspent limit added to reservoir
  reservoirUsedPaise: number; // amount of reservoir consumed to cover excess
  reservoirBalancePaise: number; // running reservoir balance at the end of the day
  shortfallPaise: number; // excess not covered by reservoir
  cumulativeShortfallPaise: number; // sum of shortfall from receivedOn through this date
  projectedSavingsPaise: number; // originalSavingsGoal - cumulativeShortfall
  isTodayProvisionally?: boolean; // labeled if date === asOfDate
  // Backwards compatibility alias
  remainingPaise: number;
  overspendPaise: number;
  cumulativeOverspendPaise: number;
  adjustedProjectedSavingsPaise: number;
}

export interface MonthSummaryOutput {
  pocketMoneyPaise: number;
  originalSavingsGoalPaise: number;
  protectedSavingsPaise: number; // originalSavingsGoal, never changes
  spendingBudgetPaise: number;
  totalSpentPaise: number;
  remainingMonthlyBudgetPaise: number;
  reservoirBalancePaise: number; // reservoir balance as of asOfDate
  cumulativeShortfallPaise: number;
  projectedSavingsPaise: number;
  availableToSpendTodayPaise: number; // today's remaining allowance + reservoir from earlier days
  unallocatedBudgetPaise: number; // spendingBudget - sum of daily allowances for the period
  limitsExceedSpendingBudget: boolean; // true if limits add up to more than spendingBudget
  unspentReservoirPaise: number; // leftover reservoir at month end, reported as unspent budget
  recommendedDailyLimitPaise: number;
  goalStatus: GoalStatus;
  monthlyBudgetExceeded: boolean;
  asOfDate: string; // 'YYYY-MM-DD'
  periodDays: number;
  remainingDays: number;
  rule_version: string;
  // Backwards compatibility aliases
  cumulativeOverspendPaise: number;
  adjustedProjectedSavingsPaise: number;
}

export interface DailySummaryOutput extends DayBreakdownRow {
  availableToSpendTodayPaise: number;
  startOfDayReservoirPaise: number;
}

export interface CategoryTotal {
  category: string;
  totalPaise: number;
  count: number;
  percentageOfTotal: number;
}
