/**
 * BUDGET CONTROLLER - Endpoints for Monthly Budgets, Rollovers, and Migration
 */

import { budgetService } from '../services/budgetService.js';

export const budgetController = {
  /**
   * GET /api/budgets/month/:month
   */
  async getMonth(req, res) {
    try {
      const { month } = req.params;
      const budget = await budgetService.getMonthBudget(req.user.id, month);
      return res.json({ success: true, budget });
    } catch (err) {
      console.error('getMonth error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/budgets/month
   */
  async saveMonth(req, res) {
    try {
      const budget = await budgetService.saveMonthBudget(req.user.id, req.body);
      return res.json({ success: true, budget });
    } catch (err) {
      console.error('saveMonth error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/budgets/all
   */
  async getAllMonths(req, res) {
    try {
      const months = await budgetService.getAllMonths(req.user.id);
      return res.json({ success: true, months });
    } catch (err) {
      console.error('getAllMonths error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/budgets/rollover
   */
  async resolveRollover(req, res) {
    try {
      const { newMonth, carryForward } = req.body;
      const budget = await budgetService.resolveCarryForward(req.user.id, {
        newMonth,
        carryForward: Boolean(carryForward),
      });
      return res.json({ success: true, budget });
    } catch (err) {
      console.error('resolveRollover error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/budgets/sync-local
   * Migrates local storage data to PostgreSQL backend
   */
  async syncLocal(req, res) {
    try {
      const { localRecords } = req.body;
      const months = await budgetService.syncLocalData(req.user.id, localRecords);
      return res.json({
        success: true,
        message: 'Local data migrated to backend database successfully.',
        months,
      });
    } catch (err) {
      console.error('syncLocal error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

