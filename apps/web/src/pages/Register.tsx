import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, User as UserIcon, Phone } from 'lucide-react';
import { Button, Input, Card, useToast } from '../components/ui/index.js';
import { useAuth } from '../auth/AuthContext.js';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await register(name.trim(), email.trim().toLowerCase(), phone.trim() || undefined);
      showToast('Verification code sent to your email!', 'success');
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&purpose=register`);
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
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
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Create Account</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Join PiggyPocket to track your pocket money with zero stress.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input
                label="Full Name"
                placeholder="e.g. Tanishka Sahu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<UserIcon size={18} />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. student@college.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={18} />}
                helperText="We will send a 6-digit one-time code to verify."
                required
              />

              <Input
                label="Mobile Phone (Optional)"
                type="tel"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone size={18} />}
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
                icon={<UserPlus size={18} />}
              >
                Sign Up with OTP
              </Button>
            </Card>
          </form>

          <p style={{ textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Log In
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
