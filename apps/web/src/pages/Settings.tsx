import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { Button, Card, Input, Skeleton } from '../components/ui/index.js';
import { useToast } from '../components/ui/Toast.js';

interface SettingsData {
  profile: {
    name: string;
    email: string;
    phone: string | null;
    timezone: string;
    pendingEmail: string | null;
  };
  currentBudget: {
    id: string;
    monthKey: string;
    pocketMoneyPaise: number;
    receivedOn: string;
    savingsGoalPaise: number;
    spendingBudgetPaise: number;
    ruleVersion: number;
  } | null;
  dailyLimit: {
    id: string;
    effectiveFrom: string;
    limitPaise: number;
    mode: string;
  } | null;
  notificationPrefs: {
    email_enabled: boolean;
    send_time_local: string;
    timezone: string;
  };
  categoryRules: Array<{
    id: string;
    keyword: string;
    category: string;
    created_at: string;
  }>;
  auditLogs: Array<{
    id: string;
    old_pocket_money_paise: number;
    new_pocket_money_paise: number;
    old_savings_goal_paise: number;
    new_savings_goal_paise: number;
    reason: string | null;
    created_at: string;
  }>;
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { addToast } = useToast();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Timezone state
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [savingTimezone, setSavingTimezone] = useState(false);

  // Email Change state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Budget Edit state
  const [pocketMoneyRupees, setPocketMoneyRupees] = useState('');
  const [savingsGoalRupees, setSavingsGoalRupees] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // Daily Limit state
  const [limitMode, setLimitMode] = useState<'auto' | 'custom'>('auto');
  const [customLimitRupees, setCustomLimitRupees] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);

  // Category Rules state
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('Food');
  const [addingRule, setAddingRule] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await apiRequest<SettingsData>('/api/settings');
      setSettings(data);
      setName(data.profile.name);
      setPhone(data.profile.phone || '');
      setTimezone(data.profile.timezone || 'Asia/Kolkata');

      if (data.currentBudget) {
        setPocketMoneyRupees(String(data.currentBudget.pocketMoneyPaise / 100));
        setSavingsGoalRupees(String(data.currentBudget.savingsGoalPaise / 100));
      }

      if (data.dailyLimit) {
        setLimitMode((data.dailyLimit.mode as 'auto' | 'custom') || 'auto');
        setCustomLimitRupees(String(data.dailyLimit.limitPaise / 100));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      addToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const formatRupees = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  // 1. Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone })
      });
      addToast('Profile updated successfully', 'success');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // 2. Timezone Save
  const handleSaveTimezone = async (newTz: string) => {
    setTimezone(newTz);
    setSavingTimezone(true);
    try {
      await apiRequest('/api/settings/timezone', {
        method: 'PATCH',
        body: JSON.stringify({ timezone: newTz })
      });
      addToast(`Timezone updated to ${newTz}`, 'success');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update timezone', 'error');
    } finally {
      setSavingTimezone(false);
    }
  };

  // 3. Email Change (Step 1: Request OTP)
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setEmailLoading(true);
    try {
      await apiRequest('/api/settings/email/request-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail })
      });
      setOtpSent(true);
      addToast(`Verification code sent to ${newEmail}`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to request email change', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // 3. Email Change (Step 2: Verify OTP)
  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) return;
    setEmailLoading(true);
    try {
      await apiRequest('/api/settings/email/verify-change', {
        method: 'POST',
        body: JSON.stringify({ newEmail, code: otpCode })
      });
      addToast('Email successfully changed! Summaries will use this address.', 'success');
      setShowEmailModal(false);
      setOtpSent(false);
      setNewEmail('');
      setOtpCode('');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Invalid verification code', 'error');
    } finally {
      setEmailLoading(false);
    }
  };

  // 4. Budget Modification (Recalculates live with audit log)
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const pm = Math.round(Number(pocketMoneyRupees) * 100);
    const sg = Math.round(Number(savingsGoalRupees) * 100);

    if (sg > pm) {
      addToast('Savings goal cannot exceed pocket money', 'error');
      return;
    }

    setSavingBudget(true);
    try {
      await apiRequest('/api/settings/budget-period', {
        method: 'PATCH',
        body: JSON.stringify({
          pocketMoneyPaise: pm,
          savingsGoalPaise: sg,
          reason: editReason || 'Updated via Settings'
        })
      });
      addToast('Budget updated! All transactions preserved and recalculated live.', 'success');
      setEditReason('');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update budget', 'error');
    } finally {
      setSavingBudget(false);
    }
  };

  // 5. Daily Limit Setting (Effective from today forward)
  const handleSaveDailyLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLimit(true);
    try {
      await apiRequest('/api/settings/daily-limit', {
        method: 'PATCH',
        body: JSON.stringify({
          mode: limitMode,
          customLimitPaise:
            limitMode === 'custom' ? Math.round(Number(customLimitRupees) * 100) : undefined
        })
      });
      addToast('Daily limit preference updated for today forward (past days preserved)!', 'success');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to update daily limit', 'error');
    } finally {
      setSavingLimit(false);
    }
  };

  // 6. Category Rules
  const handleAddCategoryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setAddingRule(true);
    try {
      await apiRequest('/api/settings/category-rules', {
        method: 'POST',
        body: JSON.stringify({ keyword: newKeyword, category: newCategory })
      });
      addToast(`Rule added: "${newKeyword}" → ${newCategory}`, 'success');
      setNewKeyword('');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to add rule', 'error');
    } finally {
      setAddingRule(false);
    }
  };

  const handleDeleteCategoryRule = async (id: string) => {
    try {
      await apiRequest(`/api/settings/category-rules/${id}`, { method: 'DELETE' });
      addToast('Category rule deleted', 'success');
      fetchSettings();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Failed to delete rule', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
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
          maxWidth: '460px',
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
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#f8fafc' }}>
            Settings ⚙️
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/monthly-report')}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          >
            📊 Reports
          </Button>
        </header>

        {loading ? (
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <Skeleton height="2rem" width="60%" />
              <Skeleton height="3rem" width="100%" />
              <Skeleton height="3rem" width="100%" />
            </div>
          </Card>
        ) : settings ? (
          <>
            {/* 1. Profile Section */}
            <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                  👤 Profile & Contact
                </div>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <Input
                  id="profile-name"
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  id="profile-phone"
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
                <Button type="submit" variant="primary" disabled={savingProfile} style={{ alignSelf: 'flex-start' }}>
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </Card>

            {/* 2. Registered Email Section (OTP required on change) */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                    ✉️ Registered Email
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, marginTop: '0.2rem' }}>
                    {settings.profile.email}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowEmailModal(true);
                    setOtpSent(false);
                  }}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                >
                  Change Email
                </Button>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Changing your registered email requires OTP verification of the new email address before it receives daily summaries.
              </div>
            </Card>

            {/* 3. Current Month Budget Editor (Live recalculation with audit row) */}
            {settings.currentBudget && (
              <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      💰 Month Budget ({settings.currentBudget.monthKey})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                      Recalculates Live
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Editing preserves all transactions and records a permanent audit entry.
                  </p>
                </div>

                <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <Input
                      id="edit-pocket-money"
                      type="number"
                      min="1"
                      step="10"
                      label="Pocket Money (₹)"
                      value={pocketMoneyRupees}
                      onChange={(e) => setPocketMoneyRupees(e.target.value)}
                      required
                    />
                    <Input
                      id="edit-savings-goal"
                      type="number"
                      min="0"
                      step="10"
                      label="Savings Goal (₹)"
                      value={savingsGoalRupees}
                      onChange={(e) => setSavingsGoalRupees(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    id="edit-reason"
                    label="Reason for Change (Audit Trail)"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Received extra festival allowance"
                  />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1e293b',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: '#94a3b8' }}>New Spending Budget:</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                      ₹{Math.max(0, Number(pocketMoneyRupees || '0') - Number(savingsGoalRupees || '0')).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <Button type="submit" variant="primary" disabled={savingBudget} style={{ alignSelf: 'flex-start' }}>
                    {savingBudget ? 'Recalculating...' : 'Update & Recalculate'}
                  </Button>
                </form>
              </Card>
            )}

            {/* 4. Daily Spending Limit Preference */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  ⚡ Daily Spending Limit
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  A changed limit creates a new effective-dated entry from today forward and never rewrites past days.
                </div>
              </div>

              <form onSubmit={handleSaveDailyLimit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setLimitMode('auto')}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: `1px solid ${limitMode === 'auto' ? '#10b981' : '#334155'}`,
                      backgroundColor: limitMode === 'auto' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                      color: limitMode === 'auto' ? '#10b981' : '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Auto Calculate
                  </button>
                  <button
                    type="button"
                    onClick={() => setLimitMode('custom')}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: `1px solid ${limitMode === 'custom' ? '#10b981' : '#334155'}`,
                      backgroundColor: limitMode === 'custom' ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                      color: limitMode === 'custom' ? '#10b981' : '#cbd5e1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Custom Limit
                  </button>
                </div>

                {limitMode === 'custom' && (
                  <Input
                    id="settings-custom-limit"
                    type="number"
                    min="1"
                    label="Custom Daily Limit (₹/day)"
                    value={customLimitRupees}
                    onChange={(e) => setCustomLimitRupees(e.target.value)}
                    required
                  />
                )}

                <Button type="submit" variant="secondary" disabled={savingLimit} style={{ alignSelf: 'flex-start' }}>
                  {savingLimit ? 'Updating...' : 'Save Limit Preference'}
                </Button>
              </form>
            </Card>

            {/* 5. Timezone Selection */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                🌐 Timezone
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Controls your daily summary local time and local calendar month calculation.
              </div>
              <select
                value={timezone}
                onChange={(e) => handleSaveTimezone(e.target.value)}
                disabled={savingTimezone}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+08:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST, UTC+04:00)</option>
              </select>
            </Card>

            {/* 6. Link to Notification Preferences */}
            <Card
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(30, 41, 59, 0.6)'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                  🔔 Daily Notification Preferences
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                  Shortcuts for 8, 9, 10, 11 PM and test emails.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/notification-preferences')}
              >
                Configure →
              </Button>
            </Card>

            {/* 7. Category Preferences (Keyword -> Category Rules) */}
            <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  🏷️ Category Rules (Auto Categorization)
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                  Expenses matching your keyword are automatically tagged with your preferred category.
                </p>
              </div>

              <form onSubmit={handleAddCategoryRule} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Keyword (e.g. swiggy)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                  required
                />
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Books">Books</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Groceries">Groceries</option>
                </select>
                <Button type="submit" variant="secondary" size="sm" disabled={addingRule}>
                  Add
                </Button>
              </form>

              {settings.categoryRules.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No keyword rules yet. Example: "zomato" → Food.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {settings.categoryRules.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#1e293b',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <span>
                        <strong style={{ color: '#10b981' }}>"{r.keyword}"</strong> → {r.category}
                      </span>
                      <button
                        onClick={() => handleDeleteCategoryRule(r.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                        title="Delete rule"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* 8. Notification-Access Instructions (Informational) */}
            <Card
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                borderLeft: '4px solid #38bdf8',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                ℹ️ Email & Notification Delivery Guide
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                <li>Make sure to check your Spam or Promotions folder if daily summaries do not appear in Primary.</li>
                <li>Add our sender address to your trusted contacts or whitelist to guarantee timely delivery.</li>
                <li>When the Capacitor mobile app launches, push notifications will mirror your daily summary settings.</li>
              </ul>
            </Card>

            {/* 9. Audit History Accordion */}
            {settings.auditLogs.length > 0 && (
              <Card style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                  📜 Budget Audit Log ({settings.auditLogs.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {settings.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#1e293b',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        color: '#cbd5e1'
                      }}
                    >
                      <div>
                        Pocket: {formatRupees(log.old_pocket_money_paise)} →{' '}
                        <strong style={{ color: '#10b981' }}>{formatRupees(log.new_pocket_money_paise)}</strong> | Goal:{' '}
                        {formatRupees(log.old_savings_goal_paise)} →{' '}
                        <strong style={{ color: '#38bdf8' }}>{formatRupees(log.new_savings_goal_paise)}</strong>
                      </div>
                      <div style={{ color: '#94a3b8', marginTop: '0.15rem' }}>
                        {log.reason || 'Settings update'} · {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 10. Logout Button */}
            <Button
              variant="outline"
              onClick={handleLogout}
              style={{
                width: '100%',
                borderColor: '#ef4444',
                color: '#f87171',
                fontWeight: 700,
                padding: '0.75rem'
              }}
            >
              Log Out of PiggyPocket
            </Button>
          </>
        ) : null}

        {/* Change Email Modal with OTP */}
        {showEmailModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-email-title"
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
              <h3 id="change-email-title" style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>
                Change Registered Email
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                We will send a 6-digit OTP to verify your new email before updating it.
              </p>

              {!otpSent ? (
                <form onSubmit={handleRequestEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Input
                    id="new-email-input"
                    type="email"
                    label="New Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="student@example.com"
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)} style={{ flex: 1 }}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={emailLoading} style={{ flex: 2 }}>
                      {emailLoading ? 'Sending code...' : 'Send OTP →'}
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: '#10b981' }}>
                    OTP sent to <strong>{newEmail}</strong>
                  </div>
                  <Input
                    id="new-email-otp"
                    type="text"
                    maxLength={6}
                    label="Enter 6-Digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                    placeholder="123456"
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button type="button" variant="outline" onClick={() => setOtpSent(false)} style={{ flex: 1 }}>
                      Back
                    </Button>
                    <Button type="submit" variant="primary" disabled={emailLoading} style={{ flex: 2 }}>
                      {emailLoading ? 'Verifying...' : 'Verify & Update'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
