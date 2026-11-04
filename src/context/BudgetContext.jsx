/**
 * BUDGET CONTEXT & REACTIVE STATE MANAGEMENT
 *
 * Integrated with the Storage Service Layer (/src/services/storage.js)
 * and the Core Finance Engine (/src/core/financeEngine.js).
 *
 * Capabilities:
 * - Data survives page refreshes via storageService.
 * - One separate record per month ("YYYY-MM").
 * - Automatic new-month detection.
 * - Reserve Wallet carry-forward vs reset decision handling.
 * - Late expense routing to previous months with downstream cascading.
 * - Monthly history archive support.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  calculateInitialSpendingBudget,
  calculateDefaultDailyLimit,
  recalculateMonth,
  getDaysInMonth,
} from '../core/financeEngine';
import {
  storageService,
  getPreviousMonthString,
  getNextMonthString,
  formatMonthName,
} from '../services/storage';

export const BudgetContext = createContext(null);

export const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Education',
  'Entertainment',
  'Bills',
  'Health',
  'Other',
];

export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function BudgetProvider({ children }) {
  const currentCalendarMonth = getCurrentMonthString();
  const [activeMonth, setActiveMonth] = useState(currentCalendarMonth);
  const [activeRecord, setActiveRecord] = useState(() => storageService.getMonthRecord(currentCalendarMonth));

  // New month rollover dialog state
  const [rolloverDialog, setRolloverDialog] = useState({
    isOpen: false,
    newMonth: '',
    previousMonth: '',
    previousReserve: 0,
  });

  // Load or initialize active month record
  const loadMonthRecord = useCallback((monthStr) => {
    let record = storageService.getMonthRecord(monthStr);

    if (!record) {
      // Check if previous month exists to see if rollover prompt is needed
      const prevMonthStr = getPreviousMonthString(monthStr);
      const prevRecord = storageService.getMonthRecord(prevMonthStr);

      const defaultStartingReserve = 0;
      record = {
        month: monthStr,
        pocketMoney: prevRecord?.pocketMoney ?? 2500,
        dateReceived: prevRecord?.dateReceived ?? 1,
        savingsGoal: prevRecord?.savingsGoal ?? 1000,
        dailyLimit: prevRecord?.dailyLimit ?? 50,
        isCustomLimit: prevRecord?.isCustomLimit ?? false,
        startingReserve: defaultStartingReserve,
        carryForwardDecision: null,
        isConfigured: false,
        transactions: [],
      };

      // If previous month had reserve and carryForward decision not set, prompt rollover
      if (prevRecord && prevRecord.calculation?.currentReserveBalance > 0 && !prevRecord.carryForwardDecision) {
        setRolloverDialog({
          isOpen: true,
          newMonth: monthStr,
          previousMonth: prevMonthStr,
          previousReserve: prevRecord.calculation.currentReserveBalance,
        });
      }
    }

    const saved = storageService.saveMonthRecord(record);
    setActiveRecord(saved);
  }, []);

  // Initial load on mount or month change
  useEffect(() => {
    loadMonthRecord(activeMonth);
  }, [activeMonth, loadMonthRecord]);

  // Derived days in active month
  const daysInSelectedMonth = useMemo(() => {
    const [year, month] = activeMonth.split('-').map(Number);
    return getDaysInMonth(year, month);
  }, [activeMonth]);

  // Derived initial spending budget: Pocket Money - Savings Goal
  const spendingBudget = useMemo(() => {
    if (!activeRecord) return 0;
    return calculateInitialSpendingBudget(
      activeRecord.pocketMoney,
      activeRecord.savingsGoal
    );
  }, [activeRecord]);

  // Auto-calculated default daily limit
  const defaultDailyLimit = useMemo(() => {
    return calculateDefaultDailyLimit(spendingBudget, daysInSelectedMonth);
  }, [spendingBudget, daysInSelectedMonth]);

  // Effective daily limit
  const effectiveDailyLimit = useMemo(() => {
    if (!activeRecord) return 50;
    if (activeRecord.isCustomLimit && activeRecord.dailyLimit !== undefined) {
      return Number(activeRecord.dailyLimit) || 0;
    }
    return defaultDailyLimit;
  }, [activeRecord, defaultDailyLimit]);

  // Month calculation from storage record (always fresh)
  const monthCalculation = useMemo(() => {
    if (!activeRecord) {
      return recalculateMonth({
        month: activeMonth,
        dailyLimit: effectiveDailyLimit,
        savingsGoal: 1000,
        transactions: [],
        startingReserve: 0,
      });
    }
    return activeRecord.calculation || recalculateMonth({
      month: activeRecord.month,
      receivedDate: activeRecord.dateReceived,
      dailyLimit: effectiveDailyLimit,
      savingsGoal: activeRecord.savingsGoal,
      pocketMoney: activeRecord.pocketMoney,
      transactions: activeRecord.transactions || [],
      startingReserve: activeRecord.startingReserve || 0,
    });
  }, [activeRecord, activeMonth, effectiveDailyLimit]);

  // Save budget configuration
  const updateBudgetConfig = useCallback((updates) => {
    if (!activeRecord) return;
    const resolvedLimit = updates.dailyLimit !== undefined
      ? updates.dailyLimit
      : (updates.customDailyLimit !== undefined ? updates.customDailyLimit : activeRecord.dailyLimit);

    const updated = {
      ...activeRecord,
      ...updates,
      dailyLimit: resolvedLimit,
      isConfigured: true,
    };
    const saved = storageService.saveMonthRecord(updated);
    setActiveRecord(saved);
  }, [activeRecord]);

  // Add an expense (supports current or late past dates)
  const addExpense = useCallback(({ amount, category, date, note }) => {
    const targetDate = date || getTodayString();
    const result = storageService.addOrUpdateExpense({
      amount: Math.max(0, Number(amount) || 0),
      category: category || 'Other',
      date: targetDate,
      note: (note || '').trim(),
      createdAt: new Date().toISOString(),
    });

    // Always re-read active month record to capture any cascaded reserve updates
    setActiveRecord(storageService.getMonthRecord(activeMonth));
    return result.expense;
  }, [activeMonth]);

  // Edit an expense
  const editExpense = useCallback((id, updates) => {
    const result = storageService.addOrUpdateExpense({
      ...updates,
      id,
    });
    // Always re-read active month record to capture any cascaded reserve updates
    setActiveRecord(storageService.getMonthRecord(activeMonth));
    return result.expense;
  }, [activeMonth]);

  // Delete an expense
  const deleteExpense = useCallback((id) => {
    storageService.deleteExpense(id);
    setActiveRecord(storageService.getMonthRecord(activeMonth));
  }, [activeMonth]);

  // Handle rollover decision (carry forward vs reset)
  const handleRolloverChoice = useCallback((carryForward) => {
    const result = storageService.resolveCarryForward({
      newMonth: rolloverDialog.newMonth,
      carryForward,
    });

    setRolloverDialog((prev) => ({ ...prev, isOpen: false }));
    setActiveRecord(storageService.getMonthRecord(rolloverDialog.newMonth));
    return result;
  }, [rolloverDialog.newMonth]);

  // Helper to load 4-day example data directly
  const loadFourDayExample = useCallback(() => {
    const [year, month] = activeMonth.split('-');
    const d1 = `${year}-${month}-01`;
    const d2 = `${year}-${month}-02`;
    const d3 = `${year}-${month}-03`;
    const d4 = `${year}-${month}-04`;

    const fourDayRecord = {
      month: activeMonth,
      pocketMoney: 2500,
      dateReceived: 1,
      savingsGoal: 1000,
      dailyLimit: 50,
      isCustomLimit: true,
      startingReserve: 0,
      isConfigured: true,
      transactions: [
        { id: 'tx_ex_1', date: d1, amount: 0, category: 'Other', note: 'Saturday - Spend 0' },
        { id: 'tx_ex_2', date: d2, amount: 100, category: 'Food', note: 'Sunday - Food outing' },
        { id: 'tx_ex_3', date: d3, amount: 30, category: 'Travel', note: 'Monday - Metro fare' },
        { id: 'tx_ex_4', date: d4, amount: 120, category: 'Shopping', note: 'Tuesday - Books purchase' },
      ],
    };

    const saved = storageService.saveMonthRecord(fourDayRecord);
    setActiveRecord(saved);
  }, [activeMonth]);

  // Helper to load 3 months of realistic history for testing accumulated savings
  const loadThreeMonthDemo = useCallback(() => {
    const prev1 = getPreviousMonthString(activeMonth);
    const prev2 = getPreviousMonthString(prev1);

    // Month 1 (2 months ago)
    storageService.saveMonthRecord({
      month: prev2,
      pocketMoney: 2500,
      dateReceived: 1,
      savingsGoal: 1000,
      dailyLimit: 50,
      isCustomLimit: false,
      startingReserve: 0,
      carryForwardDecision: 'carried',
      isConfigured: true,
      transactions: [
        { id: `demo_${prev2}_1`, date: `${prev2}-02`, amount: 40, category: 'Food', note: 'Campus lunch' },
        { id: `demo_${prev2}_2`, date: `${prev2}-08`, amount: 30, category: 'Travel', note: 'Bus pass' },
        { id: `demo_${prev2}_3`, date: `${prev2}-15`, amount: 120, category: 'Study', note: 'Notebooks' },
      ],
    });

    // Month 2 (1 month ago)
    storageService.saveMonthRecord({
      month: prev1,
      pocketMoney: 3000,
      dateReceived: 1,
      savingsGoal: 1200,
      dailyLimit: 60,
      isCustomLimit: false,
      startingReserve: 150,
      carryForwardDecision: 'carried',
      isConfigured: true,
      transactions: [
        { id: `demo_${prev1}_1`, date: `${prev1}-05`, amount: 50, category: 'Food', note: 'Snacks' },
        { id: `demo_${prev1}_2`, date: `${prev1}-12`, amount: 100, category: 'Shopping', note: 'Stationery' },
        { id: `demo_${prev1}_3`, date: `${prev1}-20`, amount: 45, category: 'Travel', note: 'Metro card' },
      ],
    });

    // Current Month
    const currentRec = activeRecord || storageService.getMonthRecord(activeMonth) || {
      month: activeMonth,
      pocketMoney: 2500,
      dateReceived: 1,
      savingsGoal: 1000,
      dailyLimit: 50,
      isCustomLimit: false,
      startingReserve: 100,
      transactions: [],
    };

    const savedCurrent = storageService.saveMonthRecord({
      ...currentRec,
      isConfigured: true,
      transactions: currentRec.transactions?.length > 0 ? currentRec.transactions : [
        { id: `demo_${activeMonth}_1`, date: `${activeMonth}-02`, amount: 35, category: 'Food', note: 'Canteen meal' },
        { id: `demo_${activeMonth}_2`, date: `${activeMonth}-04`, amount: 20, category: 'Travel', note: 'Bus ticket' },
      ],
    });

    setActiveRecord(savedCurrent);
  }, [activeMonth, activeRecord]);

  // Clear current active month's transactions
  const clearTransactions = useCallback(() => {
    if (!activeRecord) return;
    const updated = {
      ...activeRecord,
      transactions: [],
    };
    const saved = storageService.saveMonthRecord(updated);
    setActiveRecord(saved);
  }, [activeRecord]);

  const value = {
    activeMonth,
    setActiveMonth,
    activeRecord,
    selectedMonth: activeMonth,
    setSelectedMonth: setActiveMonth,
    budgetConfig: {
      pocketMoney: activeRecord?.pocketMoney ?? 2500,
      dateReceived: activeRecord?.dateReceived ?? 1,
      savingsGoal: activeRecord?.savingsGoal ?? 1000,
      customDailyLimit: activeRecord?.dailyLimit ?? 50,
      isCustomLimit: activeRecord?.isCustomLimit ?? false,
      startingReserve: activeRecord?.startingReserve ?? 0,
      isConfigured: activeRecord?.isConfigured ?? false,
    },
    updateBudgetConfig,
    transactions: activeRecord?.transactions ?? [],
    addExpense,
    editExpense,
    deleteExpense,
    clearTransactions,
    loadFourDayExample,
    loadThreeMonthDemo,
    spendingBudget,
    defaultDailyLimit,
    effectiveDailyLimit,
    daysInSelectedMonth,
    monthCalculation,
    rolloverDialog,
    setRolloverDialog,
    handleRolloverChoice,
    storageService,
    formatMonthName,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
