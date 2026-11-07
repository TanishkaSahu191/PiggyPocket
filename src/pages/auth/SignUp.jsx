import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, PiggyBank, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateSignUpForm, checkPasswordStrength } from '../../utils/validation';
import FallingCoins3D from '../../components/common/FallingCoins3D';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';

export default function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = checkPasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateSignUpForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await signup(formData);
      // Navigate to OTP verification page
      navigate('/verify-otp');
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <FallingCoins3D />
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-brand">
            <div className="brand-icon-box">
              <PiggyBank size={24} />
            </div>
            <span className="brand-title">Piggy<span>Pocket</span></span>
          </div>
          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Never run out of pocket money before month-end</p>
        </div>

        {serverError && (
          <div className="alert-box alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{serverError}</span>
          </div>
        )}

        <GoogleSignInButton
          onError={(msg) => setServerError(msg)}
          redirectTo="/dashboard"
        />

        <div className="auth-divider">
          <div className="auth-divider-line"></div>
          <span className="auth-divider-text">or register with email</span>
          <div className="auth-divider-line"></div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                id="fullName"
                type="text"
                name="fullName"
                autoComplete="name"
                placeholder="e.g. Tanishka Sahu"
                value={formData.fullName}
                onChange={handleChange}
                className={`input-field ${errors.fullName ? 'input-error' : ''}`}
              />
            </div>
            {errors.fullName && <div className="field-error">{errors.fullName}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${errors.email ? 'input-error' : ''}`}
              />
            </div>
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">Mobile Number (10 digits)</label>
            <div className="input-wrapper">
              <Phone size={18} className="input-icon" />
              <input
                id="phone"
                type="tel"
                name="phone"
                maxLength={10}
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                className={`input-field ${errors.phone ? 'input-error' : ''}`}
              />
            </div>
            {errors.phone && <div className="field-error">{errors.phone}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                className={`input-field ${errors.password ? 'input-error' : ''}`}
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Live Password Strength Meter */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar-track">
                  <div
                    className="strength-bar-fill"
                    style={{
                      width: `${(passwordStrength.score / 3) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <div className="strength-meta">
                  <span>Strength: <strong style={{ color: passwordStrength.color }}>{passwordStrength.label}</strong></span>
                  <span>Use uppercase, numbers & symbols</span>
                </div>
              </div>
            )}
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="field-error">{errors.confirmPassword}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            style={{ marginTop: '16px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
            {!isSubmitting && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in instead</Link>
        </div>
      </div>
    </div>
  );
}

