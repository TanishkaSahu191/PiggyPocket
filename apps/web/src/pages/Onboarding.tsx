import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  PiggyBank,
  Calculator,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button, Input, Card, ProgressBar, useToast } from '../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../api/client.js';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser, hasActiveBudget } = useAuth();
  const { showToast } = useToast();

  // Redirect if returning user already has a budget
  useEffect(() => {
    if (hasActiveBudget) {
      navigate('/home', { replace: true });
    }
  }, [hasActiveBudget, navigate]);

  const [step, setStep] = useState(1);

  // Today in YYYY-MM-DD
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: user?.timezone || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  // Form State
  const [pocketMoneyRupees, setPocketMoneyRupees] = useState('5000');
  const [receivedOn, setReceivedOn] = useState(todayStr);
  const [savingsGoalRupees, setSavingsGoalRupees] = useState('1000');
  const [dailyLimitMode, setDailyLimitMode] = useState<'auto' | 'custom'>('auto');
  const [customDailyLimitRupees, setCustomDailyLimitRupees] = useState('100');
  const [sendTimeLocal, setSendTimeLocal] = useState('22:00');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  // Preview Data from API / Engine
  const [previewData, setPreviewData] = useState<{
    spendingBudgetPaise: number;
    periodDays: number;
    baseAutoDailyLimitPaise: number;
    effectiveDailyLimitPaise: number;
    unallocatedBudgetPaise: number;
    limitsExceedSpendingBudget: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  // Fetch live preview calculation whenever values change
  const fetchPreview = async () => {
    const pocketPaise = Math.round(Number(pocketMoneyRupees || 0) * 100);
    const savingsPaise = Math.round(Number(savingsGoalRupees || 0) * 100);
    const customPaise = Math.round(Number(customDailyLimitRupees || 0) * 100);

    if (savingsPaise > pocketPaise) {
      setPreviewError('Savings goal cannot exceed your total monthly pocket money.');
      setPreviewData(null);
      return;
    }

    setPreviewError('');
    try {
      const res = await apiRequest<any>('/api/onboarding/preview', {
        method: 'POST',
        body: JSON.stringify({
          pocketMoneyPaise: pocketPaise,
          receivedOn,
          savingsGoalPaise: savingsPaise,
          dailyLimitMode,
          customDailyLimitPaise: dailyLimitMode === 'custom' ? customPaise : undefined
        })
      });
      setPreviewData(res);
    } catch (err: any) {
      setPreviewError(err.message || 'Validation error');
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [pocketMoneyRupees, receivedOn, savingsGoalRupees, dailyLimitMode, customDailyLimitRupees]);

  const handleFinishSetup = async () => {
    setLoading(true);
    try {
      const pocketPaise = Math.round(Number(pocketMoneyRupees) * 100);
      const savingsPaise = Math.round(Number(savingsGoalRupees) * 100);
      const customPaise = Math.round(Number(customDailyLimitRupees) * 100);

      await apiRequest('/api/onboarding/complete', {
        method: 'POST',
        body: JSON.stringify({
          pocketMoneyPaise: pocketPaise,
          receivedOn,
          savingsGoalPaise: savingsPaise,
          dailyLimitMode,
          customDailyLimitPaise: dailyLimitMode === 'custom' ? customPaise : undefined,
          sendTimeLocal,
          emailNotificationsEnabled
        })
      });

      showToast('Budget period successfully configured!', 'success');
      await refreshUser();
      navigate('/home', { replace: true });
    } catch (err: any) {
      showToast(err.message || 'Failed to complete onboarding.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const detectedTz = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.5rem', justifyContent: 'space-between' }}>
      <div>
        {/* Step Progress Bar */}
        <header style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
              STEP {step} OF 5
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Guided Monthly Setup
            </span>
          </div>
          <ProgressBar progress={(step / 5) * 100} height={6} />
        </header>

        {/* ================= STEP 1: POCKET MONEY ================= */}
        {step === 1 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Wallet size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Monthly Pocket Money</h1>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              How much pocket money or monthly income do you have, and when did you receive it?
            </p>

            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Pocket Money (in ₹)"
                type="number"
                min="0"
                step="1"
                placeholder="5000"
                value={pocketMoneyRupees}
                onChange={(e) => setPocketMoneyRupees(e.target.value)}
                leftIcon={<span>₹</span>}
                helperText="Integer rupees. Stored securely as exact paise."
                required
              />

              <Input
                label="Date Received"
                type="date"
                value={receivedOn}
                onChange={(e) => setReceivedOn(e.target.value)}
                helperText="Spending period runs from this date to month-end."
                required
              />
            </Card>
          </section>
        )}

        {/* ================= STEP 2: SAVINGS GOAL ================= */}
        {step === 2 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                <PiggyBank size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Monthly Savings Goal</h1>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              How much would you like to save this month? Your spending budget will be your pocket money minus this goal.
            </p>

            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input
                label="Original Savings Goal (in ₹)"
                type="number"
                min="0"
                step="1"
                placeholder="1000"
                value={savingsGoalRupees}
                onChange={(e) => setSavingsGoalRupees(e.target.value)}
                leftIcon={<span>₹</span>}
                error={previewError || undefined}
                required
              />

              {previewData && !previewError && (
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Live Calculated Spending Budget:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>
                      ₹{(previewData.spendingBudgetPaise / 100).toLocaleString('en-IN')}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      (₹{pocketMoneyRupees} - ₹{savingsGoalRupees})
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* ================= STEP 3: DAILY LIMIT & RESERVOIR ================= */}
        {step === 3 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Calculator size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Daily Spending Limit</h1>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Choose how your daily allowance is set across the {previewData?.periodDays || 30} days in this month.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Option A: Auto */}
              <div
                onClick={() => setDailyLimitMode('auto')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${dailyLimitMode === 'auto' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: dailyLimitMode === 'auto' ? 'var(--color-surface-hover)' : 'var(--color-surface-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.95rem' }}>Automatically calculate daily limit</strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    ₹{previewData ? Math.floor(previewData.baseAutoDailyLimitPaise / 100) : 133}<small style={{ fontSize: '0.75rem' }}>/day</small>
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Formula: floor(Spending Budget ₹{(previewData?.spendingBudgetPaise || 400000) / 100} ÷ {previewData?.periodDays || 30} days). Remainder paise distributed on initial days.
                </span>
              </div>

              {/* Option B: Custom */}
              <div
                onClick={() => setDailyLimitMode('custom')}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${dailyLimitMode === 'custom' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: dailyLimitMode === 'custom' ? 'var(--color-surface-hover)' : 'var(--color-surface-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <strong style={{ fontSize: '0.95rem' }}>Let me set my own daily limit</strong>
                {dailyLimitMode === 'custom' && (
                  <Input
                    label="Custom Daily Limit (in ₹)"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={customDailyLimitRupees}
                    onChange={(e) => setCustomDailyLimitRupees(e.target.value)}
                    leftIcon={<span>₹</span>}
                  />
                )}
              </div>
            </div>

            {/* Unallocated Budget & Reservoir Explanation Card */}
            {previewData && (
              <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Unallocated Monthly Budget:</span>
                  <strong style={{ fontSize: '0.95rem', color: previewData.limitsExceedSpendingBudget ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                    ₹{(previewData.unallocatedBudgetPaise / 100).toLocaleString('en-IN')}
                  </strong>
                </div>

                {previewData.limitsExceedSpendingBudget && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)', fontSize: '0.75rem' }}>
                    <AlertTriangle size={16} />
                    <span>Warning: Daily limits exceed your spending budget for the period!</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                  <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    <strong>The Reservoir Rule:</strong> Unused daily allowance automatically banks into your reservoir to cover future overspending without cutting into your savings.
                  </span>
                </div>
              </Card>
            )}
          </section>
        )}

        {/* ================= STEP 4: NOTIFICATIONS ================= */}
        {step === 4 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <Bell size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Daily Summary Time</h1>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              What time would you like to receive your daily budget and reservoir summary email?
            </p>

            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                {['20:00', '21:00', '22:00', '23:00'].map((time) => (
                  <Button
                    key={time}
                    type="button"
                    variant={sendTimeLocal === time ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSendTimeLocal(time)}
                  >
                    {time === '20:00' ? '8 PM' : time === '21:00' ? '9 PM' : time === '22:00' ? '10 PM' : '11 PM'}
                  </Button>
                ))}
              </div>

              <Input
                label="Or Custom Time"
                type="time"
                value={sendTimeLocal}
                onChange={(e) => setSendTimeLocal(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Detected Timezone:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>{detectedTz}</span>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                />
                Receive daily spending reminder & summary
              </label>
            </Card>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSendTimeLocal('22:00');
                setStep(5);
              }}
            >
              Skip (Use default 10:00 PM)
            </Button>
          </section>
        )}

        {/* ================= STEP 5: CONFIRMATION ================= */}
        {step === 5 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <CheckCircle2 size={20} />
              </div>
              <h1 style={{ fontSize: '1.35rem', margin: 0 }}>Confirm Your Budget</h1>
            </div>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Review your monthly plan. You can adjust limits anytime from the settings.
            </p>

            <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Monthly Pocket Money</span>
                <strong>₹{Number(pocketMoneyRupees).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Original Savings Goal</span>
                <strong style={{ color: 'var(--color-primary)' }}>₹{Number(savingsGoalRupees).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Total Spending Budget</span>
                <strong>₹{((previewData?.spendingBudgetPaise || 0) / 100).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Daily Spending Allowance</span>
                <strong style={{ color: 'var(--color-accent)' }}>
                  ₹{previewData ? Math.floor(previewData.effectiveDailyLimitPaise / 100) : 133}/day
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Daily Notification Time</span>
                <span>{sendTimeLocal} ({detectedTz})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Engine Rule Version</span>
                <span style={{ color: 'var(--color-primary)' }}>v2 (Reservoir Protection)</span>
              </div>
            </Card>
          </section>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.5rem', paddingBottom: '1rem' }}>
        {step > 1 ? (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft size={16} />}>
            Back
          </Button>
        ) : <div />}

        {step < 5 ? (
          <Button
            variant="primary"
            disabled={!!previewError || (step === 1 && !pocketMoneyRupees)}
            onClick={() => setStep((s) => s + 1)}
            icon={<ArrowRight size={16} />}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            isLoading={loading}
            onClick={handleFinishSetup}
            icon={<CheckCircle2 size={18} />}
          >
            Confirm & Finish Setup
          </Button>
        )}
      </footer>
    </div>
  );
};
