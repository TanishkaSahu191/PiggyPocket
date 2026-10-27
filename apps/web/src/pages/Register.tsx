import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { Button, Input, Card } from '../components/ui/index.js';

export const RegisterPage: React.FC = () => {
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
            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>Create Account</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Join PiggyPocket to manage your student budget with zero stress.
            </p>
          </div>

          <Card variant="solid" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <Input
              label="Full Name"
              placeholder="e.g. Tanishka Sahu"
            />

            <Input
              label="Email Address"
              placeholder="e.g. student@college.edu.in"
              helperText="You will receive one-time passwords via email/SMS."
            />

            <Button
              variant="primary"
              fullWidth
              icon={<UserPlus size={18} />}
              onClick={() => navigate('/verify-otp')}
            >
              Sign Up with OTP
            </Button>
          </Card>

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
