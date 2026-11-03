/**
 * Form and input validation utilities for PiggyPocket.
 */

// Email regex pattern following standard RFC 5322 approximation
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 10-digit phone number regex (digits only, e.g. Indian/standard 10-digit mobile)
export const PHONE_REGEX = /^[6-9]\d{9}$/;

/**
 * Validates an email address.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a 10-digit phone number.
 * Allows optional leading +91 or spaces/hyphens which get stripped.
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-+]/g, '');
  // If preceded by 91 country code and 12 chars total, check last 10
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return PHONE_REGEX.test(cleaned.slice(2));
  }
  return PHONE_REGEX.test(cleaned);
}

/**
 * Evaluates password strength and returns score, label, color, and checks.
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, checks: object }}
 */
export function checkPasswordStrength(password) {
  const p = password || '';
  const checks = {
    minLength: p.length >= 8,
    hasLower: /[a-z]/.test(p),
    hasUpper: /[A-Z]/.test(p),
    hasNumber: /\d/.test(p),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(p),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (p.length === 0) {
    return { score: 0, label: '', color: '#e2e8f0', checks };
  }
  if (score <= 2) {
    return { score: 1, label: 'Weak', color: '#ef4444', checks };
  }
  if (score === 3 || score === 4) {
    return { score: 2, label: 'Fair', color: '#f59e0b', checks };
  }
  return { score: 3, label: 'Strong', color: '#10b981', checks };
}

/**
 * Validates the Sign Up form values.
 * @param {{ fullName: string, email: string, phone: string, password: string, confirmPassword: string }} values
 * @returns {Record<string, string>} map of field error messages
 */
export function validateSignUpForm(values) {
  const errors = {};

  // Full Name
  if (!values.fullName || !values.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (values.fullName.trim().length < 2) {
    errors.fullName = 'Name must be at least 2 characters';
  }

  // Email
  if (!values.email || !values.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone
  if (!values.phone || !values.phone.trim()) {
    errors.phone = '10-digit mobile number is required';
  } else if (!validatePhone(values.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number (e.g. 9876543210)';
  }

  // Password
  if (!values.password) {
    errors.password = 'Password is required';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else {
    const strength = checkPasswordStrength(values.password);
    if (strength.score < 2) {
      errors.password = 'Password is too weak. Include upper, lower & numbers';
    }
  }

  // Confirm Password
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}

/**
 * Validates Login form values.
 * @param {{ email: string, password: string }} values
 * @returns {Record<string, string>}
 */
export function validateLoginForm(values) {
  const errors = {};
  if (!values.email || !values.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!values.password) {
    errors.password = 'Password is required';
  }
  return errors;
}

/**
 * Validates Forgot Password form values.
 * @param {{ email: string }} values
 * @returns {Record<string, string>}
 */
export function validateForgotPasswordForm(values) {
  const errors = {};
  if (!values.email || !values.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  return errors;
}

