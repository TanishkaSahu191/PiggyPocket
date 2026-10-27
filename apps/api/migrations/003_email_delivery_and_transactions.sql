-- Migration 003: Transactions and Email Delivery Log

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  note TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_at);

-- Email Delivery Log Table
CREATE TABLE IF NOT EXISTS email_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'queued' | 'sent' | 'failed' | 'skipped'
  attempt_count INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  provider_message_id VARCHAR(255),
  summary_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_report_date UNIQUE (user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_email_delivery_user_date ON email_delivery_log(user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_email_delivery_status_next ON email_delivery_log(status, next_attempt_at);
