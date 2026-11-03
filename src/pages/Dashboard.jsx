import React from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  Calendar,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'Student';

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          color: 'white',
          marginBottom: '28px',
          boxShadow: '0 8px 20px rgba(79, 70, 229, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}
          >
            Phase 1 • Foundation
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '4px' }}>
            Welcome, {firstName}
          </h2>
          <p style={{ opacity: 0.9, fontSize: '0.92rem' }}>
            Smart Budget Tracker is initialized. Financial logic & spending engines will connect in upcoming phases.
          </p>
        </div>

        <Link
          to="/setup"
          className="btn"
          style={{
            backgroundColor: 'white',
            color: 'var(--primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontWeight: 700
          }}
        >
          <span>Budget Setup</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Visual Contrast Demonstration: Reserve Wallet vs Projected Savings */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
          Core Concepts (Visual Separation Preview)
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {/* Card 1: Virtual Reserve Wallet (Blue Theme) */}
          <div
            className="card"
            style={{
              borderLeft: '5px solid var(--wallet-primary)',
              background: 'var(--wallet-bg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="var(--wallet-primary)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--wallet-primary)' }}>
                  Reserve Wallet
                </h4>
              </div>
              <span className="badge badge-wallet">Virtual Cushion</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Unused daily limits flow here automatically to absorb any future overspending before touching your savings.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--wallet-badge)', fontWeight: 600 }}>
              • Never goes negative • Auto-recalculated chronologically
            </div>
          </div>

          {/* Card 2: Adjusted Projected Savings (Green Theme) */}
          <div
            className="card"
            style={{
              borderLeft: '5px solid var(--savings-primary)',
              background: 'var(--savings-bg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PiggyBank size={20} color="var(--savings-primary)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--savings-primary)' }}>
                  Projected Savings
                </h4>
              </div>
              <span className="badge badge-savings">Projection</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              This is a calculated <strong>PROJECTION</strong>, not a real bank balance. Original goal is permanently preserved.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--savings-badge)', fontWeight: 600 }}>
              • Original Goal is never overwritten • Clear warning on reduction
            </div>
          </div>

          {/* Card 3: Daily Spending Discipline */}
          <div
            className="card"
            style={{
              borderLeft: '5px solid var(--primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="var(--primary)" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                  Daily Spending Limit
                </h4>
              </div>
              <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                Discipline
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
              Calculated dynamically from monthly pocket money, or fully customized to your daily college schedule.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              • Surplus saves to Wallet • Overspend drains Wallet first
            </div>
          </div>
        </div>
      </div>

      {/* Phase Status Card */}
      <div className="card">
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--primary)" />
          Phase 1 Foundation Ready
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          You have successfully completed Phase 1: Authentication flow, route protections, responsive navigation (sidebar on desktop, bottom navigation on mobile), student theme CSS variables, and clean modular code architecture.
        </p>
      </div>
    </div>
  );
}

