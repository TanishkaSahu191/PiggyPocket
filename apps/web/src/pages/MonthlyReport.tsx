import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { Button, Card, Skeleton } from '../components/ui/index.js';
import { useToast } from '../components/ui/Toast.js';
import { MonthlyReportData, CategoryTotal, CategoryComparisonItem } from '@smart-budget-tracker/shared';

interface AvailableMonth {
  monthKey: string;
  isCurrent: boolean;
  isFinished: boolean;
}

export const MonthlyReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    searchParams.get('monthKey') || ''
  );
  const [report, setReport] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'comparison'>('breakdown');

  // Quick expense logging state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseAmountRupees, setExpenseAmountRupees] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);

  // 1. Load available months
  useEffect(() => {
    let isMounted = true;
    async function fetchMonths() {
      try {
        const res = await apiRequest<{
          currentMonthKey: string;
          availableMonths: AvailableMonth[];
        }>('/api/reports/months');
        if (isMounted) {
          setAvailableMonths(res.availableMonths);
          if (!selectedMonth) {
            const initial = res.availableMonths[0]?.monthKey || res.currentMonthKey;
            setSelectedMonth(initial);
          }
        }
      } catch (err) {
        console.error('Failed to load months:', err);
      }
    }
    fetchMonths();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load report for selected month
  const loadReport = async (monthKey: string) => {
    if (!monthKey) return;
    setLoading(true);
    try {
      const data = await apiRequest<MonthlyReportData>(
        `/api/reports/monthly?monthKey=${monthKey}`
      );
      setReport(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
      addToast(`Could not load report for ${monthKey}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      setSearchParams({ monthKey: selectedMonth });
      loadReport(selectedMonth);
    }
  }, [selectedMonth]);

  const formatRupees = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (!availableMonths.length || !selectedMonth) return;
    const currentIndex = availableMonths.findIndex((m) => m.monthKey === selectedMonth);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentIndex + 1].monthKey);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedMonth(availableMonths[currentIndex - 1].monthKey);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmountRupees || Number(expenseAmountRupees) <= 0) return;

    setAddingExpense(true);
    try {
      const dateToUse = expenseDate || `${selectedMonth}-05T12:00:00Z`;
      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          amountPaise: Math.round(Number(expenseAmountRupees) * 100),
          category: expenseCategory,
          note: expenseNote,
          occurredAt: dateToUse
        })
      });

      addToast('Expense logged! Report updated live.', 'success');
      setShowAddExpense(false);
      setExpenseAmountRupees('');
      setExpenseNote('');
      setExpenseDate('');
      // Reload report live
      await loadReport(selectedMonth);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add expense';
      addToast(msg, 'error');
    } finally {
      setAddingExpense(false);
    }
  };

  const getStatusBadge = (status: string, isFinished: boolean) => {
    let color = '#10b981';
    let bgColor = 'rgba(16, 185, 129, 0.15)';
    let borderColor = 'rgba(16, 185, 129, 0.3)';
    let label = status;

    if (status === 'ACHIEVED' || status === 'ON_TRACK') {
      color = '#10b981';
      bgColor = 'rgba(16, 185, 129, 0.15)';
      borderColor = 'rgba(16, 185, 129, 0.3)';
      label = isFinished ? '🎯 ACHIEVED' : '🟢 ON TRACK';
    } else if (status === 'PARTIAL' || status === 'REDUCED') {
      color = '#f59e0b';
      bgColor = 'rgba(245, 158, 11, 0.15)';
      borderColor = 'rgba(245, 158, 11, 0.3)';
      label = isFinished ? '⚠️ PARTIAL' : '🟡 REDUCED';
    } else if (status === 'MISSED' || status === 'AT_RISK' || status === 'AT_RISK_OR_LOST') {
      color = '#ef4444';
      bgColor = 'rgba(239, 68, 68, 0.15)';
      borderColor = 'rgba(239, 68, 68, 0.3)';
      label = isFinished ? '🚨 MISSED' : '🔴 AT RISK';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.85rem',
          fontWeight: 700,
          color,
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg, #0b132b)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.25rem 1rem 3.5rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        {/* Navigation Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/home')}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          >
            ← Home
          </Button>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
            Monthly Report 📊
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          >
            ⚙️ Settings
          </Button>
        </header>

        {/* Month Selector Bar */}
        <Card
          variant="glass"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem'
          }}
        >
          <button
            onClick={() => handleMonthChange('prev')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem'
            }}
            title="Previous month"
          >
            ◀
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📅</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {availableMonths.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.monthKey} {m.isCurrent ? '(Current)' : '(Finished)'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleMonthChange('next')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem'
            }}
            title="Next month"
          >
            ▶
          </button>
        </Card>

        {/* Content Section */}
        {loading ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <Skeleton height="2rem" width="50%" />
              <Skeleton height="4rem" width="100%" />
              <Skeleton height="3rem" width="100%" />
            </div>
          </Card>
        ) : report ? (
          <>
            {/* Top Goal Status & Projected Savings Banner */}
            <Card
              variant="glass"
              style={{
                background:
                  report.goalStatus === 'ACHIEVED' || report.goalStatus === 'ON_TRACK'
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : report.goalStatus === 'PARTIAL' || report.goalStatus === 'REDUCED'
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
                borderColor:
                  report.goalStatus === 'ACHIEVED' || report.goalStatus === 'ON_TRACK'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : report.goalStatus === 'PARTIAL' || report.goalStatus === 'REDUCED'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {report.isFinished ? 'Finished Month Summary' : 'Current Month Ongoing'}
                  </span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    Savings Goal Status
                  </div>
                </div>
                {getStatusBadge(report.goalStatus, report.isFinished)}
              </div>

              {/* CRITICAL SPEC REQUIREMENT: Always label it 'projected', never 'saved' */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  padding: '1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    PROJECTED SAVINGS
                  </div>
                  <div
                    style={{
                      fontSize: '1.85rem',
                      fontWeight: 800,
                      color:
                        report.projectedSavingsPaise >= report.originalSavingsGoalPaise
                          ? '#10b981'
                          : report.projectedSavingsPaise > 0
                          ? '#f59e0b'
                          : '#ef4444'
                    }}
                  >
                    {formatRupees(report.projectedSavingsPaise)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Original Goal</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>
                    {formatRupees(report.originalSavingsGoalPaise)}
                  </div>
                  {report.cumulativeShortfallPaise > 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                      Shortfall: -{formatRupees(report.cumulativeShortfallPaise)}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Financial Overview Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Card style={{ padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pocket Money</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  {formatRupees(report.pocketMoneyPaise)}
                </div>
              </Card>

              <Card style={{ padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Spending Budget</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  {formatRupees(report.initialSpendingBudgetPaise)}
                </div>
              </Card>

              <Card style={{ padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Spent</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                  {formatRupees(report.totalSpentPaise)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  {report.transactionCount} {report.transactionCount === 1 ? 'expense' : 'expenses'}
                </div>
              </Card>

              <Card style={{ padding: '0.9rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Remaining Budget</div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: report.remainingMonthlyBudgetPaise >= 0 ? '#10b981' : '#ef4444'
                  }}
                >
                  {formatRupees(report.remainingMonthlyBudgetPaise)}
                </div>
              </Card>
            </div>

            {/* Budget vs Actual Comparison Bar */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Budget vs Actual
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                  {report.budgetVsActual.percentageSpent}% of budget used
                </span>
              </div>
              <div
                style={{
                  height: '10px',
                  backgroundColor: '#1e293b',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  display: 'flex'
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, report.budgetVsActual.percentageSpent)}%`,
                    backgroundColor:
                      report.budgetVsActual.percentageSpent > 100
                        ? '#ef4444'
                        : report.budgetVsActual.percentageSpent > 80
                        ? '#f59e0b'
                        : '#10b981',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                <span>Budget: {formatRupees(report.budgetVsActual.budgetPaise)}</span>
                <span>
                  {report.budgetVsActual.variancePaise >= 0
                    ? `Under by ${formatRupees(report.budgetVsActual.variancePaise)}`
                    : `Over by ${formatRupees(Math.abs(report.budgetVsActual.variancePaise))}`}
                </span>
              </div>
            </Card>

            {/* Reservoir Usage Card */}
            <Card
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                borderColor: 'rgba(59, 130, 246, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🛡️</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#93c5fd' }}>
                  Reservoir Buffer Usage
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Total Banked</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>
                    {formatRupees(report.reservoirUsage.totalBankedPaise)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Total Drawn</div>
                  <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {formatRupees(report.reservoirUsage.totalDrawnPaise)}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Days Reservoir Used</div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0' }}>
                    {report.reservoirUsage.daysReservoirUsed} days
                  </div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Month-End Leftover</div>
                  <div style={{ fontWeight: 700, color: '#60a5fa' }}>
                    {formatRupees(report.reservoirUsage.balanceLeftAtMonthEnd)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem' }}>
                💡 <em>Leftover reservoir is reported as unspent budget and is not automatically converted into savings.</em>
              </div>
            </Card>

            {/* Plain-Language Spending Habits Summary */}
            <Card
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                borderLeft: '4px solid #10b981',
                padding: '1rem'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                🧠 Spending Habits Summary
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {report.spendingHabitsSummary}
              </p>
            </Card>

            {/* View Tabs: Category Breakdown vs Month Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('breakdown')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: `1px solid ${activeTab === 'breakdown' ? '#10b981' : '#334155'}`,
                  backgroundColor: activeTab === 'breakdown' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                  color: activeTab === 'breakdown' ? '#10b981' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🏷️ Categories ({report.categoryBreakdown.length})
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: `1px solid ${activeTab === 'comparison' ? '#10b981' : '#334155'}`,
                  backgroundColor: activeTab === 'comparison' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                  color: activeTab === 'comparison' ? '#10b981' : '#cbd5e1',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ⚖️ MoM Comparison
              </button>
            </div>

            {/* TAB 1: Category-Wise Spending Table & Bars */}
            {activeTab === 'breakdown' && (
              <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    Category Breakdown
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddExpense(true)}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    + Add Expense
                  </Button>
                </div>

                {report.categoryBreakdown.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem 0', fontSize: '0.85rem' }}>
                    No expenses logged for this month yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {report.categoryBreakdown.map((cat: CategoryTotal) => (
                      <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{cat.category}</span>
                          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
                            {formatRupees(cat.totalPaise)}{' '}
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                              ({cat.percentageOfTotal}%)
                            </span>
                          </span>
                        </div>
                        <div
                          style={{
                            height: '6px',
                            backgroundColor: '#1e293b',
                            borderRadius: '9999px',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${cat.percentageOfTotal}%`,
                              backgroundColor: '#10b981',
                              height: '100%',
                              borderRadius: '9999px'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* TAB 2: Month vs Previous Month Comparison */}
            {activeTab === 'comparison' && (
              <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    {report.comparison?.previousMonthKey
                      ? `${selectedMonth} vs ${report.comparison.previousMonthKey}`
                      : 'Month-over-Month Comparison'}
                  </span>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Category-by-category changes compared to last month.
                  </p>
                </div>

                {!report.comparison || report.comparison.categories.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem 0', fontSize: '0.85rem' }}>
                    No prior month data available to compare.
                  </div>
                ) : (
                  <>
                    {/* Overall Diff Banner */}
                    <div
                      style={{
                        backgroundColor: '#1e293b',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span style={{ color: '#94a3b8' }}>Total Spend Shift:</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: report.comparison.totalDiffPaise <= 0 ? '#10b981' : '#ef4444'
                        }}
                      >
                        {report.comparison.totalDiffPaise >= 0 ? '+' : ''}
                        {formatRupees(report.comparison.totalDiffPaise)}{' '}
                        {report.comparison.totalPercentageChange !== null &&
                          `(${report.comparison.totalPercentageChange > 0 ? '+' : ''}${
                            report.comparison.totalPercentageChange
                          }%)`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {report.comparison.categories.map((c: CategoryComparisonItem) => (
                        <div
                          key={c.category}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.5rem 0',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>{c.category}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              Prev: {formatRupees(c.previousMonthPaise)} → Now: {formatRupees(c.currentMonthPaise)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontWeight: 700,
                                color: c.diffPaise <= 0 ? '#10b981' : '#ef4444'
                              }}
                            >
                              {c.diffPaise >= 0 ? '+' : ''}
                              {formatRupees(c.diffPaise)}
                            </div>
                            {c.percentageChange !== null && (
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {c.percentageChange > 0 ? '+' : ''}
                                {c.percentageChange}%
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            )}
          </>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
              No budget period setup for {selectedMonth}.
            </div>
          </Card>
        )}

        {/* Quick Add Expense Modal */}
        {showAddExpense && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-title"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 9999
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#0f172a',
                borderRadius: '16px',
                border: '1px solid #334155',
                padding: '1.5rem',
                color: '#f8fafc'
              }}
            >
              <h3 id="add-expense-title" style={{ margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 800 }}>
                Log Expense (Updates Live)
              </h3>
              <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={expenseAmountRupees}
                    onChange={(e) => setExpenseAmountRupees(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '1rem'
                    }}
                    placeholder="e.g. 150"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Books">Books & Stationery</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Note / Description (auto-applies category keywords)
                  </label>
                  <input
                    type="text"
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                    placeholder="e.g. Swiggy dinner"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                    Date (leave blank for default)
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddExpense(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={addingExpense}
                    style={{ flex: 2, fontWeight: 700 }}
                  >
                    {addingExpense ? 'Saving...' : 'Save Expense'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
