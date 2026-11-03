import React, { useState } from 'react';
import { User, Phone, Mail, Shield, LogOut, Database, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { storageService } from '../services/storage';

export default function Settings() {
  const { user, logout } = useAuth();
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

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
          Manage your student profile, database synchronization, and application preferences.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Profile Card */}
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
            PiggyPocket connects to a Node.js + Express + PostgreSQL backend with real OTP and row-level tenant security. You can migrate your existing offline data to the cloud database anytime.
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
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            <RefreshCw size={16} className={isMigrating ? 'spin' : ''} />
            <span>{isMigrating ? 'Migrating Data...' : 'Migrate Local Data to Cloud DB'}</span>
          </button>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <div><strong>Backend API:</strong> Express on port 5000</div>
            <div><strong>Database:</strong> PostgreSQL with migrations</div>
            <div><strong>OTP Engine:</strong> Resend & Twilio with dev console fallback</div>
          </div>
        </div>
      </div>
    </div>
  );
}
