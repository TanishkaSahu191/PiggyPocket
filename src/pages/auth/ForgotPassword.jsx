import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, PiggyBank, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateForgotPasswordForm } from '../../utils/validation';
import FallingCoins3D from '../../components/common/FallingCoins3D';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForgotPasswordForm({ email });
    if (errors.email) {
      setError(errors.email);
      return;
    }

    setIsSubmitting(true);
    setError('');
    setServerError('');

    try {
      await forgotPassword(email);
      // Navigate to OTP verification page
      navigate('/verify-otp');
    } catch (err) {
      setServerError(err.message || 'Could not process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <FallingCoins3D />
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-icon-box">
              <PiggyBank size={24} />
            </div>
            <span className="brand-title">Piggy<span>Pocket</span></span>
          </div>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            Enter your registered email and we'll send a 6-digit OTP code
          </p>
        </div>

        {serverError && (
          <div className="alert-box alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="reset-email">Registered Email</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                  if (serverError) setServerError('');
                }}
                className={`input-field ${error ? 'input-error' : ''}`}
              />
            </div>
            {error && <div className="field-error">{error}</div>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: '12px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending OTP...' : 'Send OTP Code'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '20px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

