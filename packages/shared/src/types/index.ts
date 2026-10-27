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
}

export interface DayBreakdownRow {
  date: string; // 'YYYY-MM-DD'
  isPeriodDay: boolean; // whether on or after receivedOn in month
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  overspendPaise: number;
  cumulativeOverspendPaise: number;
  adjustedProjectedSavingsPaise: number;
}

export interface MonthSummaryOutput {
  pocketMoneyPaise: number;
  originalSavingsGoalPaise: number;
  spendingBudgetPaise: number;
  totalSpentPaise: number;
  remainingMonthlyBudgetPaise: number;
  cumulativeOverspendPaise: number;
  adjustedProjectedSavingsPaise: number;
  recommendedDailyLimitPaise: number;
  goalStatus: GoalStatus;
  monthlyBudgetExceeded: boolean;
  asOfDate: string; // 'YYYY-MM-DD'
  periodDays: number;
  remainingDays: number;
}

export interface DailySummaryOutput {
  date: string;
  isPeriodDay: boolean;
  limitPaise: number;
  spentPaise: number;
  remainingPaise: number;
  overspendPaise: number;
  cumulativeOverspendPaise: number;
  adjustedProjectedSavingsPaise: number;
}

export interface CategoryTotal {
  category: string;
  totalPaise: number;
  count: number;
  percentageOfTotal: number;
}
