SET lock_timeout = '5s';

-- Self-serve encrypted channel credentials stored per workspace on sales_connections.
ALTER TABLE sales_connections
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '' CHECK (length(display_name) <= 120),
  ADD COLUMN IF NOT EXISTS token_enc text,
  ADD COLUMN IF NOT EXISTS webhook_secret_enc text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow inbound webhook resolution by (channel, account) and cron delivery worker
-- tenant discovery without disabling FORCE ROW LEVEL SECURITY on sales_connections.
DROP POLICY IF EXISTS sales_connections_webhook_lookup ON sales_connections;
CREATE POLICY sales_connections_webhook_lookup ON sales_connections
  FOR SELECT
  USING (
    channel = NULLIF(current_setting('app.channel', true), '')
    AND account = NULLIF(current_setting('app.channel_account', true), '')
  );

DROP POLICY IF EXISTS sales_connections_worker_list ON sales_connections;
CREATE POLICY sales_connections_worker_list ON sales_connections
  FOR SELECT
  USING (current_setting('app.worker_mode', true) = 'deliver');

RESET lock_timeout;
