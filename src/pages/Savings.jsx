import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useBudget } from '../context/BudgetContext';
import { storageService, formatMonthName } from '../services/storage';
import { analyticsService } from '../services/analyticsService';
import { fireCelebrationConfetti } from '../components/common/CelebrationConfetti';

export default function Savings() {
  const {
    activeMonth,
    activeRecord,
    monthCalculation,
    budgetConfig,
    loadThreeMonthDemo,
  } = useBudget();

  // Load all month records from storage
  const allRecords = useMemo(() => {
    return storageService.getAllMonthRecords();
  }, [activeMonth, activeRecord]);

  // Calculate accumulated savings metrics
  const savingsData = useMemo(() => {
    return analyticsService.calculateAccumulatedSavings(allRecords, activeRecord);
  }, [allRecords, activeRecord]);

  // Milestones definition
  const milestones = [
    { target: 1000, title: 'Starter Saver', desc: 'Protected first INR 1,000 in personal savings' },
    { target: 3000, title: 'Consistent Student', desc: 'Accumulated INR 3,000 emergency fund' },
    { target: 5000, title: 'Semester Safety Net', desc: 'Reached INR 5,000 student reserve fund' },
    { target: 10000, title: 'Campus Capitalist', desc: 'Achieved 5-figure savings milestone' },
  ];

  const handleMilestoneClick = (target) => {
    if (savingsData.totalAccumulatedSavings >= target) {
      fireCelebrationConfetti();
    }
  };

  return (
    <div className="savings-page" style={{ paddingBottom: '40px' }}>
      
      {/* HEADER SECTION */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Accumulated Savings Vault
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Track your lifetime preserved savings, monthly target progress, and wealth accumulation over time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={loadThreeMonthDemo}
            className="btn btn-secondary"
            title="Populate 3 months of past savings data to preview accumulation trajectory"
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <Sparkles size={16} />
            <span>Load 3-Month Demo</span>
          </button>

          <Link
            to="/setup"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '8px 14px', textDecoration: 'none' }}
          >
            <SlidersHorizontal size={16} />
            <span>Adjust Savings Goal</span>
          </Link>
        </div>
      </div>

      {/* HERO VAULT SUMMARY CARD */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a8a 100%)',
          color: '#ffffff',
          padding: '28px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(30, 27, 75, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85, fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>
              <PiggyBank size={18} color="#93c5fd" />
              <span>TOTAL ACCUMULATED SAVINGS</span>
            </div>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, marginTop: '8px', letterSpacing: '-1px' }}>
              INR {savingsData.totalAccumulatedSavings}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#cbd5e1' }}>
              Preserved across {savingsData.monthsCount} recorded monthly cycle{savingsData.monthsCount !== 1 ? 's' : ''}.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#6ee7b7',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <ShieldCheck size={16} />
              <span>{savingsData.protectionRate}% Protected</span>
            </span>

            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Original Target: INR {savingsData.totalSavingsGoal}
            </span>
          </div>
        </div>

        {/* Hero Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>AVERAGE MONTHLY SAVINGS</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>
              INR {savingsData.averageMonthlySavings}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>Per calendar cycle</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SAVINGS DEDUCTIONS</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: savingsData.totalDeductions > 0 ? '#fca5a5' : '#86efac', marginTop: '4px' }}>
              INR {savingsData.totalDeductions}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
              {savingsData.totalDeductions === 0 ? 'Zero deductions suffered' : 'Eroded by overspending'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>CURRENT MONTH PROJECTED</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd', marginTop: '4px' }}>
              INR {monthCalculation?.adjustedProjectedSavings ?? budgetConfig?.savingsGoal ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
              Target: INR {budgetConfig?.savingsGoal ?? 1000}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SAVINGS EFFICIENCY</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px' }}>
              {savingsData.totalSavingsGoal > 0
                ? `${Math.round((savingsData.totalAccumulatedSavings / savingsData.totalSavingsGoal) * 100)}%`
                : '100%'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>Goal preservation rate</div>
          </div>
        </div>
      </div>

      {/* ACCUMULATED SAVINGS GROWTH TRAJECTORY CHART */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <TrendingUp size={20} color="var(--primary)" />
              <span>Accumulated Savings Growth Trajectory</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Cumulative wealth progression (line) alongside monthly preserved savings contributions (bars).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} />
              <span>Monthly Savings</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#4f46e5', borderRadius: '2px' }} />
              <span>Accumulated Total</span>
            </span>
          </div>
        </div>

        {savingsData.chartData.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No savings records available yet. Configure your monthly budget or load demo data.
          </div>
        ) : (
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={savingsData.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="accumulatedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name) => {
                    if (name === 'accumulatedSavings') return [`INR ${val}`, 'Total Accumulated Savings'];
                    if (name === 'monthlySavings') return [`INR ${val}`, 'Monthly Savings Preserved'];
                    return [`INR ${val}`, name];
                  }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar yAxisId="left" dataKey="monthlySavings" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="accumulatedSavings"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#accumulatedGradient)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* MONTH-BY-MONTH SAVINGS BREAKDOWN TABLE */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Layers size={18} color="var(--primary)" />
              <span>Month-by-Month Savings Breakdown</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Exact pocket money, target goals, deductions, and running cumulative savings for every cycle.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px' }}>Month Cycle</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Pocket Money</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Target Goal</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Deductions</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Savings Preserved</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Savings Rate</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Cumulative Total</th>
                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Goal Status</th>
              </tr>
            </thead>
            <tbody>
              {savingsData.months.map((m) => (
                <tr key={m.month} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {formatMonthName(m.month)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.month} {m.isCurrent ? '• Active Cycle' : ''}
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                    INR {m.pocketMoney}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    INR {m.savingsGoal}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: m.savingsDeductions > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {m.savingsDeductions > 0 ? `-INR ${m.savingsDeductions}` : 'INR 0'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--savings-primary)' }}>
                    INR {m.actualSavings}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {m.savingsRate}%
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                    INR {m.cumulativeTotal}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    {m.isAchieved ? (
                      <span className="badge badge-savings" style={{ fontSize: '0.75rem' }}>
                        <CheckCircle2 size={12} />
                        <span>Preserved</span>
                      </span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                        <AlertTriangle size={12} />
                        <span>Adjusted</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAVINGS MILESTONES SECTION */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.12rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Award size={18} color="var(--primary)" />
            <span>Savings Milestones & Achievements</span>
          </h3>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Financial health milestones to build healthy money discipline throughout college.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {milestones.map((ms) => {
            const isUnlocked = savingsData.totalAccumulatedSavings >= ms.target;
            const progress = Math.min(100, Math.round((savingsData.totalAccumulatedSavings / ms.target) * 100));

            return (
              <div
                key={ms.target}
                onClick={() => handleMilestoneClick(ms.target)}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: isUnlocked ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                  background: isUnlocked ? '#ecfdf5' : 'var(--bg-card-subtle)',
                  cursor: isUnlocked ? 'pointer' : 'default',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isUnlocked ? 'var(--savings-primary)' : 'var(--text-muted)' }}>
                    TARGET: INR {ms.target}
                  </span>
                  {isUnlocked ? (
                    <span className="badge badge-savings" style={{ fontSize: '0.72rem' }}>
                      Unlocked
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {progress}%
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {ms.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {ms.desc}
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: isUnlocked ? '#10b981' : 'var(--primary)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
