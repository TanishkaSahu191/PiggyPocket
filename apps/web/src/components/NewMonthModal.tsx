import React, { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { Button, Input } from './ui/index.js';
import { useToast } from './ui/Toast.js';

interface PrefillData {
  pocketMoneyPaise: number;
  savingsGoalPaise: number;
  receivedDay: number;
  dailyLimitMode: string;
  customDailyLimitPaise?: number;
  emailTimeLocal?: string;
}

interface NewMonthModalProps {
  monthKey: string;
  prefill?: PrefillData;
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
}

export const NewMonthModal: React.FC<NewMonthModalProps> = ({
  monthKey,
  prefill,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addToast } = useToast();
  const [pocketMoneyRupees, setPocketMoneyRupees] = useState<string>(
    prefill?.pocketMoneyPaise ? String(prefill.pocketMoneyPaise / 100) : '5000'
  );
  const [savingsGoalRupees, setSavingsGoalRupees] = useState<string>(
    prefill?.savingsGoalPaise ? String(prefill.savingsGoalPaise / 100) : '1000'
  );
  const [receivedDay, setReceivedDay] = useState<number>(prefill?.receivedDay || 1);
  const [dailyLimitMode, setDailyLimitMode] = useState<'auto' | 'custom'>(
    (prefill?.dailyLimitMode as 'auto' | 'custom') || 'auto'
  );
  const [customLimitRupees, setCustomLimitRupees] = useState<string>(
    prefill?.customDailyLimitPaise ? String(prefill.customDailyLimitPaise / 100) : '150'
  );
  const [emailTime, setEmailTime] = useState<string>(prefill?.emailTimeLocal || '22:00');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const pocketMoneyPaise = Math.round(Number(pocketMoneyRupees || '0') * 100);
  const savingsGoalPaise = Math.round(Number(savingsGoalRupees || '0') * 100);
  const spendingBudgetPaise = Math.max(0, pocketMoneyPaise - savingsGoalPaise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (savingsGoalPaise > pocketMoneyPaise) {
      setError('Savings goal cannot be greater than pocket money.');
      return;
    }

    const dayStr = String(receivedDay).padStart(2, '0');
    const receivedOn = `${monthKey}-${dayStr}`;

    setSubmitting(true);
    try {
      await apiRequest('/api/budget/new-month', {
        method: 'POST',
        body: JSON.stringify({
          monthKey,
          pocketMoneyPaise,
          receivedOn,
          savingsGoalPaise,
          dailyLimitMode,
          customDailyLimitPaise:
            dailyLimitMode === 'custom' ? Math.round(Number(customLimitRupees || '0') * 100) : undefined,
          emailTimeLocal: emailTime
        })
      });

      addToast(`🎉 Fresh budget setup complete for ${monthKey}!`, 'success');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to set up new month';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-month-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 9999,
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#0f172a',
          borderRadius: 'var(--radius-lg, 16px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          padding: '1.75rem',
          color: '#f8fafc'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>🗓️ New Month Setup</span>
            </div>
            <h2 id="new-month-title" style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 800 }}>
              Start Fresh for {monthKey}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0.25rem'
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Informational clean-slate banner */}
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            fontSize: '0.825rem',
            color: '#cbd5e1',
            lineHeight: 1.45,
            marginBottom: '1.25rem'
          }}
        >
          <strong style={{ color: '#10b981' }}>🌱 Clean Slate Guarantee:</strong> Previous month overspending, shortfalls, and reservoir balances <strong>never carry over</strong>. Your historical data remains safe and browsable.
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '0.65rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            id="pocket-money"
            type="number"
            min="0"
            step="10"
            label="Monthly Pocket Money (₹)"
            value={pocketMoneyRupees}
            onChange={(e) => setPocketMoneyRupees(e.target.value)}
            helperText="Total funds available for this month"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Input
              id="savings-goal"
              type="number"
              min="0"
              step="10"
              label="Savings Goal (₹)"
              value={savingsGoalRupees}
              onChange={(e) => setSavingsGoalRupees(e.target.value)}
              helperText="Protected savings target"
              required
            />
            <div>
              <label
                htmlFor="received-day"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}
              >
                Date Received
              </label>
              <select
                id="received-day"
                value={receivedDay}
                onChange={(e) => setReceivedDay(Number(e.target.value))}
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
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {day}
                    {day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Spending Budget Preview */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Effective Spending Budget:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>
              ₹{(spendingBudgetPaise / 100).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Daily Limit Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}>
              Daily Spending Limit Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDailyLimitMode('auto')}
                style={{
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${dailyLimitMode === 'auto' ? '#10b981' : '#334155'}`,
                  backgroundColor: dailyLimitMode === 'auto' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                  color: dailyLimitMode === 'auto' ? '#10b981' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ⚡ Auto Distributed
              </button>
              <button
                type="button"
                onClick={() => setDailyLimitMode('custom')}
                style={{
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: `1px solid ${dailyLimitMode === 'custom' ? '#10b981' : '#334155'}`,
                  backgroundColor: dailyLimitMode === 'custom' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                  color: dailyLimitMode === 'custom' ? '#10b981' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                ✏️ Custom Limit
              </button>
            </div>
          </div>

          {dailyLimitMode === 'custom' && (
            <Input
              id="custom-limit"
              type="number"
              min="1"
              label="Custom Daily Limit (₹/day)"
              value={customLimitRupees}
              onChange={(e) => setCustomLimitRupees(e.target.value)}
              required
            />
          )}

          <div>
            <label
              htmlFor="email-time"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem' }}
            >
              Daily Summary Email Time (optional)
            </label>
            <input
              id="email-time"
              type="time"
              value={emailTime}
              onChange={(e) => setEmailTime(e.target.value)}
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

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose} style={{ flex: 1 }}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              style={{ flex: 2, fontWeight: 700 }}
            >
              {submitting ? 'Setting up...' : `Activate Budget for ${monthKey} →`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
