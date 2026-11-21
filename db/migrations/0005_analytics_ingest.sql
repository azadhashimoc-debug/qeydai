-- Public-site marketing analytics: append-only application access, not tenant CRM data.
-- Reuse the existing analytics_events table, but never permit app roles to SELECT or DELETE.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert_only ON public.analytics_events;
CREATE POLICY analytics_events_insert_only ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    event IN (
      'page_viewed', 'cta_clicked', 'language_switched', 'faq_toggled',
      'scroll_depth_reached', 'lead_form_started', 'lead_form_submitted',
      'lead_form_failed', 'web_vital_measured'
    )
    AND locale IN ('az', 'en')
    AND jsonb_typeof(props) = 'object'
    AND pg_column_size(props) <= 2048
  );

-- FORCE RLS applies even to the table owner; allow owner-only reporting and retention.
DROP POLICY IF EXISTS analytics_events_owner_select ON public.analytics_events;
CREATE POLICY analytics_events_owner_select ON public.analytics_events
  FOR SELECT USING (current_user = 'neondb_owner');

DROP POLICY IF EXISTS analytics_events_owner_delete ON public.analytics_events;
CREATE POLICY analytics_events_owner_delete ON public.analytics_events
  FOR DELETE USING (current_user = 'neondb_owner');

REVOKE ALL PRIVILEGES ON TABLE public.analytics_events FROM PUBLIC;

DO $roles$
DECLARE app_role text;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['panelim_production_app', 'panelim_staging_app'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.analytics_events FROM %I', app_role);
      EXECUTE format(
        'GRANT INSERT (event, locale, props) ON TABLE public.analytics_events TO %I',
        app_role
      );
    END IF;
  END LOOP;
END $roles$;
