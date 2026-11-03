import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Receipt,
  Calendar,
  IndianRupee,
  Tag,
  FileText,
  RotateCcw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useBudget, EXPENSE_CATEGORIES, getTodayString } from '../context/BudgetContext';

export default function Expenses() {
  const {
    transactions,
    addExpense,
    editExpense,
    deleteExpense,
    clearTransactions,
    loadFourDayExample,
    monthCalculation
  } = useBudget();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    date: getTodayString(),
    note: '',
  });

  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      amount: '',
      category: 'Food',
      date: getTodayString(),
      note: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tx) => {
    setEditingId(tx.id);
    setFormData({
      amount: tx.amount,
      category: tx.category || 'Food',
      date: tx.date,
      note: tx.note || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedAmount = Number(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setFormError('Please enter a valid expense amount');
      return;
    }

    if (!formData.date) {
      setFormError('Please select a date');
      return;
    }

    if (editingId) {
      editExpense(editingId, {
        amount: parsedAmount,
        category: formData.category,
        date: formData.date,
        note: formData.note,
      });
    } else {
      addExpense({
        amount: parsedAmount,
        category: formData.category,
        date: formData.date,
        note: formData.note,
      });
    }

    closeModal();
  };

  // Sort transactions by date descending
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });

  return (
    <div>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Expense Management
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Add, edit, or delete expenses. Recalculations reflect across your budget and Reserve Wallet instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadFourDayExample}
            className="btn btn-secondary"
            title="Load the 4-day test scenario (Sat: 0, Sun: 100, Mon: 30, Tue: 120)"
          >
            <Sparkles size={16} />
            <span>Load 4-Day Example</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-primary"
          >
            <Plus size={18} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Logged Expenses</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            INR {monthCalculation.totalSpent}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Records</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
            {transactions.length} entries
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>Current Reserve Balance</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '4px' }}>
            INR {monthCalculation.currentReserveBalance}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--savings-badge)', fontWeight: 600 }}>Adjusted Projected Savings</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--savings-primary)', marginTop: '4px' }}>
            INR {monthCalculation.adjustedProjectedSavings}
          </div>
        </div>
      </div>

      {/* Transactions Table / List Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--primary)" />
            <span>Transaction Ledger</span>
          </h3>

          {transactions.length > 0 && (
            <button
              onClick={clearTransactions}
              style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}
            >
              Clear All
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Receipt size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-secondary)' }}>No expenses recorded yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
              Add a new expense or click "Load 4-Day Example" to test the calculation engine.
            </p>
            <button onClick={openAddModal} className="btn btn-primary">
              <Plus size={16} />
              <span>Add First Expense</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700 }}>Note</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {tx.date}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--bg-card-subtle)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                      {tx.note || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      INR {tx.amount}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(tx)}
                          style={{
                            padding: '6px',
                            color: 'var(--primary)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Edit Expense"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteExpense(tx.id)}
                          style={{
                            padding: '6px',
                            color: 'var(--danger)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          title="Delete Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '18px' }}>
              {editingId ? 'Edit Expense' : 'Add New Expense'}
            </h3>

            {formError && (
              <div className="alert-box alert-danger">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Amount */}
              <div className="form-group">
                <label className="form-label" htmlFor="expenseAmount">Amount (INR)</label>
                <div className="input-wrapper">
                  <IndianRupee size={18} className="input-icon" />
                  <input
                    id="expenseAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 100"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="input-field"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label" htmlFor="expenseCategory">Category</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <select
                    id="expenseCategory"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field"
                    required
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="expenseDate">Date</label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <input
                    id="expenseDate"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label" htmlFor="expenseNote">Note (Optional)</label>
                <div className="input-wrapper">
                  <FileText size={18} className="input-icon" />
                  <input
                    id="expenseNote"
                    type="text"
                    placeholder="e.g. Lunch at college canteen"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {editingId ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
