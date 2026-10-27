-- Migration 002: Authentication, OTP, Refresh Tokens, Budget Periods, Daily Limits, and Notification Prefs

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  email_verified_at TIMESTAMP WITH TIME ZONE,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  purpose VARCHAR(50) NOT NULL, -- 'register' | 'login'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  consumed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_codes(email, purpose);

-- Refresh Tokens Table (Rotating & Revocable)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- Budget Periods Table (Unique per user per month 'YYYY-MM')
CREATE TABLE IF NOT EXISTS budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_key VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  pocket_money_paise BIGINT NOT NULL,
  received_on DATE NOT NULL,
  savings_goal_paise BIGINT NOT NULL,
  spending_budget_paise BIGINT NOT NULL,
  rule_version INT NOT NULL DEFAULT 2, -- 2 for reservoir rule
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_month UNIQUE (user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_budget_periods_user_month ON budget_periods(user_id, month_key);

-- Daily Limit Settings Table
CREATE TABLE IF NOT EXISTS daily_limit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  limit_paise BIGINT NOT NULL,
  mode VARCHAR(20) NOT NULL DEFAULT 'auto', -- 'auto' | 'custom'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_limit_period ON daily_limit_settings(budget_period_id);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  send_time_local VARCHAR(5) NOT NULL DEFAULT '22:00', -- 'HH:MM' 24hr format
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_prefs(user_id);
