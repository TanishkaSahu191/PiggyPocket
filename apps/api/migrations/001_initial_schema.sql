-- Migration 001: Initial Schema and Migration Proof Test Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Test table proving migrations run successfully
CREATE TABLE IF NOT EXISTS system_status (
  id SERIAL PRIMARY KEY,
  component VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'healthy',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_status (component, status)
VALUES ('database_migration', 'initialized')
ON CONFLICT DO NOTHING;
