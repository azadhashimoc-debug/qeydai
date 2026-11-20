-- QeydAI PostgreSQL initial schema
-- Target: PostgreSQL 15+
-- Principles: TIMESTAMPTZ, TEXT + CHECK instead of VARCHAR, explicit FK indexes, multi-tenant RLS.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sessions (
  tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 64),
  id        TEXT NOT NULL CHECK (length(id) BETWEEN 1 AND 128),
  course_id TEXT NOT NULL CHECK (length(course_id) BETWEEN 1 AND 128),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity  INTEGER NOT NULL CHECK (capacity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS sessions_tenant_starts_idx
  ON sessions (tenant_id, starts_at);

CREATE TABLE IF NOT EXISTS enrollments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 64),
  session_id TEXT NOT NULL CHECK (length(session_id) BETWEEN 1 AND 128),
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  phone      TEXT NOT NULL CHECK (phone ~ '^\+994(10|50|51|55|60|70|77|99)[0-9]{7}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, session_id, phone),
  FOREIGN KEY (tenant_id, session_id) REFERENCES sessions (tenant_id, id) ON DELETE RESTRICT
);

-- Explicit FK / lookup index for fast seat counts per session
CREATE INDEX IF NOT EXISTS enrollments_tenant_session_idx
  ON enrollments (tenant_id, session_id);

CREATE INDEX IF NOT EXISTS enrollments_tenant_created_idx
  ON enrollments (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS leads (
  lead_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  phone      TEXT NOT NULL CHECK (phone ~ '^\+994(10|50|51|55|60|70|77|99)[0-9]{7}$'),
  source     TEXT NOT NULL DEFAULT 'web' CHECK (length(source) BETWEEN 1 AND 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_created_idx
  ON leads (created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event      TEXT NOT NULL CHECK (length(event) BETWEEN 1 AND 64),
  locale     TEXT NOT NULL CHECK (locale IN ('az', 'en')),
  props      JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(props) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_created_idx
  ON analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_props_gin
  ON analytics_events USING GIN (props jsonb_path_ops);

-- Multi-tenant Row-Level Security (optional enforcement when connection sets app.tenant_id)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'sessions' AND policyname = 'sessions_tenant_isolation'
  ) THEN
    CREATE POLICY sessions_tenant_isolation ON sessions
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'enrollments' AND policyname = 'enrollments_tenant_isolation'
  ) THEN
    CREATE POLICY enrollments_tenant_isolation ON enrollments
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END $$;
