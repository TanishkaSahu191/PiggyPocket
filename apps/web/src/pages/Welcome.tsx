import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowRight,
  Sliders,
  AlertCircle
} from 'lucide-react';
import {
  Button,
  Card,
  ProgressBar,
  Modal,
  useToast,
  Skeleton,
  EmptyState,
  ErrorState,
  Input
} from '../components/ui/index.js';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoProgress, setDemoProgress] = useState(65);

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.5rem', justifyContent: 'space-between' }}>
      {/* Brand Header */}
      <div>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            paddingTop: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              🐷
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>PiggyPocket</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Smart Student Budget Tracker
              </span>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
            Log In
          </Button>
        </header>

        {/* Hero Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              width: 'fit-content'
            }}
          >
            <Sparkles size={14} />
            <span>Built for Students in India</span>
          </div>

          <h1 style={{ fontSize: '2rem', lineHeight: 1.15, fontWeight: 800 }}>
            Master your monthly pocket money in{' '}
            <span style={{ color: 'var(--color-primary)' }}>₹ rupees</span>.
          </h1>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Protect your savings goal with a dynamic daily spending limit. Overspends gently adjust
            your projected savings without touching your original target.
          </p>

          {/* Interactive Calculation Hero Card */}
          <Card
            variant="glass"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              marginTop: '0.5rem',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              background: 'linear-gradient(145deg, rgba(19, 29, 47, 0.85) 0%, rgba(11, 15, 25, 0.95) 100%)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={18} color="var(--color-primary)" />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Monthly Budget Model</span>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface-solid)',
                  color: 'var(--color-accent)'
                }}
              >
                Zero Floats • Exact Paise
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Pocket Money</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>₹5,000</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Savings Goal</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-primary)' }}>₹1,000</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Daily Limit</span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-accent)' }}>₹133<small>/day</small></strong>
              </div>
            </div>

            <ProgressBar
              progress={65}
              label="Projected Savings Status"
              sublabel="₹1,000 intact (ON_TRACK)"
              variant="primary"
            />
          </Card>

          {/* Features Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: 'var(--color-primary)', display: 'flex' }}><ShieldCheck size={20} /></div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <strong>No running totals:</strong> Recomputed cleanly from every transaction.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: 'var(--color-accent)', display: 'flex' }}><TrendingUp size={20} /></div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <strong>Dynamic Projections:</strong> Know exact daily room before spending.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ color: 'var(--color-primary)', display: 'flex' }}><Calendar size={20} /></div>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <strong>IST Timezone Aware:</strong> 11:30 PM transactions belong to today.
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Actions */}
      <footer style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', paddingBottom: '1rem' }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={18} />}
          onClick={() => navigate('/register')}
        >
          Get Started with Pocket Money
        </Button>

        <Button
          variant="secondary"
          size="md"
          fullWidth
          icon={<Sliders size={16} />}
          onClick={() => setIsDemoModalOpen(true)}
        >
          Preview UI Component Kit
        </Button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Phase 1 Skeleton • Phase 2 Pure Budget Engine Ready
        </p>
      </footer>

      {/* UI Component Showcase Modal */}
      <Modal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Reusable UI Components Showcase"
        footer={
          <Button variant="primary" size="sm" onClick={() => setIsDemoModalOpen(false)}>
            Done Exploring
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              1. Input Component with Left & Right Icons
            </h4>
            <Input
              label="Sample Pocket Money (₹)"
              placeholder="e.g. 5000"
              leftIcon={<span>₹</span>}
              helperText="Enter amount in Indian Rupees"
            />
          </div>

          <div>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              2. Interactive Progress Bar
            </h4>
            <ProgressBar
              progress={demoProgress}
              label="Daily Limit Consumed"
              sublabel={`${demoProgress}% spent`}
              variant={demoProgress > 80 ? 'danger' : demoProgress > 60 ? 'warning' : 'primary'}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button size="sm" variant="ghost" onClick={() => setDemoProgress(30)}>30%</Button>
              <Button size="sm" variant="ghost" onClick={() => setDemoProgress(70)}>70%</Button>
              <Button size="sm" variant="ghost" onClick={() => setDemoProgress(95)}>95%</Button>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              3. Interactive Toast Notifications
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => showToast('Budget calculation verified with zero float precision!', 'success')}
              >
                Success Toast
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => showToast('Overspend detected: Adjusted savings reduced by ₹20.', 'error')}
              >
                Alert Toast
              </Button>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              4. Shimmer Skeleton Loaders
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton height="1.25rem" width="60%" />
              <Skeleton height="0.85rem" width="100%" />
              <Skeleton height="0.85rem" width="80%" />
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              5. Empty State & Error State
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <EmptyState
                icon={<AlertCircle size={28} />}
                title="No Expenses Logged Yet"
                description="Your first expense will automatically update your daily spending limit."
              />
              <ErrorState
                title="Failed to Load Transactions"
                message="Could not reach the local budget server. Please retry."
                onRetry={() => showToast('Retried connection successfully!', 'info')}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
