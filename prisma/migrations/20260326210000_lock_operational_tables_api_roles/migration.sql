-- Lock operational / sensitive tables from Supabase Data API roles (anon, authenticated).
-- RLS enabled with no policies: non-owner access is denied; Prisma uses the migration/owner DB role and bypasses RLS.
-- Pattern matches public._prisma_migrations hardening.

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.connections FROM anon, authenticated;

ALTER TABLE public.supra_queue_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supra_queue_items FROM anon, authenticated;

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.usage_events FROM anon, authenticated;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.activity_logs FROM anon, authenticated;

ALTER TABLE public.seller_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.seller_reports FROM anon, authenticated;

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.feedback_requests FROM anon, authenticated;
