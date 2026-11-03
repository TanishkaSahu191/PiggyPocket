/**
 * =======================================================================
 * OTP VERIFICATION SCREEN (PLACEHOLDER / MOCK)
 *
 * TODO: Real OTP verification via SMS/Email provider comes in Phase 5.
 * In Phase 1, mock OTP code is '123456'.
 * =======================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function OtpVerification() {
  const navigate = useNavigate();
  const { verifyOtp, pendingOtpEmail } = useAuth();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = useRef([]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Simple countdown timer for mock resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index, value) => {
    // Only accept numbers
    if (value && !/^\d+$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Take the last character typed
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setError('');

    // If character entered, jump to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace navigation
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length < 6) {
      setError('Please enter the full 6-digit OTP code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // TODO: Real OTP verification endpoint will be connected in Phase 5.
      await verifyOtp(fullOtp);
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Try entering 123456 for Phase 1 testing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillMockOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon-box" style={{ margin: '0 auto 12px auto' }}>
            <ShieldCheck size={24} />
          </div>
          <h2 className="auth-title">Verify Your Account 📲</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to{' '}
            <strong>{pendingOtpEmail || 'your email / phone'}</strong>
          </p>
        </div>

        {/* Phase 1 Mock Notice */}
        <div className="alert-box alert-info">
          <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Phase 1 Mock OTP:</strong> Enter <code>123456</code>.
            <div style={{ fontSize: '0.78rem', marginTop: 2 }}>
              {/* TODO: Real OTP SMS/Email provider integration comes in Phase 5 */}
              (Real OTP verification via SMS/Email will be connected in Phase 5)
            </div>
          </div>
        </div>

        {error && (
          <div className="alert-box alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="otp-inputs-grid" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="otp-box"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="otp-resend">
          {resendTimer > 0 ? (
            <span>Resend code in <strong>{resendTimer}s</strong></span>
          ) : (
            <button
              type="button"
              onClick={() => setResendTimer(30)}
              style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
            >
              Resend OTP Code
            </button>
          )}
          <span style={{ margin: '0 8px' }}>•</span>
          <button
            type="button"
            onClick={fillMockOtp}
            style={{ color: 'var(--wallet-primary)', fontWeight: 600, textDecoration: 'underline' }}
          >
            Auto-fill 123456
          </button>
        </div>

        <div className="auth-footer" style={{ marginTop: '24px' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Cancel and back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

