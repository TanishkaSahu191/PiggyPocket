import { describe, it, expect, beforeEach } from 'vitest';
import {
  storageService,
  getPreviousMonthString,
  getNextMonthString,
  formatMonthName,
} from './storage';

describe('Storage Service Layer - Persistence & Month Rollover', () => {
  beforeEach(() => {
    storageService.clearAll();
  });

  describe('Month string helpers', () => {
    it('calculates previous month strings accurately across year boundaries', () => {
      expect(getPreviousMonthString('2026-11')).toBe('2026-10');
      expect(getPreviousMonthString('2026-01')).toBe('2025-12');
    });

    it('calculates next month strings accurately across year boundaries', () => {
      expect(getNextMonthString('2026-11')).toBe('2026-12');
      expect(getNextMonthString('2026-12')).toBe('2027-01');
    });

    it('formats month labels properly', () => {
      expect(formatMonthName('2026-11')).toBe('November 2026');
    });
  });

  describe('Record Isolation & Survival', () => {
    it('stores one separate record per month without overwriting past months', () => {
      storageService.saveMonthRecord({
        month: '2026-10',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 60,
        isConfigured: true,
        transactions: [{ id: 'tx1', date: '2026-10-05', amount: 50 }],
      });

      storageService.saveMonthRecord({
        month: '2026-11',
        pocketMoney: 3500,
        savingsGoal: 1200,
        dailyLimit: 70,
        isConfigured: true,
        transactions: [{ id: 'tx2', date: '2026-11-02', amount: 40 }],
      });

      const oct = storageService.getMonthRecord('2026-10');
      const nov = storageService.getMonthRecord('2026-11');

      expect(oct).toBeDefined();
      expect(nov).toBeDefined();
      expect(oct.pocketMoney).toBe(3000);
      expect(nov.pocketMoney).toBe(3500);
      expect(oct.transactions.length).toBe(1);
      expect(nov.transactions.length).toBe(1);
    });

    it('detects whether a month has a completed budget setup', () => {
      expect(storageService.hasMonthSetup('2026-11')).toBe(false);

      storageService.saveMonthRecord({
        month: '2026-11',
        pocketMoney: 2500,
        savingsGoal: 1000,
        isConfigured: true,
      });

      expect(storageService.hasMonthSetup('2026-11')).toBe(true);
    });
  });

  describe('Carry-Forward vs Reset on Month Rollover', () => {
    it('sets startingReserve to previous month final reserve when carryForward is true', () => {
      // Month 1: October 2026 with limit 100, 0 spending on 31 days -> accumulated reserve
      storageService.saveMonthRecord({
        month: '2026-10',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 100,
        dateReceived: 1,
        isConfigured: true,
        transactions: [
          { id: 'tx_oct', date: '2026-10-01', amount: 50 }, // surplus 50
        ],
        startingReserve: 0,
      });

      const octRecord = storageService.getMonthRecord('2026-10');
      const octReserve = octRecord.calculation.currentReserveBalance;
      expect(octReserve).toBeGreaterThan(0);

      // Rollover to November 2026 with carry-forward chosen
      const result = storageService.resolveCarryForward({
        newMonth: '2026-11',
        carryForward: true,
      });

      expect(result.decision).toBe('carried');
      expect(result.startingReserve).toBe(octReserve);

      // Verify October record saved the decision and previous reserve balance
      const updatedOct = storageService.getMonthRecord('2026-10');
      expect(updatedOct.carryForwardDecision).toBe('carried');
      expect(updatedOct.previousMonthRemainingReserve).toBe(octReserve);

      // Verify November record has the starting reserve
      const nov = storageService.getMonthRecord('2026-11');
      expect(nov.startingReserve).toBe(octReserve);
    });

    it('resets startingReserve to 0 when reset choice is selected', () => {
      // Month 1: October 2026 with surplus
      storageService.saveMonthRecord({
        month: '2026-10',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 100,
        dateReceived: 1,
        isConfigured: true,
        transactions: [{ id: 'tx_oct', date: '2026-10-01', amount: 0 }],
        startingReserve: 0,
      });

      const octRecord = storageService.getMonthRecord('2026-10');
      const octReserve = octRecord.calculation.currentReserveBalance;

      // Rollover to November with reset choice
      const result = storageService.resolveCarryForward({
        newMonth: '2026-11',
        carryForward: false,
      });

      expect(result.decision).toBe('reset');
      expect(result.startingReserve).toBe(0);

      // October still remembers what the original remaining balance was and that it was reset
      const updatedOct = storageService.getMonthRecord('2026-10');
      expect(updatedOct.carryForwardDecision).toBe('reset');
      expect(updatedOct.previousMonthRemainingReserve).toBe(octReserve);

      // November starts at 0
      const nov = storageService.getMonthRecord('2026-11');
      expect(nov.startingReserve).toBe(0);
    });
  });

  describe('Late Expense Handling & Downstream Recalculation', () => {
    it('routes a late expense to its respective previous month and recalculates it', () => {
      // Setup October
      storageService.saveMonthRecord({
        month: '2026-10',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 50,
        dateReceived: 1,
        isConfigured: true,
        transactions: [{ id: 'tx1', date: '2026-10-01', amount: 10 }],
        startingReserve: 0,
      });

      // Setup November
      storageService.saveMonthRecord({
        month: '2026-11',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 50,
        dateReceived: 1,
        isConfigured: true,
        transactions: [{ id: 'tx2', date: '2026-11-01', amount: 20 }],
        startingReserve: 0,
      });

      // Add a late expense dated in October
      const lateExpense = {
        amount: 80,
        category: 'Food',
        date: '2026-10-15',
        note: 'Forgot to log dinner on Oct 15',
      };

      const result = storageService.addOrUpdateExpense(lateExpense);
      expect(result.month).toBe('2026-10');

      const octUpdated = storageService.getMonthRecord('2026-10');
      expect(octUpdated.transactions.length).toBe(2);
      expect(octUpdated.calculation.totalSpent).toBe(90); // 10 + 80
    });

    it('cascades reserve changes downstream to next month when carry-forward was selected', () => {
      // Setup October with carry forward
      storageService.saveMonthRecord({
        month: '2026-10',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 50,
        dateReceived: 1,
        isConfigured: true,
        carryForwardDecision: 'carried',
        transactions: [],
        startingReserve: 0,
      });

      const initialOctReserve = storageService.getMonthRecord('2026-10').calculation.currentReserveBalance;

      // Setup November starting with October's reserve
      storageService.saveMonthRecord({
        month: '2026-11',
        pocketMoney: 3000,
        savingsGoal: 1000,
        dailyLimit: 50,
        dateReceived: 1,
        isConfigured: true,
        transactions: [],
        startingReserve: initialOctReserve,
      });

      // Now add a late heavy expense in October (spend 500)
      storageService.addOrUpdateExpense({
        amount: 500,
        category: 'Bills',
        date: '2026-10-10',
        note: 'Late electricity bill',
      });

      const newOctReserve = storageService.getMonthRecord('2026-10').calculation.currentReserveBalance;
      const novUpdated = storageService.getMonthRecord('2026-11');

      // October reserve was reduced
      expect(newOctReserve).toBeLessThan(initialOctReserve);

      // November starting reserve automatically cascaded and matches new October reserve!
      expect(novUpdated.startingReserve).toBe(newOctReserve);
    });
  });

  describe('History Archive Integrity', () => {
    it('preserves all months in chronological order without deletions', () => {
      ['2026-08', '2026-09', '2026-10', '2026-11'].forEach((m) => {
        storageService.saveMonthRecord({
          month: m,
          pocketMoney: 2000,
          savingsGoal: 500,
          dailyLimit: 40,
          isConfigured: true,
          transactions: [],
        });
      });

      const all = storageService.getAllMonthRecords();
      expect(all.length).toBe(4);
      expect(all.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    });
  });
});

