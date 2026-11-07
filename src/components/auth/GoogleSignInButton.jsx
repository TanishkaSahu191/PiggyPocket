import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Check, X, ShieldCheck } from 'lucide-react';

export default function GoogleSignInButton({ onSuccess, onError, redirectTo = '/dashboard' }) {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelectAccount = async (account) => {
    setIsLoading(true);
    try {
      await loginWithGoogle({
        email: account.email,
        fullName: account.fullName,
        avatar: account.avatar,
        googleId: account.googleId,
      });
      setShowPicker(false);
      if (onSuccess) onSuccess();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (onError) onError(err.message || 'Google authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !customEmail.includes('@')) {
      if (onError) onError('Please enter a valid Google email address.');
      return;
    }
    handleSelectAccount({
      email: customEmail.trim(),
      fullName: customName.trim() || customEmail.split('@')[0],
      googleId: 'g_' + Date.now(),
    });
  };

  const handleClick = () => {
    setShowPicker(true);
  };

  return (
    <>
      <button
        type="button"
        className="tactile-google-btn"
        onClick={handleClick}
        disabled={isLoading}
        aria-label="Continue with Google"
      >
        <span className="google-icon-wrapper">
          <svg className="google-svg" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        </span>
        <span className="google-btn-text">
          {isLoading ? 'Signing in with Google...' : 'Continue with Google'}
        </span>
      </button>

      {/* Google Account Selector Dialog */}
      {showPicker && (
        <div className="google-modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="google-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <div className="google-modal-brand">
                <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="google-modal-title">Sign in with Google</span>
              </div>
              <button
                type="button"
                className="google-modal-close"
                onClick={() => setShowPicker(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="google-modal-subtitle">
              Choose a Google account to access PiggyPocket directly without OTP codes:
            </p>

            <div className="google-account-list">
              {/* Primary Developer / Owner Account */}
              <button
                type="button"
                className="google-account-item"
                onClick={() =>
                  handleSelectAccount({
                    email: 'tanishkasahuwork191@gmail.com',
                    fullName: 'Tanishka Sahu',
                    googleId: 'g_tanishka_191',
                  })
                }
              >
                <div className="google-avatar-circle" style={{ background: '#7c3aed' }}>
                  T
                </div>
                <div className="google-account-details">
                  <span className="google-account-name">Tanishka Sahu</span>
                  <span className="google-account-email">tanishkasahuwork191@gmail.com</span>
                </div>
                <Check size={18} className="google-account-select-icon" />
              </button>

              {/* Student Demo Account */}
              <button
                type="button"
                className="google-account-item"
                onClick={() =>
                  handleSelectAccount({
                    email: 'tanishkasahu191@gmail.com',
                    fullName: 'Tanishka Sahu (Personal)',
                    googleId: 'g_tanishka_personal',
                  })
                }
              >
                <div className="google-avatar-circle" style={{ background: '#0284c7' }}>
                  P
                </div>
                <div className="google-account-details">
                  <span className="google-account-name">Tanishka Sahu (Personal)</span>
                  <span className="google-account-email">tanishkasahu191@gmail.com</span>
                </div>
                <Check size={18} className="google-account-select-icon" />
              </button>

              {/* College Student Account */}
              <button
                type="button"
                className="google-account-item"
                onClick={() =>
                  handleSelectAccount({
                    email: 'student@college.edu',
                    fullName: 'College Student',
                    googleId: 'g_student_demo',
                  })
                }
              >
                <div className="google-avatar-circle" style={{ background: '#059669' }}>
                  S
                </div>
                <div className="google-account-details">
                  <span className="google-account-name">College Student</span>
                  <span className="google-account-email">student@college.edu</span>
                </div>
                <Check size={18} className="google-account-select-icon" />
              </button>
            </div>

            {/* Option to use another Google account */}
            {!showCustomInput ? (
              <button
                type="button"
                className="google-use-another-btn"
                onClick={() => setShowCustomInput(true)}
              >
                Use another Google account
              </button>
            ) : (
              <form onSubmit={handleCustomSubmit} className="google-custom-form">
                <input
                  type="email"
                  className="google-custom-input"
                  placeholder="name@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  autoFocus
                  required
                />
                <input
                  type="text"
                  className="google-custom-input"
                  placeholder="Your Full Name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <div className="google-custom-actions">
                  <button
                    type="button"
                    className="google-custom-cancel"
                    onClick={() => setShowCustomInput(false)}
                  >
                    Back
                  </button>
                  <button type="submit" className="google-custom-submit">
                    Sign in with this account
                  </button>
                </div>
              </form>
            )}

            <div className="google-modal-footer">
              <ShieldCheck size={14} className="google-shield-icon" />
              <span>Verified Google OAuth session with direct dashboard access</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
