-- Migration 002: Email Scheduler & Delivery Tracking

CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    date_sent DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    CONSTRAINT unique_user_daily_email UNIQUE (user_id, email_type, date_sent)
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_date ON email_logs(user_id, email_type, date_sent);

ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS daily_email_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS delivery_hour INT DEFAULT 22;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS time_zone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255);
