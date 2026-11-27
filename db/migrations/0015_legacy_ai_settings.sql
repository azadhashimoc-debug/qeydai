-- Upgrade installations that already had the earlier, smaller AI settings table.
SET lock_timeout = '5s';

ALTER TABLE sales_ai_settings
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'llama-3.3-70b-versatile' CHECK (length(model) BETWEEN 2 AND 100),
  ADD COLUMN IF NOT EXISTS business_context text NOT NULL DEFAULT '' CHECK (length(business_context) <= 8000),
  ADD COLUMN IF NOT EXISTS system_prompt text NOT NULL DEFAULT '' CHECK (length(system_prompt) <= 4000),
  ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'friendly' CHECK (tone IN ('friendly', 'professional', 'concise')),
  ADD COLUMN IF NOT EXISTS handoff_keywords text[] NOT NULL DEFAULT ARRAY['operator', 'menecer', 'manager', 'human', 'agent'],
  ADD COLUMN IF NOT EXISTS max_replies_per_thread integer NOT NULL DEFAULT 8 CHECK (max_replies_per_thread BETWEEN 1 AND 50),
  ADD COLUMN IF NOT EXISTS monthly_reply_limit integer NOT NULL DEFAULT 500 CHECK (monthly_reply_limit BETWEEN 10 AND 100000);

RESET lock_timeout;
