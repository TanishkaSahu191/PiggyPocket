import React from 'react';
import { User, Phone, Mail, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Settings & Account
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your student profile and application preferences.
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
                <div style={{ fontWeight: 600 }}>{user?.fullName || 'Not provided'}</div>
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

        {/* Phase Info Card */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>App Information</h3>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p><strong>App:</strong> PiggyPocket - Smart Budget Tracker</p>
            <p><strong>Current Phase:</strong> Phase 1 (Foundation)</p>
            <p><strong>Auth Mode:</strong> Temporary Mock Auth (LocalStorage)</p>
            <p><strong>Target Users:</strong> College Students</p>
          </div>
        </div>
      </div>
    </div>
  );
}

