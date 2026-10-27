-- Migration 004: Monthly Reports, Settings, Audit Logs, and Category Rules

-- Budget Period Audit Log
CREATE TABLE IF NOT EXISTS budget_period_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_pocket_money_paise BIGINT NOT NULL,
  new_pocket_money_paise BIGINT NOT NULL,
  old_savings_goal_paise BIGINT NOT NULL,
  new_savings_goal_paise BIGINT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_audit_period ON budget_period_audit(budget_period_id);
CREATE INDEX IF NOT EXISTS idx_budget_audit_user ON budget_period_audit(user_id);

-- Category Rules Table (Keyword -> Category mapping)
CREATE TABLE IF NOT EXISTS category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_category_rules_user ON category_rules(user_id);

-- Pending email column on users for email change OTP verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
