SET lock_timeout = '5s';

-- Track 14-day free trial windows and paid subscription periods per workspace.
ALTER TABLE sales_workspaces
  ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'trial'
    CHECK (plan_code IN ('trial', 'starter', 'growth', 'pro', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  ADD COLUMN IF NOT EXISTS trial_starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

RESET lock_timeout;
