import { describe, it, expect } from 'vitest';
import {
  calculateInitialSpendingBudget,
  calculateDefaultDailyLimit,
  processDay,
  recalculateMonth,
  recalculateAfterTransactionChange,
  generateCycleDates,
  groupTransactionsByDate
} from './financeEngine';

describe('Financial Calculation Engine - Core Pure Functions', () => {
  describe('calculateInitialSpendingBudget', () => {
    it('calculates initial spending budget correctly (Pocket Money - Savings Goal)', () => {
      expect(calculateInitialSpendingBudget(5000, 1500)).toBe(3500);
      expect(calculateInitialSpendingBudget(3000, 3000)).toBe(0);
    });

    it('clamps negative result to 0 if savings goal exceeds pocket money', () => {
      expect(calculateInitialSpendingBudget(2000, 3000)).toBe(0);
    });

    it('handles string inputs and empty values gracefully', () => {
      expect(calculateInitialSpendingBudget('4000', '1000')).toBe(3000);
      expect(calculateInitialSpendingBudget(null, undefined)).toBe(0);
    });
  });

  describe('calculateDefaultDailyLimit', () => {
    it('divides spending budget by days in month', () => {
      expect(calculateDefaultDailyLimit(3000, 30)).toBe(100);
      expect(calculateDefaultDailyLimit(3100, 31)).toBe(100);
      expect(calculateDefaultDailyLimit(1000, 30)).toBe(33.33);
    });

    it('handles zero or negative days safely without dividing by zero', () => {
      expect(calculateDefaultDailyLimit(1000, 0)).toBe(0);
      expect(calculateDefaultDailyLimit(1000, -5)).toBe(0);
    });
  });

  describe('processDay - Daily Rule Tests', () => {
    // 1. Spend 0 with limit 50 -> reserve 50
    it('Test 1: Spend 0 with limit 50 -> reserve 50', () => {
      const result = processDay({
        dailyLimit: 50,
        actualSpending: 0,
        previousReserve: 0,
      });

      expect(result.surplus).toBe(50);
      expect(result.overspending).toBe(0);
      expect(result.reserveUsed).toBe(0);
      expect(result.savingsDeduction).toBe(0);
      expect(result.newReserve).toBe(50);
    });

    // 2. Spend 100 with limit 50 and reserve 50 -> reserve 0, savings deduction 0
    it('Test 2: Spend 100 with limit 50 and reserve 50 -> reserve 0, savings deduction 0', () => {
      const result = processDay({
        dailyLimit: 50,
        actualSpending: 100,
        previousReserve: 50,
      });

      expect(result.surplus).toBe(0);
      expect(result.overspending).toBe(50);
      expect(result.reserveUsed).toBe(50);
      expect(result.savingsDeduction).toBe(0);
      expect(result.newReserve).toBe(0);
    });

    // 3. Spend 100 with limit 50 and reserve 30 -> reserve used 30, savings deduction 20
    it('Test 3: Spend 100 with limit 50 and reserve 30 -> reserve used 30, savings deduction 20', () => {
      const result = processDay({
        dailyLimit: 50,
        actualSpending: 100,
        previousReserve: 30,
      });

      expect(result.surplus).toBe(0);
      expect(result.overspending).toBe(50);
      expect(result.reserveUsed).toBe(30);
      expect(result.savingsDeduction).toBe(20);
      expect(result.newReserve).toBe(0);
    });

    // 5. Reserve is never negative (edge cases, 0 limit, huge overspend)
    it('Test 5: Reserve is never negative (edge cases, 0 limit, huge overspend)', () => {
      // Huge overspend with 0 reserve
      const hugeOverspend = processDay({
        dailyLimit: 50,
        actualSpending: 10000,
        previousReserve: 0,
      });
      expect(hugeOverspend.newReserve).toBe(0);
      expect(hugeOverspend.newReserve).toBeGreaterThanOrEqual(0);
      expect(hugeOverspend.savingsDeduction).toBe(9950);

      // Zero limit with spending
      const zeroLimit = processDay({
        dailyLimit: 0,
        actualSpending: 250,
        previousReserve: 100,
      });
      expect(zeroLimit.reserveUsed).toBe(100);
      expect(zeroLimit.newReserve).toBe(0);
      expect(zeroLimit.savingsDeduction).toBe(150);

      // Starting with invalid negative reserve should be clamped to 0
      const negativeInput = processDay({
        dailyLimit: 50,
        actualSpending: 100,
        previousReserve: -50,
      });
      expect(negativeInput.newReserve).toBe(0);
    });
  });

  describe('recalculateMonth - Multi-day & Monthly Cycles', () => {
    // 4. The full 4-day example:
    // Sat 0, Sun 100, Mon 30, Tue 120 with limit 50 and goal 1000
    // -> total savings deduction 50, adjusted projected savings 950, final reserve 0
    it('Test 4: Full 4-day example (Sat 0, Sun 100, Mon 30, Tue 120, limit 50, goal 1000)', () => {
      const transactions = [
        { date: 'Day 1 - Sat', amount: 0 },
        { date: 'Day 2 - Sun', amount: 100 },
        { date: 'Day 3 - Mon', amount: 30 },
        { date: 'Day 4 - Tue', amount: 120 },
      ];

      const result = recalculateMonth({
        dailyLimit: 50,
        savingsGoal: 1000,
        transactions,
        startingReserve: 0,
        dates: ['Day 1 - Sat', 'Day 2 - Sun', 'Day 3 - Mon', 'Day 4 - Tue'],
      });

      // Day-by-day assertions
      const [sat, sun, mon, tue] = result.perDayBreakdown;

      // Sat: Spend 0, surplus 50 -> reserve 50
      expect(sat.actualSpending).toBe(0);
      expect(sat.surplus).toBe(50);
      expect(sat.overspending).toBe(0);
      expect(sat.reserveUsed).toBe(0);
      expect(sat.savingsDeduction).toBe(0);
      expect(sat.newReserve).toBe(50);

      // Sun: Spend 100, overspend 50 -> reserve used 50 -> reserve 0, deduction 0
      expect(sun.actualSpending).toBe(100);
      expect(sun.surplus).toBe(0);
      expect(sun.overspending).toBe(50);
      expect(sun.reserveUsed).toBe(50);
      expect(sun.savingsDeduction).toBe(0);
      expect(sun.newReserve).toBe(0);

      // Mon: Spend 30, surplus 20 -> reserve 20
      expect(mon.actualSpending).toBe(30);
      expect(mon.surplus).toBe(20);
      expect(mon.overspending).toBe(0);
      expect(mon.reserveUsed).toBe(0);
      expect(mon.savingsDeduction).toBe(0);
      expect(mon.newReserve).toBe(20);

      // Tue: Spend 120, overspend 70 -> reserve used 20, deduction 50 -> reserve 0
      expect(tue.actualSpending).toBe(120);
      expect(tue.surplus).toBe(0);
      expect(tue.overspending).toBe(70);
      expect(tue.reserveUsed).toBe(20);
      expect(tue.savingsDeduction).toBe(50);
      expect(tue.newReserve).toBe(0);

      // Totals
      expect(result.cumulativeSavingsDeductions).toBe(50);
      expect(result.adjustedProjectedSavings).toBe(950);
      expect(result.currentReserveBalance).toBe(0);
      expect(result.savingsGoalAchieved).toBe(false);
    });

    // 6. Editing or deleting an old transaction recalculates everything after it correctly
    it('Test 6: Editing or deleting an old transaction recalculates everything after it correctly', () => {
      const monthConfig = {
        dailyLimit: 50,
        savingsGoal: 1000,
        startingReserve: 0,
        dates: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
      };

      // Initial scenario: Day 2 has spending of 100
      const initialTx = [
        { id: 'tx1', date: 'Day 1', amount: 0 },
        { id: 'tx2', date: 'Day 2', amount: 100 },
        { id: 'tx3', date: 'Day 3', amount: 30 },
        { id: 'tx4', date: 'Day 4', amount: 120 },
      ];

      const initialResult = recalculateAfterTransactionChange({
        transactions: initialTx,
        monthConfig,
      });
      expect(initialResult.cumulativeSavingsDeductions).toBe(50);
      expect(initialResult.adjustedProjectedSavings).toBe(950);

      // EDIT: User corrects Day 2 spending from 100 to 50 (no overspending on Day 2)
      // Day 1: reserve 50
      // Day 2: spend 50 -> overspend 0 -> reserve remains 50
      // Day 3: spend 30 -> surplus 20 -> reserve becomes 70
      // Day 4: spend 120 -> overspend 70 -> reserve covers all 70! Reserve becomes 0, deduction 0!
      const editedTx = initialTx.map((tx) =>
        tx.id === 'tx2' ? { ...tx, amount: 50 } : tx
      );

      const editedResult = recalculateAfterTransactionChange({
        transactions: editedTx,
        monthConfig,
      });

      expect(editedResult.cumulativeSavingsDeductions).toBe(0);
      expect(editedResult.adjustedProjectedSavings).toBe(1000);
      expect(editedResult.currentReserveBalance).toBe(0);
      expect(editedResult.savingsGoalAchieved).toBe(true);

      // DELETE: Delete Day 4 transaction (the 120 overspend)
      const deletedTx = editedTx.filter((tx) => tx.id !== 'tx4');
      const deletedResult = recalculateAfterTransactionChange({
        transactions: deletedTx,
        monthConfig,
      });

      // Day 4 has 0 spending now -> surplus 50 added to previous 70 = 120 reserve!
      expect(deletedResult.currentReserveBalance).toBe(120);
      expect(deletedResult.adjustedProjectedSavings).toBe(1000);
      expect(deletedResult.cumulativeSavingsDeductions).toBe(0);
    });

    // 7. Original savings goal is never mutated
    it('Test 7: Original savings goal is never mutated', () => {
      const originalGoal = 2500;
      const transactions = [
        { date: '2026-11-01', amount: 500 },
        { date: '2026-11-02', amount: 600 },
      ];

      const config = Object.freeze({
        month: '2026-11',
        dailyLimit: 50,
        savingsGoal: originalGoal,
        transactions,
        startingReserve: 0,
      });

      const result = recalculateMonth(config);

      // Assert original goal in result equals initial value
      expect(result.originalSavingsGoal).toBe(originalGoal);
      // Assert savings goal config remained untouched
      expect(config.savingsGoal).toBe(2500);
      // Even with severe deductions, original goal is unchanged
      expect(result.adjustedProjectedSavings).toBeLessThan(originalGoal);
      expect(result.originalSavingsGoal).toBe(originalGoal);
    });

    // Support for months where pocket money is received on a date other than the 1st
    it('supports pocket money received on custom date (e.g. 5th of November)', () => {
      const dates = generateCycleDates(2026, 11, 5);
      // Nov 5 to Dec 4 is 30 days
      expect(dates[0]).toBe('2026-11-05');
      expect(dates[dates.length - 1]).toBe('2026-12-04');
      expect(dates.length).toBe(30);

      const result = recalculateMonth({
        month: '2026-11',
        receivedDate: 5,
        dailyLimit: 100,
        savingsGoal: 1000,
        pocketMoney: 4000,
        transactions: [
          { date: '2026-11-05', amount: 80 },
          { date: '2026-11-06', amount: 150 },
        ],
      });

      expect(result.perDayBreakdown.length).toBe(30);
      expect(result.perDayBreakdown[0].date).toBe('2026-11-05');
      expect(result.perDayBreakdown[0].actualSpending).toBe(80);
      expect(result.perDayBreakdown[0].surplus).toBe(20);
      expect(result.perDayBreakdown[0].newReserve).toBe(20);
      expect(result.initialSpendingBudget).toBe(3000); // 4000 - 1000
    });

    it('handles day 31 receivedDate for February without calendar overflow', () => {
      // February 2026 has 28 days
      const febDates = generateCycleDates(2026, 2, 31);
      expect(febDates[0]).toBe('2026-02-28');
      expect(febDates[febDates.length - 1]).toBe('2026-03-30');
    });

    // Multiple transactions on the same day are summed
    it('groups and sums multiple transactions occurring on the same day', () => {
      const transactions = [
        { date: '2026-11-10', amount: 30, category: 'chai' },
        { date: '2026-11-10', amount: 50, category: 'lunch' },
        { date: '2026-11-10', amount: 20, category: 'xerox' },
      ];

      const grouped = groupTransactionsByDate(transactions);
      expect(grouped['2026-11-10'].totalAmount).toBe(100);
      expect(grouped['2026-11-10'].items.length).toBe(3);
    });
  });
});

