import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, PiggyBank, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateLoginForm } from '../../utils/validation';
import FallingCoins3D from '../../components/common/FallingCoins3D';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromLocation = location.state?.from?.pathname || '/dashboard';

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
    const validationErrors = validateLoginForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      await login(formData.email, formData.password);
      navigate(fromLocation, { replace: true });
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to fill demo account for quick testing
  const handleQuickFillDemo = () => {
    setFormData({
      email: 'tanishkasahu191@gmail.com',
      password: 'Password123!',
    });
    setErrors({});
    setServerError('');
  };

  return (
    <div className="auth-container">
      {/* 3D Money Falling Background */}
      <FallingCoins3D />

      <div className="auth-card tactile-device-card">
        {/* Top Stitched Leather Badge ("Auto-Brightness" Style Inspiration) */}
        <div className="auth-header">
          <div className="stitched-leather-badge">
            <div className="stitch-inner">
              <PiggyBank size={20} className="leather-piggy-icon" />
              <span className="leather-badge-text">PiggyPocket</span>
            </div>
          </div>
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Log in to track your pocket money & daily limits</p>
        </div>

        {serverError && (
          <div className="alert-box alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email: Recessed Groove Slot Inspiration */}
          <div className="form-group">
            <label className="form-label tactile-label" htmlFor="email">
              College Email or Email
            </label>
            <div className="tactile-groove-outer">
              <div className="tactile-groove-slot">
                <div className="brushed-metal-knob">
                  <Mail size={15} />
                </div>
                <input
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`tactile-input ${errors.email ? 'input-error' : ''}`}
                />
              </div>
            </div>
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          {/* Password: Recessed Groove Slot Inspiration */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label tactile-label" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="tactile-forgot-link">
                Forgot?
              </Link>
            </div>
            <div className="tactile-groove-outer">
              <div className="tactile-groove-slot">
                <div className="brushed-metal-knob">
                  <Lock size={15} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`tactile-input ${errors.password ? 'input-error' : ''}`}
                />
                <button
                  type="button"
                  className="brushed-metal-knob brushed-metal-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          {/* Pillow Button ("Pillow Button" Style Inspiration) */}
          <div style={{ marginTop: '22px' }}>
            <button
              type="submit"
              className="pillow-button"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Logging in...' : 'Sign In'}</span>
              {!isSubmitting && <ArrowRight size={19} className="pillow-button-arrow" />}
            </button>
          </div>
        </form>

        {/* Torn Lined Notepad Paper ("Notes" Style Inspiration) */}
        <div className="torn-notes-paper">
          <div className="notes-paper-tear-top"></div>
          <div className="notes-paper-content">
            <div className="notes-paper-header">
              <span className="notes-paper-title">Notes</span>
              <button
                type="button"
                className="notes-fill-btn"
                onClick={handleQuickFillDemo}
              >
                Fill Info
              </button>
            </div>
            <div className="notes-paper-body">
              <div className="notes-line">
                <span className="notes-tag">Demo:</span> tanishkasahu191@gmail.com
              </div>
              <div className="notes-line">
                <span className="notes-tag">Pass:</span> Password123!
              </div>
            </div>
          </div>
        </div>

        <div className="auth-footer tactile-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one for free</Link>
        </div>
      </div>
    </div>
  );
}
