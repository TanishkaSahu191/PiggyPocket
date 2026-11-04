import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import FallingCoins3D from '../../components/common/FallingCoins3D';

export default function OtpVerification() {
  const navigate = useNavigate();
  const { verifyOtp, resendOtp, pendingOtpEmail } = useAuth();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const inputRefs = useRef([]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
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
    setResendNotice('');

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
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setResendNotice('');

    try {
      await verifyOtp(fullOtp);
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setResendNotice('');
    try {
      await resendOtp();
      setResendNotice('A new 6-digit verification code has been dispatched.');
      setResendTimer(30);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const fillDemoOtp = () => {
    setOtpDigits(['1', '2', '3', '4', '5', '6']);
    setError('');
    setResendNotice('');
    if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  return (
    <div className="auth-container">
      {/* 3D Money Falling Background */}
      <FallingCoins3D />

      <div className="auth-card tactile-device-card">
        {/* Top Stitched Leather Badge */}
        <div className="auth-header">
          <div className="stitched-leather-badge">
            <div className="stitch-inner">
              <ShieldCheck size={20} className="leather-piggy-icon" />
              <span className="leather-badge-text">Account Verification</span>
            </div>
          </div>
          <h2 className="auth-title">Verify Your Account</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to{' '}
            <strong style={{ color: '#4a3b2c' }}>{pendingOtpEmail || 'your email'}</strong>
          </p>
        </div>

        {/* Resend success notice */}
        {resendNotice && (
          <div className="alert-box alert-success" style={{ marginBottom: '16px' }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{resendNotice}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="alert-box alert-danger" style={{ marginBottom: '16px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Tactile Recessed 6-digit OTP Input Grid */}
          <div className="tactile-otp-grid" onPaste={handlePaste}>
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
                className="tactile-otp-box"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {/* Pillow Button */}
          <button
            type="submit"
            className="pillow-button"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Verifying...' : 'Verify & Continue'}</span>
            {!isSubmitting && <ArrowRight size={19} className="pillow-button-arrow" />}
          </button>
        </form>

        {/* Torn Lined Notepad Paper for Notes & Testing */}
        <div className="torn-notes-paper" style={{ marginTop: '22px' }}>
          <div className="notes-paper-tear-top"></div>
          <div className="notes-paper-content">
            <div className="notes-paper-header">
              <span className="notes-paper-title">Notes</span>
              <button
                type="button"
                className="notes-fill-btn"
                onClick={fillDemoOtp}
              >
                Auto-fill 123456
              </button>
            </div>
            <div className="notes-paper-body">
              <div className="notes-line">
                <span className="notes-tag">Verification:</span> Check your inbox or use code <strong>123456</strong>
              </div>
              <div className="notes-line" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="notes-tag">Resend:</span>
                {resendTimer > 0 ? (
                  <span>Available in <strong>{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#8c5725',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {isResending ? 'Sending...' : 'Request Fresh Code'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="auth-footer tactile-footer">
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Cancel and back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
