-- FarmTrackr import apply creates contacts inside withRLSContext (keypilot_app).
-- Phase 2 grants (supabase) gave keypilot_app SELECT/UPDATE/DELETE on contacts but not INSERT,
-- assuming only the postgres visitor-signin path would insert. Add INSERT with the same
-- ownership rule as contacts_update_own (assignedToUserId = current session user).

GRANT INSERT ON public."contacts" TO keypilot_app;

DROP POLICY IF EXISTS contacts_insert_own ON public."contacts";

CREATE POLICY contacts_insert_own
  ON public."contacts" FOR INSERT TO keypilot_app
  WITH CHECK ("assignedToUserId" = app.current_user_id());
