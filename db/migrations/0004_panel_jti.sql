-- Durable tenant-scoped panel JWT revocation for multi-instance deployments.
-- This is application auth and does not depend on the neon_auth schema.
CREATE TABLE IF NOT EXISTS panel_revoked_jti (
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 64),
  jti TEXT NOT NULL CHECK (length(jti) BETWEEN 8 AND 128),
  exp_ms BIGINT NOT NULL CHECK (exp_ms > 0),
  PRIMARY KEY (tenant_id, jti)
);
CREATE INDEX IF NOT EXISTS panel_revoked_jti_exp_idx ON panel_revoked_jti (exp_ms);
ALTER TABLE panel_revoked_jti ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_revoked_jti FORCE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='panel_revoked_jti' AND policyname='panel_revoked_jti_tenant_isolation'
  ) THEN
    CREATE POLICY panel_revoked_jti_tenant_isolation ON panel_revoked_jti
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true),''))
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true),''));
  END IF;
END $$;
