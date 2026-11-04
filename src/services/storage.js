/**
 * STORAGE SERVICE LAYER
 *
 * Provides a clean storage abstraction on top of localStorage with API sync.
 *
 * HARD RULES:
 * - One separate record per month (e.g. "2026-11").
 * - Nothing is ever deleted when a month ends.
 * - Previous month's final reserve balance AND carry-forward decision are saved.
 * - Late expenses update the appropriate month's records and cascade downstream
 *   if a carry-forward link exists.
 * - Zero UI or React code inside. Pure JS.
 */

import { recalculateMonth } from '../core/financeEngine';
import { authService } from './authService';

export const STORAGE_KEYS = {
  MONTHS_DICT: 'pp_budget_months_v1',
  ACTIVE_MONTH: 'pp_active_month_v1',
};

/**
 * Calculates the previous month string in YYYY-MM format.
 * @param {string} monthStr - e.g. "2026-11"
 * @returns {string} e.g. "2026-10"
 */
export function getPreviousMonthString(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  const prevM = String(month - 1).padStart(2, '0');
  return `${year}-${prevM}`;
}

/**
 * Calculates the next month string in YYYY-MM format.
 * @param {string} monthStr - e.g. "2026-11"
 * @returns {string} e.g. "2026-12"
 */
export function getNextMonthString(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  const nextM = String(month + 1).padStart(2, '0');
  return `${year}-${nextM}`;
}

/**
 * Format month string "YYYY-MM" to readable label e.g. "November 2026"
 * @param {string} monthStr
 * @returns {string}
 */
export function formatMonthName(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// In-memory fallback if localStorage is unavailable
let memoryStore = {};

function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEYS.MONTHS_DICT);
      return raw ? JSON.parse(raw) : {};
    }
  } catch (err) {
    console.warn('Storage read error, using memory store:', err);
  }
  return memoryStore;
}

function setStore(dict) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEYS.MONTHS_DICT, JSON.stringify(dict));
    }
  } catch (err) {
    console.warn('Storage write error, using memory store:', err);
  }
  memoryStore = dict;
}

export const storageService = {
  /**
   * Retrieves a single month record.
   * @param {string} monthStr - e.g. "2026-11"
   * @returns {object|null}
   */
  getMonthRecord(monthStr) {
    const store = getStore();
    return store[monthStr] || null;
  },

  /**
   * Checks if a month has already been set up.
   * @param {string} monthStr
   * @returns {boolean}
   */
  hasMonthSetup(monthStr) {
    const rec = this.getMonthRecord(monthStr);
    return Boolean(rec && rec.isConfigured);
  },

  /**
   * Saves or updates a month record.
   * Recalculates month calculations and persists.
   * @param {object} record
   * @returns {object} The saved and calculated record.
   */
  saveMonthRecord(record) {
    if (!record || !record.month) {
      throw new Error('Record must contain a valid month field.');
    }

    const store = getStore();
    const existing = store[record.month] || {};

    const updated = {
      ...existing,
      ...record,
      transactions: record.transactions ?? existing.transactions ?? [],
      updatedAt: new Date().toISOString(),
    };

    // Recalculate financial breakdown for this month
    const calculation = recalculateMonth({
      month: updated.month,
      receivedDate: updated.dateReceived ?? 1,
      dailyLimit: updated.dailyLimit ?? 50,
      savingsGoal: updated.savingsGoal ?? 1000,
      pocketMoney: updated.pocketMoney ?? 2500,
      transactions: updated.transactions,
      startingReserve: updated.startingReserve ?? 0,
    });

    updated.calculation = calculation;
    store[record.month] = updated;
    setStore(store);

    return updated;
  },

  /**
   * Returns all month records sorted chronologically.
   * @returns {Array<object>}
   */
  getAllMonthRecords() {
    const store = getStore();
    const records = Object.values(store);
    return records.sort((a, b) => (a.month < b.month ? -1 : 1));
  },

  /**
   * Adds or updates an expense.
   * Automatically routes the expense to its corresponding month record based on date.
   * Recalculates that month, and if carried forward, recalculates downstream months.
   *
   * @param {object} expense - { id, amount, category, date, note }
   * @returns {{ month: string, expense: object }}
   */
  addOrUpdateExpense(expense) {
    if (!expense || !expense.date) {
      throw new Error('Expense must contain a valid date (YYYY-MM-DD).');
    }

    const monthStr = expense.date.slice(0, 7);
    const store = getStore();
    let monthRecord = store[monthStr];

    if (!monthRecord) {
      // Create empty month container if non-existent
      monthRecord = {
        month: monthStr,
        pocketMoney: 2500,
        dateReceived: 1,
        savingsGoal: 1000,
        dailyLimit: 50,
        isCustomLimit: false,
        startingReserve: 0,
        carryForwardDecision: null,
        isConfigured: false,
        transactions: [],
      };
    }

    const txId = expense.id || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const expenseWithId = {
      ...expense,
      id: txId,
      amount: Math.max(0, Number(expense.amount) || 0),
    };

    const existingIdx = monthRecord.transactions.findIndex((t) => t.id === txId);
    if (existingIdx !== -1) {
      monthRecord.transactions[existingIdx] = expenseWithId;
    } else {
      monthRecord.transactions.push(expenseWithId);
    }

    // Save and recalculate this month
    this.saveMonthRecord(monthRecord);

    // Cascade downstream recalculation if this month carried forward to next month
    this.cascadeDownstreamReserve(monthStr);

    return {
      month: monthStr,
      expense: expenseWithId,
    };
  },

  /**
   * Deletes an expense by ID.
   * Automatically locates which month it belongs to and cascades recalculations.
   *
   * @param {string} expenseId
   * @param {string} [knownMonthStr]
   * @returns {boolean}
   */
  deleteExpense(expenseId, knownMonthStr) {
    const store = getStore();
    let targetMonth = knownMonthStr;

    if (!targetMonth) {
      // Find month containing this expense
      for (const mStr of Object.keys(store)) {
        if (store[mStr].transactions?.some((t) => t.id === expenseId)) {
          targetMonth = mStr;
          break;
        }
      }
    }

    if (!targetMonth || !store[targetMonth]) return false;

    store[targetMonth].transactions = store[targetMonth].transactions.filter(
      (t) => t.id !== expenseId
    );

    this.saveMonthRecord(store[targetMonth]);
    this.cascadeDownstreamReserve(targetMonth);
    return true;
  },

  /**
   * Cascades reserve changes forward to subsequent months if they were set to carry forward.
   * @param {string} startMonthStr
   */
  cascadeDownstreamReserve(startMonthStr) {
    const store = getStore();
    let currentMonth = startMonthStr;

    // Follow the chain forward
    while (true) {
      const currentRec = store[currentMonth];
      if (!currentRec) break;

      const nextMonthStr = getNextMonthString(currentMonth);
      const nextRec = store[nextMonthStr];

      // If next month doesn't exist or previous month wasn't carried forward, stop
      if (!nextRec || currentRec.carryForwardDecision !== 'carried') {
        break;
      }

      // Re-read current month's latest recalculated reserve balance
      const currentFinalReserve = currentRec.calculation?.currentReserveBalance ?? 0;

      // Update old month's recorded remaining balance
      currentRec.previousMonthRemainingReserve = currentFinalReserve;

      // Update next month's starting reserve
      nextRec.startingReserve = currentFinalReserve;
      this.saveMonthRecord(nextRec);

      currentMonth = nextMonthStr;
    }
  },

  /**
   * Resolves the carry-forward decision for a new month from the previous month.
   *
   * @param {object} params
   * @param {string} params.newMonth - e.g. "2026-11"
   * @param {boolean} params.carryForward - true to carry balance, false to reset to 0
   * @returns {{ startingReserve: number, decision: string, previousReserve: number }}
   */
  resolveCarryForward({ newMonth, carryForward }) {
    const prevMonthStr = getPreviousMonthString(newMonth);
    const store = getStore();
    const prevRec = store[prevMonthStr];

    let prevFinalReserve = 0;
    if (prevRec) {
      // Ensure previous month is calculated
      const calc = recalculateMonth({
        month: prevRec.month,
        receivedDate: prevRec.dateReceived ?? 1,
        dailyLimit: prevRec.dailyLimit ?? 50,
        savingsGoal: prevRec.savingsGoal ?? 1000,
        pocketMoney: prevRec.pocketMoney ?? 2500,
        transactions: prevRec.transactions ?? [],
        startingReserve: prevRec.startingReserve ?? 0,
      });
      prevFinalReserve = calc.currentReserveBalance;

      // Save the decision and balance in the previous month's record
      prevRec.carryForwardDecision = carryForward ? 'carried' : 'reset';
      prevRec.previousMonthRemainingReserve = prevFinalReserve;
      this.saveMonthRecord(prevRec);
    }

    const startingReserve = carryForward ? prevFinalReserve : 0;

    // Update new month's record
    let newRec = store[newMonth];
    if (!newRec) {
      newRec = {
        month: newMonth,
        pocketMoney: prevRec?.pocketMoney ?? 2500,
        dateReceived: prevRec?.dateReceived ?? 1,
        savingsGoal: prevRec?.savingsGoal ?? 1000,
        dailyLimit: prevRec?.dailyLimit ?? 50,
        isCustomLimit: prevRec?.isCustomLimit ?? false,
        isConfigured: false,
        transactions: [],
      };
    }

    newRec.startingReserve = startingReserve;
    newRec.carryForwardDecision = carryForward ? 'carried' : 'reset';
    this.saveMonthRecord(newRec);

    return {
      startingReserve,
      decision: carryForward ? 'carried' : 'reset',
      previousReserve: prevFinalReserve,
    };
  },

  /**
   * Migrates local storage records to backend PostgreSQL database
   */
  async migrateLocalStorageToBackend() {
    const store = getStore();
    if (!store || Object.keys(store).length === 0) {
      return { migrated: false, message: 'No local records to migrate.' };
    }

    try {
      const res = await fetch('/api/budgets/sync-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({ localRecords: store }),
      });

      if (!res.ok) {
        throw new Error('Backend sync returned non-OK status');
      }

      const data = await res.json();
      return { migrated: true, data };
    } catch (err) {
      return { migrated: false, error: err.message };
    }
  },

  /**
   * Clear all storage (for test resets)
   */
  clearAll() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEYS.MONTHS_DICT);
        window.localStorage.removeItem(STORAGE_KEYS.ACTIVE_MONTH);
      }
    } catch {}
    memoryStore = {};
  },
};

