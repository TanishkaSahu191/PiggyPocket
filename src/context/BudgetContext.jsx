/**
 * BUDGET CONTEXT & STATE MANAGEMENT - Phase 3
 *
 * Coordinates budget configuration, expenses, and reactive calculations
 * using ONLY the pure functions from /src/core/financeEngine.js.
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  calculateInitialSpendingBudget,
  calculateDefaultDailyLimit,
  recalculateMonth,
  getDaysInMonth,
  generateCycleDates
} from '../core/financeEngine';

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

// Helper to get today's date formatted as YYYY-MM-DD
export function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to get current Year-Month string
export function getCurrentMonthString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function BudgetProvider({ children }) {
  // Current month string 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());

  // Budget configuration state
  const [budgetConfig, setBudgetConfig] = useState({
    pocketMoney: 2500,
    dateReceived: 1,
    savingsGoal: 1000,
    customDailyLimit: 50, // default limit or user custom
    isCustomLimit: true,
  });

  // Expenses transaction state (in-memory for Phase 3)
  const [transactions, setTransactions] = useState([]);

  // Calculate days in the selected month
  const daysInSelectedMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return getDaysInMonth(year, month);
  }, [selectedMonth]);

  // Derived initial spending budget: Pocket Money - Savings Goal
  const spendingBudget = useMemo(() => {
    return calculateInitialSpendingBudget(
      budgetConfig.pocketMoney,
      budgetConfig.savingsGoal
    );
  }, [budgetConfig.pocketMoney, budgetConfig.savingsGoal]);

  // Auto-calculated default daily limit
  const defaultDailyLimit = useMemo(() => {
    return calculateDefaultDailyLimit(spendingBudget, daysInSelectedMonth);
  }, [spendingBudget, daysInSelectedMonth]);

  // Active effective daily limit
  const effectiveDailyLimit = useMemo(() => {
    if (budgetConfig.isCustomLimit && budgetConfig.customDailyLimit !== null && budgetConfig.customDailyLimit !== undefined) {
      return Number(budgetConfig.customDailyLimit) || 0;
    }
    return defaultDailyLimit;
  }, [budgetConfig.isCustomLimit, budgetConfig.customDailyLimit, defaultDailyLimit]);

  // Recalculate full monthly state via pure financeEngine
  const monthCalculation = useMemo(() => {
    return recalculateMonth({
      month: selectedMonth,
      receivedDate: budgetConfig.dateReceived,
      dailyLimit: effectiveDailyLimit,
      savingsGoal: budgetConfig.savingsGoal,
      pocketMoney: budgetConfig.pocketMoney,
      transactions,
      startingReserve: 0,
    });
  }, [selectedMonth, budgetConfig, effectiveDailyLimit, transactions]);

  // Update budget configuration
  const updateBudgetConfig = useCallback((updates) => {
    setBudgetConfig((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Add an expense
  const addExpense = useCallback(({ amount, category, date, note }) => {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      amount: Math.max(0, Number(amount) || 0),
      category: category || 'Other',
      date: date || getTodayString(),
      note: (note || '').trim(),
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [...prev, newTx]);
    return newTx;
  }, []);

  // Edit an existing expense
  const editExpense = useCallback((id, updates) => {
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== id) return tx;
        return {
          ...tx,
          amount: updates.amount !== undefined ? Math.max(0, Number(updates.amount) || 0) : tx.amount,
          category: updates.category || tx.category,
          date: updates.date || tx.date,
          note: updates.note !== undefined ? updates.note.trim() : tx.note,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  // Delete an expense
  const deleteExpense = useCallback((id) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }, []);

  // Helper to load 4-day example data directly for quick testing
  const loadFourDayExample = useCallback(() => {
    const today = getTodayString();
    const parts = today.split('-');
    const year = parts[0];
    const month = parts[1];

    // Day 1 to Day 4 of current month
    const d1 = `${year}-${month}-01`;
    const d2 = `${year}-${month}-02`;
    const d3 = `${year}-${month}-03`;
    const d4 = `${year}-${month}-04`;

    setBudgetConfig({
      pocketMoney: 2500,
      dateReceived: 1,
      savingsGoal: 1000,
      customDailyLimit: 50,
      isCustomLimit: true,
    });

    setTransactions([
      { id: 'tx_ex_1', date: d1, amount: 0, category: 'Other', note: 'Saturday - Spend 0' },
      { id: 'tx_ex_2', date: d2, amount: 100, category: 'Food', note: 'Sunday - Food outing' },
      { id: 'tx_ex_3', date: d3, amount: 30, category: 'Travel', note: 'Monday - Metro fare' },
      { id: 'tx_ex_4', date: d4, amount: 120, category: 'Shopping', note: 'Tuesday - Books purchase' },
    ]);
  }, []);

  // Reset transactions
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  const value = {
    selectedMonth,
    setSelectedMonth,
    budgetConfig,
    updateBudgetConfig,
    transactions,
    addExpense,
    editExpense,
    deleteExpense,
    clearTransactions,
    loadFourDayExample,
    spendingBudget,
    defaultDailyLimit,
    effectiveDailyLimit,
    daysInSelectedMonth,
    monthCalculation,
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

