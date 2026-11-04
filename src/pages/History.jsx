import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  History as HistoryIcon,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Plus,
  Receipt,
  Wallet,
  PiggyBank,
  X,
  FileText,
  IndianRupee,
  Tag,
  ShieldCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useBudget, EXPENSE_CATEGORIES } from '../context/BudgetContext';
import { storageService, formatMonthName } from '../services/storage';
import { analyticsService } from '../services/analyticsService';

export default function History() {
  const { addExpense, activeMonth, activeRecord, loadThreeMonthDemo } = useBudget();
  const [monthsList, setMonthsList] = useState([]);
  const [selectedMonthRecord, setSelectedMonthRecord] = useState(null);

  const accumulatedData = useMemo(() => {
    return analyticsService.calculateAccumulatedSavings(monthsList, activeRecord);
  }, [monthsList, activeRecord]);

  // Late expense modal state
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);
  const [lateFormData, setLateFormData] = useState({
    amount: '',
    category: 'Food',
    date: '',
    note: '',
  });

  const refreshList = () => {
    const records = storageService.getAllMonthRecords();
    setMonthsList(records);
  };

  useEffect(() => {
    refreshList();
  }, [activeMonth]);

  const openMonthDetail = (record) => {
    // Re-fetch latest record from storage
    const fresh = storageService.getMonthRecord(record.month);
    setSelectedMonthRecord(fresh || record);
  };

  const closeMonthDetail = () => {
    setSelectedMonthRecord(null);
  };

  const openLateExpenseModal = (monthStr) => {
    setLateFormData({
      amount: '',
      category: 'Food',
      date: `${monthStr}-15`,
      note: 'Late expense entry',
    });
    setIsLateModalOpen(true);
  };

  const handleLateExpenseSubmit = (e) => {
    e.preventDefault();
    const amount = Number(lateFormData.amount);
    if (isNaN(amount) || amount < 0) return;

    addExpense({
      amount,
      category: lateFormData.category,
      date: lateFormData.date,
      note: lateFormData.note,
    });

    setIsLateModalOpen(false);
    refreshList();

    // Update selected modal if open
    if (selectedMonthRecord) {
      const updated = storageService.getMonthRecord(selectedMonthRecord.month);
      setSelectedMonthRecord(updated);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Monthly History & Savings
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Archive of all past and current months, lifetime accumulated savings, and individual cycle records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={loadThreeMonthDemo}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '6px 14px' }}
          >
            <Sparkles size={15} />
            <span>Load 3-Month Demo</span>
          </button>
          <Link
            to="/savings"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '6px 14px', textDecoration: 'none' }}
          >
            <PiggyBank size={15} />
            <span>Open Savings Vault</span>
          </Link>
        </div>
      </div>

      {/* DEDICATED SECTION: ACCUMULATED SAVINGS VAULT BANNER */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
          color: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 8px 20px -4px rgba(6, 78, 59, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.5px', color: '#a7f3d0' }}>
              <PiggyBank size={18} />
              <span>LIFETIME ACCUMULATED SAVINGS</span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '6px', letterSpacing: '-0.5px' }}>
              INR {accumulatedData.totalAccumulatedSavings}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#d1fae5' }}>
              Total preserved across {accumulatedData.monthsCount} recorded monthly cycle{accumulatedData.monthsCount !== 1 ? 's' : ''}.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              <ShieldCheck size={14} />
              <span>{accumulatedData.protectionRate}% Goal Protection</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
              Target: INR {accumulatedData.totalSavingsGoal}
            </span>
          </div>
        </div>

        {/* Monthly Savings Badges Strip */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {accumulatedData.months.map((m) => (
            <div
              key={`badge-${m.month}`}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 14px',
                minWidth: '140px',
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#a7f3d0', fontWeight: 600 }}>
                {formatMonthName(m.month)}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '2px' }}>
                INR {m.actualSavings}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#d1fae5', marginTop: '2px' }}>
                Total: INR {m.cumulativeTotal}
              </div>
            </div>
          ))}
        </div>
      </div>

      {monthsList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <HistoryIcon size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            No Archived Months Yet
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            As you use PiggyPocket and complete cycles, your monthly records will be archived here permanently.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {monthsList.map((rec) => {
            const calc = rec.calculation || {};
            const isAchieved = calc.savingsGoalAchieved;
            const isCurrent = rec.month === activeMonth;

            return (
              <div
                key={rec.month}
                className="card"
                style={{
                  borderLeft: isAchieved
                    ? '5px solid var(--savings-primary)'
                    : '5px solid var(--warning)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
                onClick={() => openMonthDetail(rec)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {formatMonthName(rec.month)}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {rec.month} {isCurrent ? '(Active Month)' : ''}
                    </span>
                  </div>

                  {/* Goal Achieved / Not Achieved Badge */}
                  {isAchieved ? (
                    <span className="badge badge-savings">
                      <CheckCircle2 size={12} />
                      <span>Goal Achieved</span>
                    </span>
                  ) : (
                    <span className="badge badge-warning">
                      <AlertTriangle size={12} />
                      <span>Goal Not Achieved</span>
                    </span>
                  )}
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '14px 0' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Spent</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                      INR {calc.totalSpent ?? 0}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>Final Reserve</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '2px' }}>
                      INR {calc.currentReserveBalance ?? 0}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: calc.cumulativeSavingsDeductions > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      Savings Deductions
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: calc.cumulativeSavingsDeductions > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '2px' }}>
                      INR {calc.cumulativeSavingsDeductions ?? 0}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--savings-badge)', fontWeight: 600 }}>Projected Savings</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--savings-primary)', marginTop: '2px' }}>
                      INR {calc.adjustedProjectedSavings ?? rec.savingsGoal}
                    </div>
                  </div>
                </div>

                {/* Footer status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rec.carryForwardDecision === 'carried'
                      ? 'Reserve carried to next month'
                      : rec.carryForwardDecision === 'reset'
                      ? 'Reserve reset to INR 0'
                      : `${rec.transactions?.length ?? 0} transactions logged`}
                  </span>

                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Details</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month Detailed Read-Only View Modal */}
      {selectedMonthRecord && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '16px'
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-wallet">Archived Record</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                  {formatMonthName(selectedMonthRecord.month)}
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Cycle started on day {selectedMonthRecord.dateReceived}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => openLateExpenseModal(selectedMonthRecord.month)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <Plus size={14} />
                  <span>Add Late Expense</span>
                </button>
                <button
                  type="button"
                  onClick={closeMonthDetail}
                  style={{ padding: '6px', color: 'var(--text-muted)' }}
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Overview Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pocket Money</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '2px' }}>
                  INR {selectedMonthRecord.pocketMoney}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Daily Limit</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '2px' }}>
                  INR {selectedMonthRecord.dailyLimit}/day
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>Final Reserve</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--wallet-primary)', marginTop: '2px' }}>
                  INR {selectedMonthRecord.calculation?.currentReserveBalance ?? 0}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--savings-badge)', fontWeight: 600 }}>Projected Savings</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--savings-primary)', marginTop: '2px' }}>
                  INR {selectedMonthRecord.calculation?.adjustedProjectedSavings ?? selectedMonthRecord.savingsGoal}
                </div>
              </div>
            </div>

            {/* Read-Only Transaction Ledger */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={16} />
                <span>Logged Transactions ({selectedMonthRecord.transactions?.length ?? 0})</span>
              </h4>

              {(!selectedMonthRecord.transactions || selectedMonthRecord.transactions.length === 0) ? (
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No transactions were logged for this month.
                </div>
              ) : (
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Date</th>
                        <th style={{ padding: '8px 10px' }}>Category</th>
                        <th style={{ padding: '8px 10px' }}>Note</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMonthRecord.transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{tx.date}</td>
                          <td style={{ padding: '8px 10px' }}>{tx.category}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{tx.note || '-'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>INR {tx.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Day-by-Day Breakdown Table */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} />
                <span>Day-by-Day Financial Breakdown</span>
              </h4>

              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Date</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Spent</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Surplus</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Overspent</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Reserve Used</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Deduction</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>New Reserve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedMonthRecord.calculation?.perDayBreakdown || []).map((day) => (
                      <tr key={day.date} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{day.date}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>INR {day.actualSpending}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: day.surplus > 0 ? 'var(--wallet-primary)' : 'inherit' }}>
                          {day.surplus > 0 ? `+${day.surplus}` : '0'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: day.overspending > 0 ? 'var(--danger)' : 'inherit' }}>
                          {day.overspending > 0 ? day.overspending : '0'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{day.reserveUsed > 0 ? `-${day.reserveUsed}` : '0'}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', color: day.savingsDeduction > 0 ? 'var(--danger)' : 'inherit', fontWeight: day.savingsDeduction > 0 ? 700 : 400 }}>
                          {day.savingsDeduction > 0 ? `-${day.savingsDeduction}` : '0'}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>INR {day.newReserve}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Late Expense Modal */}
      {isLateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 220,
            padding: '16px'
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
              Add Late Expense
            </h3>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              This expense will update the past month's records and cascade downstream if reserve was carried forward.
            </p>

            <form onSubmit={handleLateExpenseSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="lateAmount">Amount (INR)</label>
                <div className="input-wrapper">
                  <IndianRupee size={18} className="input-icon" />
                  <input
                    id="lateAmount"
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={lateFormData.amount}
                    onChange={(e) => setLateFormData({ ...lateFormData, amount: e.target.value })}
                    className="input-field"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lateCategory">Category</label>
                <div className="input-wrapper">
                  <Tag size={18} className="input-icon" />
                  <select
                    id="lateCategory"
                    value={lateFormData.category}
                    onChange={(e) => setLateFormData({ ...lateFormData, category: e.target.value })}
                    className="input-field"
                    required
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lateDate">Date in Selected Month</label>
                <div className="input-wrapper">
                  <Calendar size={18} className="input-icon" />
                  <input
                    id="lateDate"
                    type="date"
                    value={lateFormData.date}
                    onChange={(e) => setLateFormData({ ...lateFormData, date: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lateNote">Note</label>
                <div className="input-wrapper">
                  <FileText size={18} className="input-icon" />
                  <input
                    id="lateNote"
                    type="text"
                    value={lateFormData.note}
                    onChange={(e) => setLateFormData({ ...lateFormData, note: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsLateModalOpen(false)}
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
                  Save Late Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
