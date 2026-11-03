import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  Info,
  Clock,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBudget, getTodayString } from '../context/BudgetContext';

export default function Dashboard() {
  const { user } = useAuth();
  const {
    budgetConfig,
    effectiveDailyLimit,
    spendingBudget,
    selectedMonth,
    monthCalculation,
    loadFourDayExample
  } = useBudget();

  const todayStr = getTodayString();
  // State to inspect a particular day in the cycle (defaults to today or first day of cycle)
  const [inspectedDate, setInspectedDate] = useState(() => {
    const breakdown = monthCalculation.perDayBreakdown;
    const match = breakdown.find((d) => d.date === todayStr);
    return match ? todayStr : (breakdown[0]?.date || todayStr);
  });

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Student';

  // Find inspected day's details from the pure calculation breakdown
  const inspectedDay = monthCalculation.perDayBreakdown.find((d) => d.date === inspectedDate) || {
    date: inspectedDate,
    dailyLimit: effectiveDailyLimit,
    actualSpending: 0,
    surplus: effectiveDailyLimit,
    overspending: 0,
    reserveUsed: 0,
    savingsDeduction: 0,
    startingReserve: monthCalculation.currentReserveBalance,
    newReserve: monthCalculation.currentReserveBalance,
  };

  // Warning condition: Reserve Wallet hits 0 and savings deductions have occurred
  const hasSavingsDeductionWarning =
    monthCalculation.currentReserveBalance === 0 &&
    monthCalculation.cumulativeSavingsDeductions > 0;

  // Savings progress percentage (0 - 100%)
  const savingsProgressPct = budgetConfig.savingsGoal > 0
    ? Math.max(0, Math.min(100, Math.round((monthCalculation.adjustedProjectedSavings / budgetConfig.savingsGoal) * 100)))
    : 100;

  // Budget remaining percentage
  const budgetRemainingPct = spendingBudget > 0
    ? Math.max(0, Math.min(100, Math.round((monthCalculation.remainingSpendingBudget / spendingBudget) * 100)))
    : 0;

  return (
    <div>
      {/* 5. Warning Banner: Reserve Wallet hits 0 and overspending reduces projected savings */}
      {hasSavingsDeductionWarning && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
          }}
        >
          <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ color: '#991b1b', fontSize: '1rem', fontWeight: 800, marginBottom: '4px' }}>
              Warning: Reserve Wallet Depleted (INR 0)
            </h4>
            <p style={{ color: '#b91c1c', fontSize: '0.88rem', lineHeight: 1.5 }}>
              Your virtual Reserve Wallet has run out. Overspending has started deducting directly from your
              <strong> Projected Savings</strong> (Total deducted: INR {monthCalculation.cumulativeSavingsDeductions}).
              Control daily spending to prevent further erosion of your goal.
            </p>
          </div>
        </div>
      )}

      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Welcome, {firstName}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Cycle: <strong>{selectedMonth}</strong> (Money received on day {budgetConfig.dateReceived})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={loadFourDayExample}
            className="btn btn-secondary"
            title="Load 4-day scenario: Sat 0, Sun 100, Mon 30, Tue 120"
          >
            <Sparkles size={16} />
            <span>Load 4-Day Example</span>
          </button>

          <Link to="/expenses" className="btn btn-primary">
            <Plus size={18} />
            <span>Record Expense</span>
          </Link>
        </div>
      </div>

      {/* SECTION A: Monthly Budget Overview */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            A. Monthly Budget Overview
          </h3>
          <Link to="/setup" style={{ fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <SlidersHorizontal size={14} />
            <span>Edit Setup</span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Pocket Money */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Monthly Pocket Money
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
              INR {budgetConfig.pocketMoney}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Base allowance received
            </div>
          </div>

          {/* Original Savings Goal */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--savings-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Original Savings Goal
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--savings-primary)', marginTop: '6px' }}>
              INR {budgetConfig.savingsGoal}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Locked target (never overwritten)
            </div>
          </div>

          {/* Spending Budget */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
              Initial Spending Budget
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '6px' }}>
              INR {spendingBudget}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Pocket Money - Savings Goal
            </div>
          </div>

          {/* Total Spent */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Spent So Far
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
              INR {monthCalculation.totalSpent}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Across logged transactions
            </div>
          </div>

          {/* Remaining Budget */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.78rem', color: monthCalculation.remainingSpendingBudget < 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Remaining Budget
            </div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: monthCalculation.remainingSpendingBudget < 0 ? 'var(--danger)' : 'var(--text-main)',
                marginTop: '6px'
              }}
            >
              INR {monthCalculation.remainingSpendingBudget}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {budgetRemainingPct}% remaining of budget
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: Daily Spending Overview */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            B. Daily Spending Overview
          </h3>

          {/* Day Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Inspecting Day:</span>
            <select
              value={inspectedDate}
              onChange={(e) => setInspectedDate(e.target.value)}
              className="input-field no-icon"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
            >
              {monthCalculation.perDayBreakdown.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} {d.date === todayStr ? '(Today)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Daily Metric Status
              </span>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '2px' }}>
                Day: {inspectedDay.date} {inspectedDay.date === todayStr ? '(Today)' : ''}
              </h4>
            </div>

            <div>
              {inspectedDay.overspending > 0 ? (
                <span className="badge badge-warning">
                  Overspent by INR {inspectedDay.overspending}
                </span>
              ) : (
                <span className="badge" style={{ backgroundColor: 'var(--wallet-bg)', color: 'var(--wallet-badge)' }}>
                  Under Limit (Surplus: INR {inspectedDay.surplus})
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Day's Limit</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                INR {inspectedDay.dailyLimit}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Spent Today</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                INR {inspectedDay.actualSpending}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>Unused / Surplus</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '4px' }}>
                INR {inspectedDay.surplus}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: inspectedDay.overspending > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                Overspending
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: inspectedDay.overspending > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '4px' }}>
                INR {inspectedDay.overspending}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Reserve Flow
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                {inspectedDay.surplus > 0
                  ? `+ INR ${inspectedDay.surplus} added`
                  : inspectedDay.reserveUsed > 0
                  ? `- INR ${inspectedDay.reserveUsed} used`
                  : 'INR 0'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS C & D: Visually Distinct Reserve Wallet vs Savings Cards (Requirement 4) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* SECTION C: Reserve Wallet Card (Sky Blue Palette) */}
        <div
          className="card"
          style={{
            border: '2px solid var(--wallet-border)',
            background: 'var(--wallet-bg)',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--wallet-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Wallet size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--wallet-primary)' }}>
                  C. Reserve Wallet
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>
                  Virtual Cushion
                </span>
              </div>
            </div>

            <span className="badge badge-wallet">Never Negative</span>
          </div>

          {/* Current Balance */}
          <div style={{ marginBottom: '20px', padding: '16px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--wallet-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Current Reserve Balance
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '4px' }}>
              INR {monthCalculation.currentReserveBalance}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--wallet-badge)', marginTop: '4px' }}>
              Absorbs overspending before savings are touched
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: 'white', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wallet-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Accumulated</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '2px' }}>
                INR {monthCalculation.reserveAccumulated}
              </div>
            </div>

            <div style={{ background: 'white', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wallet-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Used</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                INR {monthCalculation.reserveUsed}
              </div>
            </div>

            <div style={{ background: 'white', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wallet-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deductions Avoided</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--savings-primary)', marginTop: '2px' }}>
                INR {monthCalculation.reserveUsed}
              </div>
            </div>
          </div>

          {/* Reserve Wallet Activity Log */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--wallet-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Reserve Activity History
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'white', borderRadius: 'var(--radius-sm)', border: '1px solid var(--wallet-border)' }}>
              {monthCalculation.perDayBreakdown
                .filter((d) => d.surplus > 0 || d.reserveUsed > 0 || d.savingsDeduction > 0)
                .length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No reserve movement yet. Log daily spending to see movements.
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    {monthCalculation.perDayBreakdown
                      .filter((d) => d.surplus > 0 || d.reserveUsed > 0 || d.savingsDeduction > 0)
                      .map((d) => (
                        <tr key={d.date} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{d.date}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {d.surplus > 0 && (
                              <span style={{ color: 'var(--wallet-primary)', fontWeight: 700 }}>
                                +INR {d.surplus} surplus
                              </span>
                            )}
                            {d.reserveUsed > 0 && (
                              <span style={{ color: '#b45309', fontWeight: 700 }}>
                                -INR {d.reserveUsed} used
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>
                            Bal: INR {d.newReserve}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* SECTION D: Savings Overview Card (Emerald Green Palette) */}
        <div
          className="card"
          style={{
            border: '2px solid var(--savings-border)',
            background: 'var(--savings-bg)',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--savings-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(5, 150, 105, 0.3)'
                }}
              >
                <PiggyBank size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--savings-primary)' }}>
                  D. Savings Overview
                </h3>
                {/* 3D Label Requirement */}
                <span style={{ fontSize: '0.75rem', color: 'var(--savings-badge)', fontWeight: 700 }}>
                  Projected, not an actual bank balance
                </span>
              </div>
            </div>

            <span className="badge badge-savings">Projection</span>
          </div>

          {/* Adjusted Projected Savings */}
          <div style={{ marginBottom: '20px', padding: '16px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--savings-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Adjusted Projected Savings
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: monthCalculation.cumulativeSavingsDeductions > 0 ? '#b91c1c' : 'var(--savings-primary)',
                marginTop: '4px'
              }}
            >
              INR {monthCalculation.adjustedProjectedSavings}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--savings-badge)', marginTop: '4px' }}>
              Original Goal: INR {monthCalculation.originalSavingsGoal} (Protected)
            </div>
          </div>

          {/* Deductions Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: 'white', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--savings-border)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Original Goal</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                INR {monthCalculation.originalSavingsGoal}
              </div>
            </div>

            <div style={{ background: 'white', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--savings-border)' }}>
              <div style={{ fontSize: '0.72rem', color: monthCalculation.cumulativeSavingsDeductions > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                Total Deducted
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: monthCalculation.cumulativeSavingsDeductions > 0 ? 'var(--danger)' : 'var(--text-main)',
                  marginTop: '2px'
                }}
              >
                INR {monthCalculation.cumulativeSavingsDeductions}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ background: 'white', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--savings-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
              <span>Savings Goal Retained</span>
              <span style={{ color: 'var(--savings-primary)' }}>{savingsProgressPct}%</span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${savingsProgressPct}%`,
                  background: savingsProgressPct < 80 ? '#f59e0b' : 'var(--savings-primary)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>

          {/* Notice Box */}
          <div style={{ marginTop: '14px', padding: '10px 12px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--savings-border)', fontSize: '0.75rem', color: 'var(--savings-badge)', lineHeight: 1.5 }}>
            Adjusted Projected Savings is a PROJECTION, not a real bank balance. Original Savings Goal is permanently preserved.
          </div>
        </div>
      </section>
    </div>
  );
}
