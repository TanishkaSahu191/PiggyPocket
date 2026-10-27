import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCw } from 'lucide-react';
import { Button, Input, Card, useToast } from '../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.js';

export const VerifyOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const purposeParam = (searchParams.get('purpose') as 'register' | 'login') || 'login';

  const { verifyOtp, requestOtp, hasActiveBudget } = useAuth();
  const { showToast } = useToast();

  const [email] = useState(emailParam);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  // Resend cooldown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, code, purposeParam);
      showToast('Authentication successful!', 'success');
      if (hasActiveBudget) {
        navigate('/home', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired verification code.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      await requestOtp(email, purposeParam);
      showToast('New verification code sent!', 'info');
      setCountdown(60);
    } catch (err: any) {
      const msg = err.message || 'Failed to resend code.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mobile-view-wrapper" style={{ padding: '1.5rem', justifyContent: 'space-between' }}>
      <div>
        <header style={{ marginBottom: '2rem', paddingTop: '0.5rem' }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(purposeParam === 'register' ? '/register' : '/login')}
          >
            Back
          </Button>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Verify OTP</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Enter the 6-digit code sent to <strong style={{ color: 'var(--color-text-primary)' }}>{email || 'your email'}</strong>.
            </p>
          </div>

          <form onSubmit={handleVerify}>
            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="6-Digit Code"
                placeholder="000000"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
                style={{
                  textAlign: 'center',
                  letterSpacing: '0.45rem',
                  fontSize: '1.4rem',
                  fontWeight: 700
                }}
                helperText="In development mode, check your server console for the code."
                required
              />

              {error && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-danger-light)',
                    color: 'var(--color-danger)',
                    fontSize: 'var(--font-size-sm)'
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={loading}
                icon={<CheckCircle2 size={18} />}
              >
                Verify & Enter
              </Button>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={countdown > 0 || resending}
                  onClick={handleResend}
                  icon={<RotateCw size={14} />}
                >
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend Code'}
                </Button>
              </div>
            </Card>
          </form>
        </section>
      </div>

      <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingBottom: '1rem' }}>
        PiggyPocket • Secure Student Pocket Money
      </footer>
    </div>
  );
};
