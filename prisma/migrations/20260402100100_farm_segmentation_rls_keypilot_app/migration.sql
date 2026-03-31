-- RLS + grants for FarmTrackr segmentation tables (keypilot_app).

ALTER TABLE public."farm_territories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farm_territories_select_own ON public."farm_territories";
DROP POLICY IF EXISTS farm_territories_insert_own ON public."farm_territories";
DROP POLICY IF EXISTS farm_territories_update_own ON public."farm_territories";
DROP POLICY IF EXISTS farm_territories_delete_own ON public."farm_territories";

CREATE POLICY farm_territories_select_own
  ON public."farm_territories" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY farm_territories_insert_own
  ON public."farm_territories" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_territories_update_own
  ON public."farm_territories" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_territories_delete_own
  ON public."farm_territories" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."farm_territories" TO keypilot_app;

-- farm_areas: direct userId ownership (denormalized from parent territory)

ALTER TABLE public."farm_areas" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farm_areas_select_own ON public."farm_areas";
DROP POLICY IF EXISTS farm_areas_insert_own ON public."farm_areas";
DROP POLICY IF EXISTS farm_areas_update_own ON public."farm_areas";
DROP POLICY IF EXISTS farm_areas_delete_own ON public."farm_areas";

CREATE POLICY farm_areas_select_own
  ON public."farm_areas" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY farm_areas_insert_own
  ON public."farm_areas" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_areas_update_own
  ON public."farm_areas" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY farm_areas_delete_own
  ON public."farm_areas" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."farm_areas" TO keypilot_app;

-- contact_farm_memberships: owning agent rows (contact remains global; app enforces contact access)

ALTER TABLE public."contact_farm_memberships" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_farm_memberships_select_own ON public."contact_farm_memberships";
DROP POLICY IF EXISTS contact_farm_memberships_insert_own ON public."contact_farm_memberships";
DROP POLICY IF EXISTS contact_farm_memberships_update_own ON public."contact_farm_memberships";
DROP POLICY IF EXISTS contact_farm_memberships_delete_own ON public."contact_farm_memberships";

CREATE POLICY contact_farm_memberships_select_own
  ON public."contact_farm_memberships" FOR SELECT TO keypilot_app
  USING ("userId" = app.current_user_id());

CREATE POLICY contact_farm_memberships_insert_own
  ON public."contact_farm_memberships" FOR INSERT TO keypilot_app
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY contact_farm_memberships_update_own
  ON public."contact_farm_memberships" FOR UPDATE TO keypilot_app
  USING ("userId" = app.current_user_id())
  WITH CHECK ("userId" = app.current_user_id());

CREATE POLICY contact_farm_memberships_delete_own
  ON public."contact_farm_memberships" FOR DELETE TO keypilot_app
  USING ("userId" = app.current_user_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public."contact_farm_memberships" TO keypilot_app;
