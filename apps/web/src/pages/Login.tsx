import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { Button, Input, Card, useToast } from '../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestOtp } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await requestOtp(email.trim().toLowerCase(), 'login');
      showToast('If an account exists, an OTP has been sent!', 'success');
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&purpose=login`);
    } catch (err: any) {
      const msg = err.message || 'Failed to request OTP. Please try again.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

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
              Enter your email to receive a secure one-time password.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. student@college.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={18} />}
                helperText="Passwordless login via 6-digit email OTP"
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
                icon={<KeyRound size={18} />}
              >
                Send Login OTP
              </Button>
            </Card>
          </form>

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
