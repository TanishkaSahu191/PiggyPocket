import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, Globe, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Card, useToast, Skeleton } from '../components/ui/index.js';
import { apiRequest } from '../api/client.js';

interface PrefsResponse {
  preferences: {
    email_enabled: boolean;
    send_time_local: string;
    timezone: string;
  };
  nextSummary: {
    nextSummaryDate: string;
    nextSummaryTime: string;
    isToday: boolean;
    formattedHuman: string;
  };
}

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC'
];

export const NotificationPreferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [sendTimeLocal, setSendTimeLocal] = useState('22:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [nextSummaryText, setNextSummaryText] = useState('');
  const [testResult, setTestResult] = useState<{ message: string; isReal: boolean } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiRequest<PrefsResponse>('/api/notifications/preferences');
        if (mounted) {
          setEmailEnabled(res.preferences.email_enabled);
          setSendTimeLocal(res.preferences.send_time_local);
          setTimezone(res.preferences.timezone);
          setNextSummaryText(res.nextSummary.formattedHuman);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load preferences', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiRequest<PrefsResponse>('/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          email_enabled: emailEnabled,
          send_time_local: sendTimeLocal,
          timezone
        })
      });
      setNextSummaryText(res.nextSummary.formattedHuman);
      showToast('Notification preferences updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiRequest<{
        success: boolean;
        recipient: string;
        provider: string;
        hasRealApiKey: boolean;
        message: string;
      }>('/api/notifications/test-email', { method: 'POST' });

      setTestResult({
        message: res.message,
        isReal: res.hasRealApiKey
      });
      showToast('Test email triggered successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.25rem 1rem 3rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/home')}>
          Back
        </Button>
        <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 700 }}>Notification Preferences</h1>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton height="3.5rem" width="100%" />
          <Skeleton height="4.5rem" width="100%" />
          <Skeleton height="6rem" width="100%" />
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Next Summary Preview Banner */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}
        >
          <Clock size={20} color="var(--color-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
              Your Next Summary
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {emailEnabled ? (nextSummaryText || 'Tonight at 10:00 PM') : 'Daily emails are currently disabled'}
            </div>
          </div>
        </div>

        {/* Master Toggle */}
        <Card variant="solid">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Bell size={20} color="var(--color-primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Daily Email Summary</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Receive a recap with your daily spend & reservoir balance
                </div>
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span
                style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: emailEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.2)',
                  borderRadius: '34px',
                  transition: '0.3s'
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: emailEnabled ? '25px' : '3px',
                    bottom: '3px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: '0.3s'
                  }}
                />
              </span>
            </label>
          </div>
        </Card>

        {/* Delivery Time Selection */}
        <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', opacity: emailEnabled ? 1 : 0.5 }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Delivery Time</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Choose when your daily report lands in your inbox.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {['20:00', '21:00', '22:00', '23:00'].map((time) => (
              <Button
                key={time}
                type="button"
                variant={sendTimeLocal === time ? 'primary' : 'secondary'}
                size="sm"
                disabled={!emailEnabled}
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
            disabled={!emailEnabled}
          />
        </Card>

        {/* Timezone Configuration */}
        <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Timezone</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Daily summaries are timed to your local clock, handling daylight saving transitions automatically.
          </p>

          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Card>

        {/* Save Preferences Button */}
        <Button type="submit" variant="primary" fullWidth isLoading={saving}>
          Save Preferences
        </Button>

        {/* Test Email Section */}
        <Card variant="outlined" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={18} color="var(--color-text-secondary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Email Verification & Diagnostic</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Send a sample daily summary with today's spending figures to verify your email delivery.
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={testing}
            icon={<Send size={14} />}
            onClick={handleSendTestEmail}
          >
            Send Test Email
          </Button>

          {testResult && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: testResult.isReal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${testResult.isReal ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                fontSize: '0.8rem',
                color: testResult.isReal ? '#34d399' : '#fbbf24',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem'
              }}
            >
              {testResult.isReal ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </Card>
      </form>
      )}
    </div>
  );
};
