SET lock_timeout = '5s';

-- Workspace-level Pani AI configuration and monthly usage tracking.
CREATE TABLE IF NOT EXISTS sales_ai_settings (
  tenant_id text PRIMARY KEY REFERENCES sales_workspaces(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  model text NOT NULL DEFAULT 'llama-3.3-70b-versatile' CHECK (length(model) BETWEEN 2 AND 100),
  business_context text NOT NULL DEFAULT '' CHECK (length(business_context) <= 8000),
  system_prompt text NOT NULL DEFAULT '' CHECK (length(system_prompt) <= 4000),
  tone text NOT NULL DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'concise')),
  handoff_keywords text[] NOT NULL DEFAULT ARRAY['operator', 'menecer', 'manager', 'human', 'agent'],
  max_replies_per_thread integer NOT NULL DEFAULT 8 CHECK (max_replies_per_thread BETWEEN 1 AND 50),
  monthly_reply_limit integer NOT NULL DEFAULT 500 CHECK (monthly_reply_limit BETWEEN 10 AND 100000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_ai_usage (
  tenant_id text NOT NULL REFERENCES sales_workspaces(id) ON DELETE CASCADE,
  month_key text NOT NULL CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  replies_count integer NOT NULL DEFAULT 0 CHECK (replies_count >= 0),
  copilot_count integer NOT NULL DEFAULT 0 CHECK (copilot_count >= 0),
  tokens_in bigint NOT NULL DEFAULT 0 CHECK (tokens_in >= 0),
  tokens_out bigint NOT NULL DEFAULT 0 CHECK (tokens_out >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, month_key)
);

ALTER TABLE sales_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_ai_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE sales_ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_ai_usage FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_ai_settings_isolation ON sales_ai_settings;
CREATE POLICY sales_ai_settings_isolation ON sales_ai_settings
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

DROP POLICY IF EXISTS sales_ai_usage_isolation ON sales_ai_usage;
CREATE POLICY sales_ai_usage_isolation ON sales_ai_usage
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

RESET lock_timeout;
