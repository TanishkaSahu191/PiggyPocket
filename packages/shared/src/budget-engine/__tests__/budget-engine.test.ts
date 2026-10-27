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

describe('Phase 2: Budget Engine Specification Tests', () => {
  // A: pocket 5000, goal 1000 -> spending budget 4000.
  it('Case A: pocket 5000, goal 1000 -> spending budget 4000', () => {
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
    expect(summary.protectedSavingsPaise).toBe(100000);
    expect(summary.pocketMoneyPaise).toBe(500000);
    expect(summary.cumulativeShortfallPaise).toBe(0);
    expect(summary.projectedSavingsPaise).toBe(100000);
    expect(summary.goalStatus).toBe('ON_TRACK');
    expect(summary.recommendedDailyLimitPaise).toBe(13333); // 400000 / 30
  });

  // B: limit 100, spent 120 with an empty reservoir -> shortfall 20, projected savings 980, protected savings still 1000.
  it('Case B: limit 100, spent 120 with an empty reservoir -> shortfall 20, projected savings 980, protected savings still 1000', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 12000, // 120 INR
          occurredAt: '2026-04-01T12:00:00+05:30'
        }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-01');
    expect(daily.limitPaise).toBe(10000);
    expect(daily.spentPaise).toBe(12000);
    expect(daily.dailyOverspendPaise).toBe(2000);
    expect(daily.reservoirUsedPaise).toBe(0); // empty reservoir
    expect(daily.reservoirBalancePaise).toBe(0);
    expect(daily.shortfallPaise).toBe(2000); // 20 INR
    expect(daily.projectedSavingsPaise).toBe(98000); // 980 INR

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.protectedSavingsPaise).toBe(100000); // protected savings still 1000
    expect(summary.projectedSavingsPaise).toBe(98000);
    expect(summary.cumulativeShortfallPaise).toBe(2000);
    expect(summary.goalStatus).toBe('REDUCED');
  });

  // C: empty reservoir, day 1 over by 20, day 2 over by 30 -> cumulative shortfall 50, projected 950. Table test with day 3 over by 10 -> 60 and 940.
  it('Case C: empty reservoir, day 1 over by 20, day 2 over by 30 -> cumulative shortfall 50, projected 950. Table test with day 3 over by 10 -> 60 and 940', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000, // 1000 INR
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR per day
      transactions: [
        { id: 'tx-1', amountPaise: 12000, occurredAt: '2026-04-01T10:00:00+05:30' }, // over by 20
        { id: 'tx-2', amountPaise: 13000, occurredAt: '2026-04-02T10:00:00+05:30' }, // over by 30
        { id: 'tx-3', amountPaise: 11000, occurredAt: '2026-04-03T10:00:00+05:30' }  // over by 10
      ]
    };

    const breakdown = computeDailyBreakdown(input);

    // Day 1
    const day1 = breakdown.find((r) => r.date === '2026-04-01')!;
    expect(day1.shortfallPaise).toBe(2000);
    expect(day1.cumulativeShortfallPaise).toBe(2000);
    expect(day1.projectedSavingsPaise).toBe(98000);

    // Day 2
    const day2 = breakdown.find((r) => r.date === '2026-04-02')!;
    expect(day2.shortfallPaise).toBe(3000);
    expect(day2.cumulativeShortfallPaise).toBe(5000);
    expect(day2.projectedSavingsPaise).toBe(95000);

    // Day 3
    const day3 = breakdown.find((r) => r.date === '2026-04-03')!;
    expect(day3.shortfallPaise).toBe(1000);
    expect(day3.cumulativeShortfallPaise).toBe(6000);
    expect(day3.projectedSavingsPaise).toBe(94000);
  });

  // D: spent 75 of 100 -> 25 banked into the reservoir, shortfall 0, projected savings unchanged.
  it('Case D: spent 75 of 100 -> 25 banked into the reservoir, shortfall 0, projected savings unchanged', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // 100 INR
      transactions: [
        { id: 'tx-1', amountPaise: 7500, occurredAt: '2026-04-01T14:00:00+05:30' }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-01');
    expect(daily.spentPaise).toBe(7500);
    expect(daily.bankedPaise).toBe(2500); // 25 INR banked
    expect(daily.reservoirBalancePaise).toBe(2500);
    expect(daily.shortfallPaise).toBe(0);
    expect(daily.projectedSavingsPaise).toBe(100000); // Unchanged

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.reservoirBalancePaise).toBe(2500);
    expect(summary.cumulativeShortfallPaise).toBe(0);
    expect(summary.projectedSavingsPaise).toBe(100000);
    expect(summary.goalStatus).toBe('ON_TRACK');
  });

  // E: change the limit mid-month: past days keep the old limit, new days use the new one.
  it('Case E: change the limit mid-month: past days keep the old limit, new days use the new one', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 600000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [
        { effectiveFrom: '2026-04-01', limitPaise: 10000 }, // 100 INR
        { effectiveFrom: '2026-04-15', limitPaise: 15000 }  // 150 INR from day 15
      ],
      transactions: [
        { id: 'tx-1', amountPaise: 12000, occurredAt: '2026-04-10T12:00:00+05:30' },
        { id: 'tx-2', amountPaise: 12000, occurredAt: '2026-04-16T12:00:00+05:30' }
      ]
    };

    const day10 = computeDailySummary(input, '2026-04-10');
    expect(day10.limitPaise).toBe(10000); // Old limit
    expect(day10.spentPaise).toBe(12000);
    expect(day10.dailyOverspendPaise).toBe(2000);

    const day16 = computeDailySummary(input, '2026-04-16');
    expect(day16.limitPaise).toBe(15000); // New limit
    expect(day16.spentPaise).toBe(12000);
    expect(day16.dailyOverspendPaise).toBe(0);
    expect(day16.bankedPaise).toBe(3000);
  });

  // R (reservoir), limit 100: day 1 spend 60 -> reservoir 40. Day 2 spend 90 -> reservoir 50.
  // Day 3 spend 180 -> excess 80, covered 50, reservoir 0, shortfall 30, projected 970.
  // Day 4 spend 130 -> shortfall 30, cumulative 60, projected 940.
  // Also: the reservoir is never negative; protected savings never changes;
  // editing day 1 from 60 to 100 recomputes everything with no double counting;
  // spending exactly the limit banks nothing and uses nothing;
  // unallocated budget for 5000 income, 1000 savings, limit 100 over 30 days is 1000.
  it('Case R (reservoir): full 4-day progression, non-negative reservoir, protected savings constancy, edit recomputation, exact limit spending, and unallocated budget', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000, // 5000 income
      originalSavingsGoalPaise: 100000, // 1000 savings -> spendingBudget = 4000 (400000 paise)
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }], // limit 100 (10000 paise)
      transactions: [
        { id: 'tx-1', amountPaise: 6000, occurredAt: '2026-04-01T12:00:00+05:30' },  // Day 1 spend 60
        { id: 'tx-2', amountPaise: 9000, occurredAt: '2026-04-02T12:00:00+05:30' },  // Day 2 spend 90
        { id: 'tx-3', amountPaise: 18000, occurredAt: '2026-04-03T12:00:00+05:30' }, // Day 3 spend 180
        { id: 'tx-4', amountPaise: 13000, occurredAt: '2026-04-04T12:00:00+05:30' }  // Day 4 spend 130
      ]
    };

    const breakdown = computeDailyBreakdown(input);

    // Day 1: spend 60 -> reservoir 40
    const day1 = breakdown.find((r) => r.date === '2026-04-01')!;
    expect(day1.spentPaise).toBe(6000);
    expect(day1.bankedPaise).toBe(4000);
    expect(day1.reservoirBalancePaise).toBe(4000);
    expect(day1.shortfallPaise).toBe(0);
    expect(day1.cumulativeShortfallPaise).toBe(0);
    expect(day1.projectedSavingsPaise).toBe(100000);

    // Day 2: spend 90 -> reservoir 50
    const day2 = breakdown.find((r) => r.date === '2026-04-02')!;
    expect(day2.spentPaise).toBe(9000);
    expect(day2.bankedPaise).toBe(1000);
    expect(day2.reservoirBalancePaise).toBe(5000); // 40 + 10 = 50 (5000 paise)
    expect(day2.shortfallPaise).toBe(0);
    expect(day2.cumulativeShortfallPaise).toBe(0);

    // Day 3: spend 180 -> excess 80, covered 50, reservoir 0, shortfall 30, projected 970
    const day3 = breakdown.find((r) => r.date === '2026-04-03')!;
    expect(day3.spentPaise).toBe(18000);
    expect(day3.dailyOverspendPaise).toBe(8000);
    expect(day3.reservoirUsedPaise).toBe(5000);
    expect(day3.reservoirBalancePaise).toBe(0);
    expect(day3.shortfallPaise).toBe(3000);
    expect(day3.cumulativeShortfallPaise).toBe(3000);
    expect(day3.projectedSavingsPaise).toBe(97000); // 970 INR

    // Day 4: spend 130 -> shortfall 30, cumulative 60, projected 940
    const day4 = breakdown.find((r) => r.date === '2026-04-04')!;
    expect(day4.spentPaise).toBe(13000);
    expect(day4.dailyOverspendPaise).toBe(3000);
    expect(day4.reservoirUsedPaise).toBe(0);
    expect(day4.reservoirBalancePaise).toBe(0); // reservoir never goes negative
    expect(day4.shortfallPaise).toBe(3000);
    expect(day4.cumulativeShortfallPaise).toBe(6000);
    expect(day4.projectedSavingsPaise).toBe(94000); // 940 INR

    // Check month summary: protected savings never changes & unallocated budget is 1000
    const summary = computeMonthSummary(input, '2026-04-04');
    expect(summary.protectedSavingsPaise).toBe(100000); // protected savings never changes
    expect(summary.projectedSavingsPaise).toBe(94000);
    expect(summary.cumulativeShortfallPaise).toBe(6000);
    // Unallocated budget for 5000 income, 1000 savings, limit 100 over 30 days is 1000 (4000 - 3000 = 1000)
    expect(summary.unallocatedBudgetPaise).toBe(100000); // 1000 INR (100000 paise)
    expect(summary.limitsExceedSpendingBudget).toBe(false);

    // Check spending exactly the limit: banks nothing and uses nothing
    const exactLimitInput: MonthBudgetInput = {
      ...input,
      transactions: [
        { id: 'tx-exact', amountPaise: 10000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };
    const exactDay = computeDailySummary(exactLimitInput, '2026-04-01');
    expect(exactDay.bankedPaise).toBe(0);
    expect(exactDay.reservoirUsedPaise).toBe(0);
    expect(exactDay.reservoirBalancePaise).toBe(0);
    expect(exactDay.shortfallPaise).toBe(0);

    // Check editing day 1 from 60 to 100: recomputes everything with no double counting
    const editedInput: MonthBudgetInput = {
      ...input,
      transactions: [
        { id: 'tx-1', amountPaise: 10000, occurredAt: '2026-04-01T12:00:00+05:30' }, // edited to 100
        { id: 'tx-2', amountPaise: 9000, occurredAt: '2026-04-02T12:00:00+05:30' },
        { id: 'tx-3', amountPaise: 18000, occurredAt: '2026-04-03T12:00:00+05:30' },
        { id: 'tx-4', amountPaise: 13000, occurredAt: '2026-04-04T12:00:00+05:30' }
      ]
    };
    const editedBreakdown = computeDailyBreakdown(editedInput);
    // Day 1 now banks 0, reservoir is 0
    expect(editedBreakdown[0].bankedPaise).toBe(0);
    expect(editedBreakdown[0].reservoirBalancePaise).toBe(0);
    // Day 2 banks 10, reservoir is 10
    expect(editedBreakdown[1].reservoirBalancePaise).toBe(1000);
    // Day 3 excess 80, covered 10, shortfall 70
    expect(editedBreakdown[2].reservoirUsedPaise).toBe(1000);
    expect(editedBreakdown[2].shortfallPaise).toBe(7000);
    expect(editedBreakdown[2].cumulativeShortfallPaise).toBe(7000);
    // Day 4 excess 30, shortfall 30, cumulative 100
    expect(editedBreakdown[3].shortfallPaise).toBe(3000);
    expect(editedBreakdown[3].cumulativeShortfallPaise).toBe(10000);
    expect(editedBreakdown[3].projectedSavingsPaise).toBe(90000);
  });

  // I: edit and delete transactions change results correctly; computing twice gives identical output;
  // the same transaction is never counted twice.
  it('Case I: edit and delete transactions change results correctly; computing twice gives identical output; the same transaction is never counted twice', () => {
    const baseInput: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [
        { id: 'tx-1', amountPaise: 15000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };

    const res1 = computeMonthSummary(baseInput, '2026-04-01');
    expect(res1.totalSpentPaise).toBe(15000);
    expect(res1.cumulativeShortfallPaise).toBe(5000);

    // Idempotency: computing twice gives identical output
    const res2 = computeMonthSummary(baseInput, '2026-04-01');
    expect(res1).toEqual(res2);

    // Edit transaction amount
    const editedInput: MonthBudgetInput = {
      ...baseInput,
      transactions: [
        { id: 'tx-1', amountPaise: 8000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };
    const resEdited = computeMonthSummary(editedInput, '2026-04-01');
    expect(resEdited.totalSpentPaise).toBe(8000);
    expect(resEdited.cumulativeShortfallPaise).toBe(0);
    expect(resEdited.projectedSavingsPaise).toBe(100000);

    // Delete transaction
    const deletedInput: MonthBudgetInput = {
      ...baseInput,
      transactions: [
        {
          id: 'tx-1',
          amountPaise: 15000,
          occurredAt: '2026-04-01T12:00:00+05:30',
          deletedAt: new Date().toISOString()
        }
      ]
    };
    const resDeleted = computeMonthSummary(deletedInput, '2026-04-01');
    expect(resDeleted.totalSpentPaise).toBe(0);
    expect(resDeleted.cumulativeShortfallPaise).toBe(0);
  });

  // Extra Tests:
  it('Extra: a late expense dated in a previous month affects only that month', () => {
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

  it('Extra: timezone boundary (11:30 PM IST is already the next day in UTC)', () => {
    // 2026-04-10 23:30:00 IST = 2026-04-10T18:00:00.000Z
    const istTime1 = '2026-04-10T18:00:00.000Z';
    expect(getLocalDateString(istTime1, 'Asia/Kolkata')).toBe('2026-04-10');

    // 2026-04-11 00:00:00 IST = 2026-04-10T18:30:00.000Z
    const istTime2 = '2026-04-10T18:30:00.000Z';
    expect(getLocalDateString(istTime2, 'Asia/Kolkata')).toBe('2026-04-11');
  });

  it('Extra: several transactions on one day', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-05',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-05', limitPaise: 10000 }],
      transactions: [
        { id: 'tx-1', amountPaise: 3000, occurredAt: '2026-04-05T09:00:00+05:30' },
        { id: 'tx-2', amountPaise: 4000, occurredAt: '2026-04-05T13:00:00+05:30' },
        { id: 'tx-3', amountPaise: 5000, occurredAt: '2026-04-05T20:00:00+05:30' }
      ]
    };

    const daily = computeDailySummary(input, '2026-04-05');
    expect(daily.spentPaise).toBe(12000);
    expect(daily.dailyOverspendPaise).toBe(2000);
    expect(daily.shortfallPaise).toBe(2000); // with empty reservoir on receivedOn
  });

  it('Extra: leap-year February', () => {
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

  it('Extra: mid-month receivedOn', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 300000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-16',
      transactions: [
        { id: 'tx-early', amountPaise: 5000, occurredAt: '2026-04-05T12:00:00+05:30' },
        { id: 'tx-period', amountPaise: 20000, occurredAt: '2026-04-18T12:00:00+05:30' }
      ]
    };

    const summary = computeMonthSummary(input, '2026-04-20');
    expect(summary.periodDays).toBe(15);
    expect(summary.totalSpentPaise).toBe(25000);

    const day5 = computeDailySummary(input, '2026-04-05');
    expect(day5.isPeriodDay).toBe(false);
    expect(day5.limitPaise).toBe(0);
    expect(day5.shortfallPaise).toBe(0);
  });

  it('Extra: adjusted savings below zero', () => {
    const input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 50000, // 500 INR goal
      receivedOn: '2026-04-01',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [
        { id: 'tx-huge', amountPaise: 80000, occurredAt: '2026-04-01T12:00:00+05:30' }
      ]
    };

    const summary = computeMonthSummary(input, '2026-04-01');
    expect(summary.cumulativeShortfallPaise).toBe(70000);
    expect(summary.projectedSavingsPaise).toBe(-20000); // never clamped
    expect(summary.goalStatus).toBe('AT_RISK_OR_LOST');
  });

  it('Extra: 4000 rupees over 30 days splits into limits that sum to exactly 400000 paise', () => {
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

  it('Extra: rule_version v1 evaluates legacy direct overspends and finished month statuses', () => {
    const v1Input: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      rule_version: 'v1',
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [
        { id: '1', amountPaise: 5000, occurredAt: '2026-04-01T12:00:00+05:30' },
        { id: '2', amountPaise: 12000, occurredAt: '2026-04-02T12:00:00+05:30' }
      ]
    };

    // Under v1, day 1 does not buffer day 2's overspend
    const v1Breakdown = computeDailyBreakdown(v1Input);
    expect(v1Breakdown[0].bankedPaise).toBe(0);
    expect(v1Breakdown[1].shortfallPaise).toBe(2000);

    // Finished month statuses under v2: ACHIEVED, PARTIAL, MISSED
    const cleanMonth: MonthBudgetInput = {
      pocketMoneyPaise: 500000,
      originalSavingsGoalPaise: 100000,
      receivedOn: '2026-04-01',
      transactions: []
    };
    expect(computeMonthSummary(cleanMonth, '2026-05-01').goalStatus).toBe('ACHIEVED');

    const partialMonth: MonthBudgetInput = {
      ...cleanMonth,
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [{ id: '1', amountPaise: 40000, occurredAt: '2026-04-01' }]
    };
    expect(computeMonthSummary(partialMonth, '2026-05-01').goalStatus).toBe('PARTIAL');

    const missedMonth: MonthBudgetInput = {
      ...cleanMonth,
      effectiveDailyLimits: [{ effectiveFrom: '2026-04-01', limitPaise: 10000 }],
      transactions: [{ id: '1', amountPaise: 150000, occurredAt: '2026-04-01' }]
    };
    expect(computeMonthSummary(missedMonth, '2026-05-01').goalStatus).toBe('MISSED');
  });

  it('Extra: input validation and edge cases', () => {
    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: -10,
        originalSavingsGoalPaise: 10,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow();

    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: 10,
        originalSavingsGoalPaise: -5,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow();

    expect(() =>
      validateBudgetInput({
        pocketMoneyPaise: 10,
        originalSavingsGoalPaise: 20,
        receivedOn: '2026-04-01',
        transactions: []
      })
    ).toThrow();

    expect(() => getLocalDateString('invalid')).toThrow();
    expect(() => parseYearMonth('invalid')).toThrow();
    expect(() => computeAutoDailyLimits(1000, '2026-04-35')).toThrow();

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

    expect(() =>
      computeDailyBreakdown({
        pocketMoneyPaise: 5000,
        originalSavingsGoalPaise: 1000,
        receivedOn: '2026-04-01',
        transactions: [{ id: '1', amountPaise: -1, occurredAt: '2026-04-01' }]
      })
    ).toThrow(/Invalid transaction amountPaise/);

    // Category totals helper
    const cats = computeCategoryTotals([
      { id: '1', amountPaise: 5000, occurredAt: '2026-04-01', category: 'Food' },
      { id: '2', amountPaise: 5000, occurredAt: '2026-04-02', category: 'Travel' },
      { id: '3', amountPaise: 2000, occurredAt: '2026-05-01', category: 'Travel' }
    ], { targetYearMonth: '2026-04' });
    expect(cats.length).toBe(2);
    expect(cats[0].totalPaise).toBe(5000);
    expect(computeCategoryTotals([])).toEqual([]);
  });
});
