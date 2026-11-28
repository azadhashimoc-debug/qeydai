SET lock_timeout = '5s';

-- Keep provider acceptance separate from device delivery. Nullable message_id
-- handles a status webhook arriving before the send response is committed.
CREATE TABLE IF NOT EXISTS sales_delivery_receipts (
  tenant_id text NOT NULL,
  connection_id text NOT NULL,
  provider_message_id text NOT NULL CHECK (length(provider_message_id) BETWEEN 1 AND 256),
  message_id text,
  recipient_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','delivered','read','failed')),
  provider_timestamp bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, connection_id, provider_message_id),
  FOREIGN KEY (tenant_id, connection_id) REFERENCES sales_connections(tenant_id,id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, message_id) REFERENCES sales_messages(tenant_id,id) ON DELETE CASCADE
);
ALTER TABLE sales_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_delivery_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_delivery_receipts_isolation ON sales_delivery_receipts;
CREATE POLICY sales_delivery_receipts_isolation ON sales_delivery_receipts
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

RESET lock_timeout;
