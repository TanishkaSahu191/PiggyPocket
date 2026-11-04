import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart2,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  X,
  Printer,
  Shield,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { useBudget, getTodayString } from '../context/BudgetContext';
import { storageService, formatMonthName, getPreviousMonthString } from '../services/storage';
import { analyticsService, CATEGORY_COLORS } from '../services/analyticsService';
import { fireCelebrationConfetti } from '../components/common/CelebrationConfetti';

export default function Reports() {
  const {
    activeMonth,
    activeRecord,
    budgetConfig,
    effectiveDailyLimit,
    monthCalculation,
    loadFourDayExample,
  } = useBudget();

  const todayString = getTodayString();
  const dailyLimit = effectiveDailyLimit || 50;
  const perDayBreakdown = monthCalculation?.perDayBreakdown || [];
  const currentReserveBalance = monthCalculation?.currentReserveBalance || 0;
  const adjustedProjectedSavings = monthCalculation?.adjustedProjectedSavings || 0;
  const savingsGoal = budgetConfig?.savingsGoal || 1000;
  const cumulativeSavingsDeductions = monthCalculation?.cumulativeSavingsDeductions || 0;
  const totalSpent = monthCalculation?.totalSpent || 0;
  const pocketMoney = budgetConfig?.pocketMoney || 2500;
  const isConfigured = budgetConfig?.isConfigured;

  // All recorded months for selection & comparison
  const allMonths = useMemo(() => {
    const list = storageService.getAllMonthRecords();
    const months = list.map((r) => r.month);
    if (activeMonth && !months.includes(activeMonth)) {
      months.unshift(activeMonth);
    }
    return months.length > 0 ? months : [activeMonth];
  }, [activeMonth, activeRecord]);

  // Selected month for primary reports view
  const [selectedMonth, setSelectedMonth] = useState(activeMonth);

  useEffect(() => {
    if (activeMonth) {
      setSelectedMonth(activeMonth);
    }
  }, [activeMonth]);

  // Month-over-month comparison selection
  const previousMonthDefault = getPreviousMonthString(activeMonth);
  const [compareMonthA, setCompareMonthA] = useState(
    allMonths.includes(previousMonthDefault) ? previousMonthDefault : activeMonth
  );
  const [compareMonthB, setCompareMonthB] = useState(activeMonth);

  // Month-end report modal
  const [isMonthEndModalOpen, setIsMonthEndModalOpen] = useState(false);

  // Load record for currently inspected month
  const targetRecord = useMemo(() => {
    if (selectedMonth === activeMonth && activeRecord) {
      return activeRecord;
    }
    const stored = storageService.getMonthRecord(selectedMonth);
    return stored || activeRecord;
  }, [selectedMonth, activeMonth, activeRecord]);

  const targetCalc = targetRecord?.calculation || monthCalculation || {};
  const targetTransactions = targetRecord?.transactions || [];
  const targetBreakdown = targetCalc?.perDayBreakdown || perDayBreakdown || [];

  // 1. Category Spending Analysis
  const categoryData = useMemo(() => {
    return analyticsService.calculateCategorySpending(targetTransactions || []);
  }, [targetTransactions]);

  // 2. Daily Spending Trend Analysis
  const dailyTrendData = useMemo(() => {
    return analyticsService.prepareDailySpendingTrend(
      targetBreakdown || [],
      targetRecord?.dailyLimit ?? dailyLimit
    );
  }, [targetBreakdown, targetRecord, dailyLimit]);

  // 3. Reserve Wallet Trajectory
  const reserveTrendData = useMemo(() => {
    return analyticsService.prepareReserveTrend(
      targetBreakdown || [],
      targetRecord?.startingReserve ?? 0
    );
  }, [targetBreakdown, targetRecord]);

  // 4. Month-Over-Month Comparison
  const comparisonData = useMemo(() => {
    const recA = (compareMonthA === activeMonth && activeRecord)
      ? activeRecord
      : storageService.getMonthRecord(compareMonthA);
    const recB = (compareMonthB === activeMonth && activeRecord)
      ? activeRecord
      : storageService.getMonthRecord(compareMonthB);
    return analyticsService.compareTwoMonths(recA, recB);
  }, [compareMonthA, compareMonthB, activeMonth, activeRecord]);

  // 5. Streaks & Celebrations
  const todayBreakdown = useMemo(() => {
    return (perDayBreakdown || []).find((d) => d.date === todayString) || {};
  }, [perDayBreakdown, todayString]);

  const streak = useMemo(() => {
    return analyticsService.calculateSpendingStreak(perDayBreakdown || [], todayString);
  }, [perDayBreakdown, todayString]);

  const celebration = useMemo(() => {
    return analyticsService.generateCelebrationData({
      streak,
      todaySpent: todayBreakdown.actualSpending ?? 0,
      dailyLimit,
      cumulativeSavingsDeductions,
    });
  }, [streak, todayBreakdown, dailyLimit, cumulativeSavingsDeductions]);

  // 6. Proactive Alerts
  const alerts = useMemo(() => {
    return analyticsService.generateBudgetAlerts({
      todaySpent: todayBreakdown.actualSpending ?? 0,
      dailyLimit,
      currentReserve: currentReserveBalance,
      peakReserve: reserveTrendData.peakReserve,
      cumulativeSavingsDeductions,
      adjustedProjectedSavings,
      originalSavingsGoal: savingsGoal,
    });
  }, [
    todayBreakdown,
    dailyLimit,
    currentReserveBalance,
    reserveTrendData,
    cumulativeSavingsDeductions,
    adjustedProjectedSavings,
    savingsGoal,
  ]);

  // Handle celebration click
  const handleCelebrateClick = () => {
    fireCelebrationConfetti();
  };

  return (
    <div className="reports-page" style={{ paddingBottom: '40px' }}>
      
      {/* HEADER ROW WITH MONTH SELECTOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Budget Reports & Analytics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Visual breakdowns, daily spending trends, reserve wallet trajectory, and comparative insights.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="var(--primary)" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field"
              style={{ width: 'auto', height: '38px', padding: '0 12px', fontWeight: 600 }}
            >
              {allMonths.length > 0 ? (
                allMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthName(m)}
                  </option>
                ))
              ) : (
                <option value={activeMonth}>{formatMonthName(activeMonth)}</option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsMonthEndModalOpen(true)}
            className="btn btn-secondary"
            style={{ height: '38px', padding: '0 14px', fontSize: '0.88rem' }}
          >
            <FileText size={16} />
            <span>Month-End Report</span>
          </button>
        </div>
      </div>

      {/* SETUP REMINDER BANNER IF BUDGET NOT CONFIGURED */}
      {!isConfigured && (
        <div
          className="card"
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="#b45309" />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>
                Budget Not Configured Yet
              </div>
              <div style={{ fontSize: '0.84rem', color: '#b45309', marginTop: '2px' }}>
                Set your monthly pocket money and savings goal to activate daily limits and projections.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={loadFourDayExample}
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 12px', background: '#ffffff' }}
            >
              Load Sample Activity
            </button>
            <Link
              to="/setup"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '6px 14px', textDecoration: 'none' }}
            >
              <SlidersHorizontal size={14} />
              <span>Configure Budget</span>
            </Link>
          </div>
        </div>
      )}

      {/* PROACTIVE ALERTS SECTION */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {alerts.map((alert) => (
            <div key={alert.id} className={`alert-box alert-${alert.type}`} style={{ margin: 0 }}>
              {alert.type === 'danger' ? (
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              <div>
                <strong>{alert.title}:</strong> {alert.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POSITIVE REINFORCEMENT & STREAK BANNER */}
      {celebration.hasAchievement && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #eef2ff 0%, #ecfdf5 100%)',
            border: '1px solid #c7d2fe',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '18px 24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {celebration.title}
                </h4>
                <span className="badge badge-savings">{celebration.badge}</span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {celebration.message}
              </p>
            </div>
          </div>

          {celebration.canCelebrate && (
            <button
              type="button"
              onClick={handleCelebrateClick}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '8px 16px' }}
            >
              <Sparkles size={15} />
              <span>Celebrate Streak</span>
            </button>
          )}
        </div>
      )}

      {/* GRID: CATEGORY SPENDING (1) & DAILY SPENDING TREND (2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* SECTION 1: CATEGORY-WISE SPENDING (DONUT CHART & TABLE) */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <PieChartIcon size={18} color="var(--primary)" />
              <span>Category Breakdown</span>
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Total: INR {categoryData.totalSpent}
            </span>
          </div>

          {categoryData.categories.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No expenses recorded for {formatMonthName(selectedMonth)} yet.
            </div>
          ) : (
            <div>
              {/* Donut Chart */}
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData.categories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {categoryData.categories.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`INR ${val}`, 'Spent']}
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown Table */}
              <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Category</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.categories.map((c) => (
                      <tr key={c.category} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
                          <span style={{ fontWeight: 600 }}>{c.category}</span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                          INR {c.amount}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {c.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: DAILY SPENDING TREND CHART */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <BarChart2 size={18} color="var(--primary)" />
              <span>Daily Spending Trend</span>
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Limit: INR {targetRecord?.dailyLimit ?? dailyLimit}/day
            </span>
          </div>

          {dailyTrendData.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No daily transactions available for this month.
            </div>
          ) : (
            <div>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, name, item) => {
                        const d = item.payload;
                        return [
                          `INR ${val} (Limit: INR ${d.limit}) ${d.isOverLimit ? '• Over Limit' : '• Within Limit'}`,
                          'Spent',
                        ];
                      }}
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      y={targetRecord?.dailyLimit ?? dailyLimit}
                      stroke="#4f46e5"
                      strokeDasharray="4 4"
                      label={{ value: 'Daily Limit', position: 'top', fill: '#4f46e5', fontSize: 10 }}
                    />
                    <Bar dataKey="spent" radius={[4, 4, 0, 0]}>
                      {dailyTrendData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.barColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Trend Legend */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
                  <span>Within Limit (Added to Reserve)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
                  <span>Exceeded Limit (Deducted)</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SECTION 3: RESERVE WALLET BALANCE OVER TIME (LINE CHART) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <TrendingUp size={18} color="var(--wallet-primary)" />
              <span>Reserve Wallet Trajectory</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              How daily unused limit accumulated and absorbed overspending across {formatMonthName(selectedMonth)}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <span className="badge badge-wallet">
              Peak: INR {reserveTrendData.peakReserve}
            </span>
            <span className="badge badge-wallet">
              Final: INR {reserveTrendData.finalReserve}
            </span>
          </div>
        </div>

        {reserveTrendData.trend.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No reserve wallet records found for this period.
          </div>
        ) : (
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reserveTrendData.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="walletGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name, item) => [
                    `INR ${val} (Surplus: +${item.payload.surplusAdded}, Used: -${item.payload.reserveUsed})`,
                    'Reserve Balance',
                  ]}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="reserveBalance"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#walletGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* SECTION 4: MONTH-OVER-MONTH COMPARISON & INSIGHTS */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.08rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Layers size={18} color="var(--primary)" />
              <span>Month-over-Month Comparison</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Compare budget execution, savings protection, and category shifts across any two months.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={compareMonthA}
              onChange={(e) => setCompareMonthA(e.target.value)}
              className="input-field"
              style={{ width: 'auto', height: '36px', padding: '0 10px', fontSize: '0.85rem' }}
            >
              {allMonths.map((m) => (
                <option key={`a-${m}`} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>vs</span>
            <select
              value={compareMonthB}
              onChange={(e) => setCompareMonthB(e.target.value)}
              className="input-field"
              style={{ width: 'auto', height: '36px', padding: '0 10px', fontSize: '0.85rem' }}
            >
              {allMonths.map((m) => (
                <option key={`b-${m}`} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {comparisonData ? (
          <div>
            {/* Comparison Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              
              {/* Total Spending Compare */}
              <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SPENDING</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
                  INR {comparisonData.spendB}
                </div>
                <div style={{ fontSize: '0.8rem', color: comparisonData.spendDiff <= 0 ? 'var(--savings-primary)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 600 }}>
                  {comparisonData.spendDiff <= 0 ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  <span>{Math.abs(comparisonData.spendPercentChange)}% vs {formatMonthName(comparisonData.monthA)}</span>
                </div>
              </div>

              {/* Top Category Compare */}
              <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOP EXPENSE</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '4px' }}>
                  {comparisonData.topB?.category || 'None'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {comparisonData.topB ? `INR ${comparisonData.topB.amount} (${comparisonData.topB.percentage}%)` : 'No expenses'}
                </div>
              </div>

              {/* Reserve Accumulated Compare */}
              <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESERVE ACCUMULATED</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--wallet-primary)', marginTop: '4px' }}>
                  INR {comparisonData.reserveAccumB}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {comparisonData.reserveDiff >= 0 ? `+INR ${comparisonData.reserveDiff} vs ${formatMonthName(comparisonData.monthA)}` : `-INR ${Math.abs(comparisonData.reserveDiff)} vs ${formatMonthName(comparisonData.monthA)}`}
                </div>
              </div>

              {/* Savings Goal Status */}
              <div style={{ padding: '14px', background: 'var(--bg-card-subtle)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>SAVINGS GOAL STATUS</div>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge ${comparisonData.goalAchievedB ? 'badge-savings' : 'badge-danger'}`}>
                    {comparisonData.goalAchievedB ? 'Goal Achieved / On Track' : 'Savings Deducted'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {formatMonthName(comparisonData.monthB)}
                </div>
              </div>

            </div>

            {/* Plain-Language Insights Box */}
            <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Comparative Insights:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {comparisonData.insights.map((insight, idx) => (
                  <li key={`ins-${idx}`}>{insight}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Select two valid months to generate comparison metrics.
          </div>
        )}
      </div>

      {/* SECTION 5: MONTH-END REPORT MODAL */}
      {isMonthEndModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  Month-End Financial Statement
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Period: {formatMonthName(selectedMonth)} • Student Budget Account
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthEndModalOpen(false)}
                style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', border: 'none', background: 'transparent' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Statement Summary Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Pocket Money</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>INR {targetRecord?.pocketMoney ?? pocketMoney}</div>
              </div>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Original Savings Goal</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--savings-primary)' }}>
                  INR {targetRecord?.savingsGoal ?? savingsGoal}
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Amount Spent</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>INR {targetCalc.totalSpent ?? 0}</div>
              </div>
              <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining Spending Budget</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>INR {targetCalc.remainingSpendingBudget ?? 0}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--wallet-bg)', borderRadius: '6px', border: '1px solid var(--wallet-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--wallet-badge)' }}>Reserve Wallet Absorbed</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--wallet-primary)' }}>
                  INR {targetCalc.reserveUsed ?? 0}
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--savings-bg)', borderRadius: '6px', border: '1px solid var(--savings-border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--savings-badge)' }}>Adjusted Projected Savings</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--savings-primary)' }}>
                  INR {targetCalc.adjustedProjectedSavings ?? 0}
                </div>
              </div>
            </div>

            {/* Projection Notice */}
            <div style={{ fontSize: '0.78rem', color: 'var(--savings-badge)', background: 'var(--savings-bg)', padding: '8px 12px', borderRadius: '6px', marginBottom: '20px' }}>
              * Note: Projected savings is a projection, not an actual bank balance. Original goal is permanently preserved.
            </div>

            {/* Category Breakdown Table */}
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
              Category Spending Breakdown
            </h4>
            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>Category</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.categories.map((c) => (
                    <tr key={c.category} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{c.category}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>INR {c.amount}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{c.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-secondary"
                style={{ fontSize: '0.88rem' }}
              >
                <Printer size={16} />
                <span>Print Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMonthEndModalOpen(false)}
                className="btn btn-primary"
                style={{ fontSize: '0.88rem' }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
