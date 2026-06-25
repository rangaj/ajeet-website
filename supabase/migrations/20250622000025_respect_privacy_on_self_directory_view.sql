-- Directory contact fields should respect visibility_settings even when viewing your own card.

CREATE OR REPLACE FUNCTION can_view_sensitive_field(
  target_member alumni_members,
  field_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  vis JSONB;
BEGIN
  IF is_admin() THEN
    RETURN true;
  END IF;

  vis := target_member.visibility_settings;
  RETURN COALESCE((vis ->> field_key)::boolean, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
