/**
 * EXPENSE CONTROLLER - Add, Edit, Delete with Real-time Recalculation
 */

import { budgetService } from '../services/budgetService.js';

export const expenseController = {
  /**
   * POST /api/expenses
   * Add or edit an expense
   */
  async addOrUpdate(req, res) {
    try {
      const { amount, category, date, note, id } = req.body;

      if (amount === undefined || !date) {
        return res.status(400).json({
          success: false,
          error: 'Amount and valid date are required.',
        });
      }

      const updatedBudget = await budgetService.addOrUpdateTransaction(req.user.id, {
        id,
        amount,
        category,
        date,
        note,
      });

      return res.json({
        success: true,
        message: 'Expense saved and budget recalculated.',
        budget: updatedBudget,
      });
    } catch (err) {
      console.error('addOrUpdate expense error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * DELETE /api/expenses/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const updatedBudget = await budgetService.deleteTransaction(req.user.id, id);

      return res.json({
        success: true,
        message: 'Expense deleted and budget recalculated.',
        budget: updatedBudget,
      });
    } catch (err) {
      console.error('delete expense error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

