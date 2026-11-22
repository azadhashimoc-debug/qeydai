-- Per-tenant AI settings (business knowledge the auto-reply may answer from).
-- Additive only. Apply on a disposable branch first, then production after approval
-- (see docs/production-release-gate.md). Then grant the app role access, as for other tenant tables:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_ai_settings TO <app role>;
CREATE TABLE IF NOT EXISTS sales_ai_settings (
  tenant_id text PRIMARY KEY REFERENCES sales_workspaces(id),
  enabled boolean NOT NULL DEFAULT true,
  knowledge text NOT NULL DEFAULT '' CHECK (length(knowledge) <= 12000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sales_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_ai_settings FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sales_ai_settings' AND policyname='sales_ai_settings_isolation') THEN
    CREATE POLICY sales_ai_settings_isolation ON sales_ai_settings
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));
  END IF;
END $$;
