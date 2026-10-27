import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Input, Card } from '../components/ui/index.js';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.5rem', justifyContent: 'space-between' }}>
      <div>
        <header style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/login')}>
            Back
          </Button>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Verify OTP</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Enter the 6-digit verification code sent to your email.
            </p>
          </div>

          <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Input
              label="6-Digit OTP"
              placeholder="• • • • • •"
              maxLength={6}
              style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }}
              helperText="In Phase 3, real OTP will be delivered via Brevo / Resend."
            />

            <Button
              variant="primary"
              fullWidth
              icon={<CheckCircle2 size={18} />}
              onClick={() => {
                alert('Phase 1 Auth Guard: Unauthenticated visitors cannot access dashboard until Phase 3 real auth arrives.');
                navigate('/login');
              }}
            >
              Verify & Enter
            </Button>
          </Card>
        </section>
      </div>

      <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingBottom: '1rem' }}>
        PiggyPocket • Secure Student Pocket Money
      </footer>
    </div>
  );
};
