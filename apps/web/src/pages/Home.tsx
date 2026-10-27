import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { Button, Card, EmptyState, Skeleton } from '../components/ui/index.js';
import { NewMonthModal } from '../components/NewMonthModal.js';

interface PeriodData {
  budgetPeriod: {
    id: string;
    monthKey: string;
    pocketMoneyPaise: number;
    receivedOn: string;
    savingsGoalPaise: number;
    spendingBudgetPaise: number;
    ruleVersion: number;
  } | null;
  dailyLimits: Array<{
    id: string;
    effective_from: string;
    limit_paise: number;
    mode: string;
  }>;
  notificationPrefs: {
    email_enabled: boolean;
    send_time_local: string;
  } | null;
}

export const HomePage: React.FC = () => {
  const { user, logout, currentBudget } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewMonthModal, setShowNewMonthModal] = useState(false);
  const [newMonthTarget, setNewMonthTarget] = useState('');
  const [newMonthPrefill, setNewMonthPrefill] = useState<any>(null);

  const loadPeriod = async () => {
    try {
      // 1. Check if the current month has an active period
      const checkRes = await apiRequest<{
        hasPeriod: boolean;
        monthKey: string;
        prefill?: any;
      }>('/api/budget/check-month');

      if (!checkRes.hasPeriod) {
        setNewMonthTarget(checkRes.monthKey);
        setNewMonthPrefill(checkRes.prefill);
        setShowNewMonthModal(true);
      }

      // 2. Load current period data
      const res = await apiRequest<PeriodData>('/api/onboarding/period');
      setData(res);
    } catch (err) {
      console.error('Failed to load period data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriod();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const formatRupees = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  const period = data?.budgetPeriod || currentBudget;
  const latestLimit = data?.dailyLimits?.[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.25rem 1rem 3rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        {/* Header with App Title & Logout Button */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🐷</span>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                PiggyPocket
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Smart Student Budget
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            Log Out
          </Button>
        </header>

        {/* User Greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0
            }}
          >
            Hello, {user?.name || 'Student'} 👋
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              margin: 0
            }}
          >
            Your monthly pocket money is configured and safe.
          </p>
        </div>

        {/* Current Budget Summary Card */}
        {loading ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
              <Skeleton height="1.5rem" width="60%" />
              <Skeleton height="3rem" width="100%" />
              <Skeleton height="1rem" width="80%" />
            </div>
          </Card>
        ) : period ? (
          <Card
            variant="glass"
            style={{
              background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-primary)',
                    fontWeight: 700
                  }}
                >
                  Current Period ({period.monthKey})
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Active Budget
                </div>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              >
                Rule v{period.ruleVersion} Reservoir
              </div>
            </div>

            {/* Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pocket Money</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {formatRupees(period.pocketMoneyPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Original Savings</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {formatRupees(period.savingsGoalPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Spending Budget</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                  {formatRupees(period.spendingBudgetPaise)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Daily Spending Limit</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>
                  {latestLimit ? formatRupees(latestLimit.limit_paise) : 'Calculated'}/day
                </div>
              </div>
            </div>

            {/* Notification preference footer */}
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                paddingTop: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📧</span>
                <span>
                  Daily summary:{' '}
                  <strong style={{ color: 'var(--color-text-secondary)' }}>
                    {data?.notificationPrefs?.send_time_local || '22:00'}
                  </strong>
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/notification-preferences')}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                Settings →
              </Button>
            </div>
          </Card>
        ) : null}

        {/* Action Grid for Monthly Report, Daily Summaries, Settings, Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/monthly-report')}
            style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem', fontWeight: 700 }}
          >
            📊 Monthly Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            style={{ fontSize: '0.85rem', padding: '0.75rem 0.5rem' }}
          >
            ⚙️ App Settings
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/daily-summary')}
            style={{ fontSize: '0.82rem', padding: '0.65rem 0.5rem' }}
          >
            📝 Daily History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/notification-preferences')}
            style={{ fontSize: '0.82rem', padding: '0.65rem 0.5rem' }}
          >
            🔔 Alert Settings
          </Button>
        </div>

        {/* Temporary Empty Dashboard Area (Phase 4 will build the full tracker) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: 0
            }}
          >
            Today's Expenses
          </h2>
          <EmptyState
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            }
            title="No Expenses Logged Yet"
            description="Phase 3 setup complete! In Phase 4, the full interactive daily expense logging, reservoir gauge, and overspending projections will be enabled here."
          />
        </div>

        {/* Footer info */}
        <footer
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            marginTop: 'auto',
            paddingTop: '1rem'
          }}
        >
          PiggyPocket · Safe, realistic student budgeting
        </footer>
      </div>

      {/* New Month Clean Setup Modal */}
      {showNewMonthModal && newMonthTarget && (
        <NewMonthModal
          isOpen={showNewMonthModal}
          monthKey={newMonthTarget}
          prefill={newMonthPrefill}
          onClose={() => setShowNewMonthModal(false)}
          onSuccess={() => {
            setShowNewMonthModal(false);
            loadPeriod();
          }}
        />
      )}
    </div>
  );
};
