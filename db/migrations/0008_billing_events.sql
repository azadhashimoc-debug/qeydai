-- Paycell webhook events. event_id makes delivery idempotent.
CREATE TABLE IF NOT EXISTS billing_events (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id),
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 1 AND 128),
  plan text NOT NULL CHECK (plan IN ('starter','growth','pro','enterprise')),
  period text NOT NULL CHECK (period IN ('monthly','halfYear','annual')),
  status text NOT NULL CHECK (status IN ('paid','failed','refunded')),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'AZN' CHECK (currency = 'AZN'),
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_id)
);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY billing_events_isolation ON billing_events
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
