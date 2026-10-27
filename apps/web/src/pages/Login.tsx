import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button, Input, Card } from '../components/ui/index.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.5rem', justifyContent: 'space-between' }}>
      <div>
        <header style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/')}>
            Back
          </Button>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Welcome Back</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Enter your email or mobile to receive a secure OTP.
            </p>
          </div>

          <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Input
              label="Email Address or Mobile"
              placeholder="e.g. student@college.edu.in"
              leftIcon={<KeyRound size={18} />}
              helperText="Real OTP authentication arrives in Phase 3."
            />

            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/verify-otp')}
            >
              Send OTP
            </Button>
          </Card>

          <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Don't have an account yet?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Create Account
            </Link>
          </p>
        </section>
      </div>

      <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingBottom: '1rem' }}>
        PiggyPocket • Secure Student Pocket Money
      </footer>
    </div>
  );
};
