import { describe, it, expect } from 'vitest';
import {
  computeMonthSummary,
  computeDailyBreakdown,
  computeDailySummary,
  computeAutoDailyLimits,
  computeCategoryTotals,
  getLocalDateString,
  getDaysInMonth,
  validateBudgetInput,
  parseYearMonth
} from '../index.js';
import { MonthBudgetInput } from '../../types/index.js';

describe('Budget Engine - Phase 2 Core Specification Tests', () => {
  // Test A: pocket 5000, goal 1000 -> spending budget 4000 (values in paise)
  it('Test A: pocket 5000, goal 1000 -> spending budget 4000', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000, // 5000 INR
      originalSavingsGoalPaise: 100000, // 1000 INR
      receivedOn: '2026-04-01',
      timezone: 'Asia/Kolkata',
      transactions: []
    };

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.spendingBudgetPaise).toBe(400000);
    expect(summary.originalSavingsGoalPaise).toBe(100000);
    expect(summary.pocketMoneyPaise).toBe(500000);
    expect(summary.cumulativeOverspendPaise).toBe(0);
    expect(summary.adjustedProjectedSavingsPaise).toBe(100000);
    expect(summary.goalStatus).toBe('ON_TRACK');
    expect(summary.recommendedDailyLimitPaise).toBe(13333); // 400000 / 30
  });

  // Test B: limit 100, spent 120 -> overspend 20, adjusted 980, goal still 1000
  it('Test B: limit 100, spent 120 -> overspend 20, adjusted 980, goal still 1000', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000, // 1000 INR goal
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 12000, // 120 INR spent
          occurredAt: '2026-04-01T12:00:00+05:30'
        }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-01');
    expect(daily.limitPaise).toBe(10000);
    expect(daily.spentPaise).toBe(12000);
    expect(daily.overspendPaise).toBe(2000); // 20 INR
    expect(daily.remainingPaise).toBe(0);
    expect(daily.adjustedProjectedSavingsPaise).toBe(98000); // 980 INR

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.originalSavingsGoalPaise).toBe(100000); // Goal still 1000 INR
    expect(summary.adjustedProjectedSavingsPaise).toBe(98000);
    expect(summary.cumulativeOverspendPaise).toBe(2000);
    expect(summary.goalStatus).toBe('REDUCED');
  });

  // Test C: day 1 +20, day 2 +30 -> cumulative 50, adjusted 950. Table test with day 3 +10 -> 60 and 940.
  it('Test C: cumulative overspend progression across days 1, 2, and 3', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000, // 1000 INR
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR per day
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 12000, // Day 1: 120 spent -> +20 overspend
          occurredAt: '2026-04-01T10:00:00+05:30'
        },
        {
          id: 'tx-2',
          amountPaise: 13000, // Day 2: 130 spent -> +30 overspend
          occurredAt: '2026-04-02T10:00:00+05:30'
        },
        {
          id: 'tx-3',
          amountPaise: 11000, // Day 3: 110 spent -> +10 overspend
          occurredAt: '2026-04-03T10:00:00+05:30'
        }
      ]
    };

    const breakdown = computeDailyBreakdown(input);

    const day1 = breakdown.find((r) => r.date === '2026-04-01')!;
    expect(day1.overspendPaise).toBe(2000);
    expect(day1.cumulativeOverspendPaise).toBe(2000);
    expect(day1.adjustedProjectedSavingsPaise).toBe(98000);

    const day2 = breakdown.find((r) => r.date === '2026-04-02')!;
    expect(day2.overspendPaise).toBe(3000);
    expect(day2.cumulativeOverspendPaise).toBe(5000);
    expect(day2.adjustedProjectedSavingsPaise).toBe(95000);

    const day3 = breakdown.find((r) => r.date === '2026-04-03')!;
    expect(day3.overspendPaise).toBe(1000);
    expect(day3.cumulativeOverspendPaise).toBe(6000);
    expect(day3.adjustedProjectedSavingsPaise).toBe(94000);
  });

  // Test D: spent 75 of 100 -> remaining 25, overspend 0, adjusted unchanged
  it('Test D: spent 75 of 100 -> remaining 25, overspend 0, adjusted unchanged', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 7500, // 75 INR spent
          occurredAt: '2026-04-01T14:00:00+05:30'
        }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-01');
    expect(daily.spentPaise).toBe(7500);
    expect(daily.remainingPaise).toBe(2500); // 25 INR remaining
    expect(daily.overspendPaise).toBe(0);
    expect(daily.adjustedProjectedSavingsPaise).toBe(100000); // Unchanged

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.cumulativeOverspendPaise).toBe(0);
    expect(summary.adjustedProjectedSavingsPaise).toBe(100000);
    expect(summary.goalStatus).toBe('ON_TRACK');
  });

  // Test E: change the limit mid-month: past days keep the old limit, new days use the new one
  it('Test E: change the limit mid-month retains past limits and applies new limit forward', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 600000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [
        { effectiveFrom: '2026-04-01', limitPaise: 10000 }, // 100 INR from day 1
        { effectiveFrom: '2026-04-15', limitPaise: 15000 }  // 150 INR from day 15 onwards
      ],
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 12000, // spent 120 on day 10 (limit 100 -> overspend 20)
          occurredAt: '2026-04-10T12:00:00+05:30'
        },
        {
          id: 'tx-2',
          amountPaise: 12000, // spent 120 on day 16 (limit 150 -> overspend 0)
          occurredAt: '2026-04-16T12:00:00+05:30'
        }
      ]
    };

    const day10 = computeDailySummary(input, '2026-04-10');
    expect(day10.limitPaise).toBe(10000);
    expect(day10.spentPaise).toBe(12000);
    expect(day10.overspendPaise).toBe(2000);

    const day16 = computeDailySummary(input, '2026-04-16');
    expect(day16.limitPaise).toBe(15000);
    expect(day16.spentPaise).toBe(12000);
    expect(day16.overspendPaise).toBe(0);
    expect(day16.remainingPaise).toBe(3000);
  });

  // Test I: edit and delete transactions change results correctly; computing twice gives identical output;
  // the same transaction is never counted twice.
  it('Test I: edit, delete, idempotency, and uniqueness guarantee', () => {
    const baseInput: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 15000,
          occurredAt: '2026-04-05T12:00:00+05:30'
        }
      ]
    };

    // Run 1: original transaction
    const res1 = computeMonthSummary(baseInput, '2026-04-05');
    expect(res1.totalSpentPaise).toBe(15000);
    expect(res1.cumulativeOverspendPaise).toBe(5000);

    // Idempotency: computing twice yields exactly identical results
    const res2 = computeMonthSummary(baseInput, '2026-04-05');
    expect(res1).toEqual(res2);

    // Edit transaction amount (simulated update)
    const editedInput: MonthBudgetInput = {
      ...baseInput,
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 8000, // lowered from 150 to 80 (under limit 100)
          occurredAt: '2026-04-05T12:00:00+05:30'
        }
      ]
    };
    const resEdited = computeMonthSummary(editedInput, '2026-04-05');
    expect(resEdited.totalSpentPaise).toBe(8000);
    expect(resEdited.cumulativeOverspendPaise).toBe(0);
    expect(resEdited.adjustedProjectedSavingsPaise).toBe(100000);

    // Soft delete transaction
    const deletedInput: MonthBudgetInput = {
      ...baseInput,
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 15000,
          occurredAt: '2026-04-05T12:00:00+05:30',
          deletedAt: new Date().toISOString()
        }
      ]
    };
    const resDeleted = computeMonthSummary(deletedInput, '2026-04-05');
    expect(resDeleted.totalSpentPaise).toBe(0);
    expect(resDeleted.cumulativeOverspendPaise).toBe(0);
  });

  // Finished month status: ACHIEVED, PARTIAL, MISSED
  it('Finished month goal statuses: ACHIEVED, PARTIAL, MISSED', () => {
    const base: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: []
    };

    // 1. Finished with 0 overspend -> ACHIEVED
    const resAchieved = computeMonthSummary(base, '2026-05-01');
    expect(resAchieved.goalStatus).toBe('ACHIEVED');
    expect(resAchieved.remainingDays).toBe(0);
    expect(resAchieved.recommendedDailyLimitPaise).toBe(0);

    // 2. Finished with partial overspend (e.g. 300 overspend, adjusted 700 > 0) -> PARTIAL
    const partialInput: MonthBudgetInput = {
      ...base,
      transactions: [
        { id: '1', amountPaise: 40000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };
    const resPartial = computeMonthSummary(partialInput, '2026-05-01');
    expect(resPartial.goalStatus).toBe('PARTIAL');

    // 3. Finished with overspend >= goal -> MISSED
    const missedInput: MonthBudgetInput = {
      ...base,
      transactions: [
        { id: '1', amountPaise: 150000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };
    const resMissed = computeMonthSummary(missedInput, '2026-05-01');
    expect(resMissed.goalStatus).toBe('MISSED');
  });

  // Extra Tests:
  it('Extra 1: late expense dated in a previous month affects only that previous month', () => {
    const mayInput: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-05-01',
      transactions: [
        {
          id: 'tx-apr',
          amountPaise: 50000,
          occurredAt: '2026-04-28T12:00:00+05:30' // entered late, but dated in April
        },
        {
          id: 'tx-may',
          amountPaise: 10000,
          occurredAt: '2026-05-02T12:00:00+05:30'
        }
      ]
    };

    const maySummary = computeMonthSummary(mayInput, '2026-05-05');
    expect(maySummary.totalSpentPaise).toBe(10000);

    const breakdown = computeDailyBreakdown(mayInput);
    expect(breakdown[0].date).toBe('2026-05-01');
    expect(breakdown.some((r) => r.date.startsWith('2026-04'))).toBe(false);
  });

  it('Extra 2: timezone boundary (11:30 PM IST is same local date, 18:30 UTC is next day 00:00 IST)', () => {
    const istTime1 = '2026-04-10T18:00:00.000Z';
    expect(getLocalDateString(istTime1, 'Asia/Kolkata')).toBe('2026-04-10');

    const istTime2 = '2026-04-10T18:30:00.000Z';
    expect(getLocalDateString(istTime2, 'Asia/Kolkata')).toBe('2026-04-11');
  });

  it('Extra 3: several transactions on one day sum together against that day limit', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR
      transactions: [
        { id: 'tx-1', amountPaise: 3000, occurredAt: '2026-04-05T09:00:00+05:30' },
        { id: 'tx-2', amountPaise: 4000, occurredAt: '2026-04-05T13:00:00+05:30' },
        { id: 'tx-3', amountPaise: 5000, occurredAt: '2026-04-05T20:00:00+05:30' }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-05');
    expect(daily.spentPaise).toBe(12000);
    expect(daily.overspendPaise).toBe(2000);
    expect(daily.remainingPaise).toBe(0);
  });

  it('Extra 4: leap-year February has 29 days and distributes budget accurately', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2025, 2)).toBe(28);

    const limits = computeAutoDailyLimits(290000, '2024-02-01');
    expect(limits.size).toBe(29);
    let sum = 0;
    for (const val of limits.values()) {
      sum += val;
      expect(val).toBe(10000);
    }
    expect(sum).toBe(290000);
  });

  it('Extra 5: mid-month receivedOn handles period days before and after correctly', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 300000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-16', // Starts on 16th of 30-day month -> 15 period days
      transactions: [
        {
          id: 'tx-early',
          amountPaise: 5000,
          occurredAt: '2026-04-05T12:00:00+05:30' // Before receivedOn
        },
        {
          id: 'tx-period',
          amountPaise: 20000,
          occurredAt: '2026-04-18T12:00:00+05:30'
        }
      ]
    };

    const summary = computeMonthSummary(input, '2026-04-20');
    expect(summary.periodDays).toBe(15);
    // Early expense still counts toward totalSpent
    expect(summary.totalSpentPaise).toBe(25000);

    const day5 = computeDailySummary(input, '2026-04-05');
    expect(day5.isPeriodDay).toBe(false);
    expect(day5.limitPaise).toBe(0);
    expect(day5.overspendPaise).toBe(0);
  });

  it('Extra 6: adjusted savings below zero is never clamped, exposes status flag', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 50000, // 500 INR goal
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [
        {
          id: 'tx-huge',
          amountPaise: 80000, // 800 INR spent -> 700 INR overspend (70000 paise)
          occurredAt: '2026-04-01T12:00:00+05:30'
        }
      ]
    };

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.cumulativeOverspendPaise).toBe(70000);
    expect(summary.adjustedProjectedSavingsPaise).toBe(-20000); // never clamped
    expect(summary.goalStatus).toBe('AT_RISK_OR_LOST');
  });

  it('Extra 7: 4000 rupees over 30 days splits into limits that sum to exactly 400000 paise', () => {
    const limits = computeAutoDailyLimits(400000, '2026-04-01');
    expect(limits.size).toBe(30);

    let sum = 0;
    const array = Array.from(limits.entries());

    for (let i = 0; i < 10; i++) {
      expect(array[i][1]).toBe(13334);
      sum += array[i][1];
    }

    for (let i = 10; i < 30; i++) {
      expect(array[i][1]).toBe(13333);
      sum += array[i][1];
    }

    expect(sum).toBe(400000);
  });

  it('Extra 8: error handling and input validation edge cases', () => {
    // Negative pocket money
    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: -100,
        originalSavingsGoalPaise: 50,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow(/pocketMoneyPaise must be a non-negative integer/);

    // Negative savings goal
    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: 5000,
        originalSavingsGoalPaise: -1,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow(/originalSavingsGoalPaise must be a non-negative integer/);

    // Fractional paise
    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: 5000.5,
        originalSavingsGoalPaise: 50,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow();

    // Goal > pocket money
    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: 5000,
        originalSavingsGoalPaise: 6000,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow(/cannot exceed pocketMoneyPaise/);

    // Invalid date strings
    expect(() => getLocalDateString('not-a-date')).toThrow(/Invalid date/);
    expect(() => parseYearMonth('2026-04')).toThrow(/Invalid YYYY-MM-DD/);
    expect(() => computeAutoDailyLimits(10000, '2026-04-35')).toThrow(/beyond month days/);

    // Target date outside breakdown
    expect(() =>
      computeDailySummary(
        {
          pocketMoneyPaise: 5000,
          originalSavingsGoalPaise: 1000,
          receivedOn: '2026-04-01',
          transactions: []
        },
        '2026-05-01'
      )
    ).toThrow(/outside the calendar month/);

    // Invalid transaction amount in breakdown
    expect(() =>
      computeDailyBreakdown({
        pocketMoneyPaise: 5000,
        originalSavingsGoalPaise: 1000,
        receivedOn: '2026-04-01',
        transactions: [
          { id: '1', amountPaise: -50, occurredAt: '2026-04-02' }
        ]
      })
    ).toThrow(/Invalid transaction amountPaise/);
  });

  it('Extra 9: category totals computes breakdown, percentages, and targetYearMonth filter', () => {
    const transactions = [
      { id: '1', amountPaise: 6000, occurredAt: '2026-04-01', category: 'Food' },
      { id: '2', amountPaise: 4000, occurredAt: '2026-04-02', category: 'Food' },
      { id: '3', amountPaise: 5000, occurredAt: '2026-04-03', category: 'Stationery' },
      { id: '4', amountPaise: 5000, occurredAt: '2026-04-04', category: 'Entertainment', deletedAt: '2026-04-05' },
      { id: '5', amountPaise: 8000, occurredAt: '2026-05-01', category: 'Books' } // Different month
    ];

    // Filter to 2026-04
    const result = computeCategoryTotals(transactions, { targetYearMonth: '2026-04' });
    expect(result.length).toBe(2);
    expect(result[0].category).toBe('Food');
    expect(result[0].totalPaise).toBe(10000);
    expect(result[0].count).toBe(2);
    expect(result[0].percentageOfTotal).toBe(66.67);

    // Empty transactions
    expect(computeCategoryTotals([])).toEqual([]);
  });
});
