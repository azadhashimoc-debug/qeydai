-- Shared fixed-window counters for public auth endpoints (register/login), so limits hold
-- across all serverless instances. Buckets are SHA-256 hashes; raw IPs/emails are never stored.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket text PRIMARY KEY CHECK (length(bucket) BETWEEN 8 AND 128),
  count integer NOT NULL CHECK (count > 0),
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_reset_idx ON auth_rate_limits(reset_at);
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_rate_limits_bucket ON auth_rate_limits;
CREATE POLICY auth_rate_limits_bucket ON auth_rate_limits
  USING (bucket = NULLIF(current_setting('app.rate_bucket', true), ''))
  WITH CHECK (bucket = NULLIF(current_setting('app.rate_bucket', true), ''));
-- Housekeeping: any caller may see and delete only rows whose window has already expired.
-- (PostgreSQL applies SELECT policies to rows a DELETE ... WHERE reads, so both are needed.)
DROP POLICY IF EXISTS auth_rate_limits_expired ON auth_rate_limits;
DROP POLICY IF EXISTS auth_rate_limits_expired_read ON auth_rate_limits;
CREATE POLICY auth_rate_limits_expired_read ON auth_rate_limits
  FOR SELECT USING (reset_at < now());
DROP POLICY IF EXISTS auth_rate_limits_expired_delete ON auth_rate_limits;
CREATE POLICY auth_rate_limits_expired_delete ON auth_rate_limits
  FOR DELETE USING (reset_at < now());
