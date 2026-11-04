import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  Clock,
  Globe,
  Send,
  Play,
  LogOut,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Bell,
  Check,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { storageService } from '../services/storage';
import { settingsService } from '../services/settingsService';

export default function Settings() {
  const { user, logout } = useAuth();

  // Migration State
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Email Notification Preferences State
  const [emailSettings, setEmailSettings] = useState({
    dailyEmailEnabled: true,
    deliveryHour: 22,
    timeZone: 'Asia/Kolkata',
    notificationEmail: user?.email || 'tanishkasahu191@gmail.com',
  });
  const [emailLogs, setEmailLogs] = useState([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState(null);

  // Email Test Actions State
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isTriggeringScheduler, setIsTriggeringScheduler] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Load settings on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await settingsService.getSettings();
        if (mounted && data.settings) {
          setEmailSettings(data.settings);
          if (data.logs) {
            setEmailLogs(data.logs);
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      } finally {
        if (mounted) setIsLoadingSettings(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Handle Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatus(null);
    try {
      await settingsService.updateSettings(emailSettings);
      setSettingsStatus({
        type: 'success',
        message: 'Daily email summary preferences saved successfully.',
      });
    } catch (err) {
      setSettingsStatus({
        type: 'danger',
        message: err.message || 'Failed to update email preferences.',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    setActionMessage(null);
    try {
      const res = await settingsService.sendTestEmail();
      setActionMessage({
        type: 'success',
        message: res.message || 'Test email dispatched successfully.',
      });
      // Refresh logs
      const updated = await settingsService.getSettings();
      if (updated.logs) setEmailLogs(updated.logs);
    } catch (err) {
      setActionMessage({
        type: 'danger',
        message: err.message || 'Failed to dispatch test email.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle Manual Trigger of Scheduler
  const handleTriggerScheduler = async () => {
    setIsTriggeringScheduler(true);
    setActionMessage(null);
    try {
      const res = await settingsService.triggerDailyScheduler();
      setActionMessage({
        type: 'success',
        message: res.message || 'Daily scheduler job executed successfully.',
      });
      // Refresh logs
      const updated = await settingsService.getSettings();
      if (updated.logs) setEmailLogs(updated.logs);
    } catch (err) {
      setActionMessage({
        type: 'danger',
        message: err.message || 'Failed to trigger scheduler.',
      });
    } finally {
      setIsTriggeringScheduler(false);
    }
  };

  // Handle Cloud DB Migration
  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    try {
      const result = await storageService.migrateLocalStorageToBackend();
      if (result.migrated) {
        setMigrationStatus({
          type: 'success',
          message: 'All local budget records and transactions migrated to PostgreSQL backend successfully.',
        });
      } else {
        setMigrationStatus({
          type: 'info',
          message: result.message || 'No offline records found to migrate.',
        });
      }
    } catch (err) {
      setMigrationStatus({
        type: 'danger',
        message: err.message || 'Backend migration could not be completed.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
          Settings & Account
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Manage your student profile, daily email reports, and backend database preferences.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* TOP ROW: Profile & Backend Sync */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Student Profile Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Student Profile</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={18} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Name</div>
                  <div style={{ fontWeight: 600 }}>{user?.fullName || 'Student'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={18} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</div>
                  <div style={{ fontWeight: 600 }}>{user?.email || 'Not provided'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={18} color="var(--text-muted)" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile Number</div>
                  <div style={{ fontWeight: 600 }}>{user?.phone || 'Not provided'}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
              >
                <LogOut size={16} />
                <span>Sign Out of PiggyPocket</span>
              </button>
            </div>
          </div>

          {/* Backend & Cloud Database Sync Card */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} color="var(--primary)" />
              <span>Backend Database & Sync</span>
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              PiggyPocket runs on a Node.js + Express backend with PostgreSQL, bcrypt security, and an automated background scheduler. You can migrate local storage data to the database anytime.
            </p>

            {migrationStatus && (
              <div className={`alert-box alert-${migrationStatus.type}`}>
                {migrationStatus.type === 'success' ? (
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{migrationStatus.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleMigrate}
              disabled={isMigrating}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              <RefreshCw size={16} className={isMigrating ? 'spin' : ''} />
              <span>{isMigrating ? 'Migrating Data...' : 'Migrate Local Data to Cloud DB'}</span>
            </button>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><strong>Backend API:</strong> Express (Port 5000)</div>
              <div><strong>Email Provider:</strong> Resend API with local development fallback</div>
              <div><strong>Scheduler:</strong> node-cron (Checks hourly at minute 0)</div>
            </div>
          </div>

        </div>

        {/* DAILY EMAIL SUMMARIES SETTINGS CARD */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Bell size={20} color="var(--primary)" />
              <span>Daily Email Summaries</span>
            </h3>
            <span className="badge badge-info" style={{ fontSize: '0.78rem' }}>
              Background Scheduler
            </span>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            Receive an automated email summary every night with your daily limit, actual spending, reserve wallet balance, and projected monthly savings even when the application is closed.
          </p>

          {settingsStatus && (
            <div className={`alert-box alert-${settingsStatus.type}`} style={{ marginBottom: '16px' }}>
              {settingsStatus.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
              )}
              <span>{settingsStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              
              {/* Toggle Daily Email */}
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label htmlFor="dailyEmailEnabled" style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Enable Daily Summaries
                  </label>
                  <input
                    id="dailyEmailEnabled"
                    type="checkbox"
                    checked={emailSettings.dailyEmailEnabled}
                    onChange={(e) => setEmailSettings((prev) => ({ ...prev, dailyEmailEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {emailSettings.dailyEmailEnabled ? 'Active: You will receive daily financial updates.' : 'Paused: No daily summaries will be sent.'}
                </div>
              </div>

              {/* Delivery Hour Selection */}
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label htmlFor="deliveryHour" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.92rem', marginBottom: '8px' }}>
                  <Clock size={16} color="var(--primary)" />
                  <span>Delivery Time</span>
                </label>
                <select
                  id="deliveryHour"
                  value={emailSettings.deliveryHour}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, deliveryHour: Number(e.target.value) }))}
                  className="input-field"
                  style={{ width: '100%', height: '40px', padding: '0 12px' }}
                >
                  <option value={20}>8:00 PM (20:00)</option>
                  <option value={21}>9:00 PM (21:00)</option>
                  <option value={22}>10:00 PM (22:00) - Default</option>
                  <option value={23}>11:00 PM (23:00)</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Scheduled in your localized timezone.
                </div>
              </div>

              {/* Time Zone Selection */}
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label htmlFor="timeZone" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.92rem', marginBottom: '8px' }}>
                  <Globe size={16} color="var(--primary)" />
                  <span>Time Zone</span>
                </label>
                <select
                  id="timeZone"
                  value={emailSettings.timeZone}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, timeZone: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', height: '40px', padding: '0 12px' }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+05:30) - Default</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST, UTC+04:00)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+08:00)</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Scheduler matches this timezone for delivery.
                </div>
              </div>

              {/* Notification Email Address */}
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label htmlFor="notificationEmail" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.92rem', marginBottom: '8px' }}>
                  <Mail size={16} color="var(--primary)" />
                  <span>Verified Email Address</span>
                </label>
                <input
                  id="notificationEmail"
                  type="email"
                  value={emailSettings.notificationEmail}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, notificationEmail: e.target.value }))}
                  placeholder="name@example.com"
                  className="input-field"
                  style={{ width: '100%', height: '40px', padding: '0 12px' }}
                />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Summaries will be dispatched to this inbox.
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="btn btn-primary"
              >
                <Check size={16} />
                <span>{isSavingSettings ? 'Saving...' : 'Save Email Preferences'}</span>
              </button>
            </div>
          </form>

          {/* TESTING & TRIGGER ACTIONS */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '8px' }}>
              Testing & Manual Trigger Controls
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Use these tools to verify HTML template rendering and test the background scheduler without waiting until delivery time.
            </p>

            {actionMessage && (
              <div className={`alert-box alert-${actionMessage.type}`} style={{ marginBottom: '16px' }}>
                {actionMessage.type === 'success' ? (
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                )}
                <span>{actionMessage.message}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={isSendingTest}
                className="btn btn-secondary"
              >
                <Send size={16} />
                <span>{isSendingTest ? 'Dispatching...' : 'Send Test Email'}</span>
              </button>

              <button
                type="button"
                onClick={handleTriggerScheduler}
                disabled={isTriggeringScheduler}
                className="btn btn-secondary"
              >
                <Play size={16} />
                <span>{isTriggeringScheduler ? 'Running Scheduler...' : 'Trigger Daily Scheduler Now'}</span>
              </button>
            </div>
          </div>

          {/* RECENT EMAIL LOGS */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '12px' }}>
              Recent Email Delivery Logs
            </h4>
            {emailLogs.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No email logs recorded yet. Click "Send Test Email" to test dispatch.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 12px' }}>Type</th>
                      <th style={{ padding: '8px 12px' }}>Recipient</th>
                      <th style={{ padding: '8px 12px' }}>Date</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Retries</th>
                      <th style={{ padding: '8px 12px' }}>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                          {log.email_type || 'daily_summary'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {log.recipient_email}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {log.date_sent}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            className={`badge ${log.status === 'sent' ? 'badge-success' : 'badge-danger'}`}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {log.retry_count ?? 0}
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                          {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
