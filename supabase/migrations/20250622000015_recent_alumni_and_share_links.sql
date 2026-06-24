-- Recent alumni listing + rotatable public share links

CREATE TYPE share_link_type AS ENUM ('contact', 'network');

CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_member_id UUID NOT NULL REFERENCES alumni_members(id) ON DELETE CASCADE,
  link_type share_link_type NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumni_member_id, link_type)
);

CREATE INDEX idx_share_links_token ON share_links(token);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY share_links_select_own ON share_links
  FOR SELECT USING (
    alumni_member_id IN (
      SELECT id FROM alumni_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY share_links_insert_own ON share_links
  FOR INSERT WITH CHECK (
    alumni_member_id IN (
      SELECT id FROM alumni_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY share_links_update_own ON share_links
  FOR UPDATE USING (
    alumni_member_id IN (
      SELECT id FROM alumni_members WHERE user_id = auth.uid()
    )
  );

-- Recently approved visible alumni (directory browse)
CREATE OR REPLACE FUNCTION list_recent_alumni(p_limit INT DEFAULT 10)
RETURNS TABLE (
  id UUID,
  roll_number TEXT,
  name TEXT,
  salutation TEXT,
  course TEXT,
  stream TEXT,
  course_start_year INT,
  course_end_year INT,
  company TEXT,
  job_position TEXT,
  current_location TEXT,
  home_town TEXT,
  house TEXT,
  professional_skills TEXT,
  industries_worked_in TEXT,
  profile_photo_path TEXT,
  email TEXT,
  secondary_email TEXT,
  mobile_phone TEXT,
  date_of_birth DATE,
  correspondence_address TEXT,
  facebook_link TEXT,
  linkedin_link TEXT,
  twitter_link TEXT,
  website_link TEXT,
  visibility_settings JSONB,
  status alumni_status,
  is_directory_visible BOOLEAN,
  has_more BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INT;
BEGIN
  IF NOT is_admin() AND NOT is_approved_alumni() THEN
    RAISE EXCEPTION 'Directory access requires approved alumni or admin role';
  END IF;

  v_limit := LEAST(GREATEST(p_limit, 1), 24);

  RETURN QUERY
  SELECT
    am.id,
    am.roll_number,
    am.name,
    am.salutation,
    am.course,
    am.stream,
    am.course_start_year,
    am.course_end_year,
    am.company,
    am.job_position,
    am.current_location,
    am.home_town,
    am.house,
    am.professional_skills,
    am.industries_worked_in,
    am.profile_photo_path,
    CASE WHEN can_view_sensitive_field(am, 'show_email') THEN am.email ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_secondary_email') THEN am.secondary_email ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_phone') THEN am.mobile_phone ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_dob') THEN am.date_of_birth ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_address') THEN am.correspondence_address ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_social_links') THEN am.facebook_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_social_links') THEN am.linkedin_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_social_links') THEN am.twitter_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(am, 'show_social_links') THEN am.website_link ELSE NULL END,
    am.visibility_settings,
    am.status,
    am.is_directory_visible,
    false AS has_more
  FROM alumni_members am
  WHERE am.status = 'approved'
    AND am.is_directory_visible = true
    AND am.approved_at IS NOT NULL
  ORDER BY am.approved_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION list_recent_alumni(INT) TO authenticated;

-- Public share card payload (anon + authenticated)
CREATE OR REPLACE FUNCTION get_public_share_card(p_token TEXT)
RETURNS TABLE (
  link_type share_link_type,
  name TEXT,
  roll_number TEXT,
  house TEXT,
  course_end_year INT,
  job_position TEXT,
  company TEXT,
  current_location TEXT,
  has_photo BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.link_type,
    am.name,
    am.roll_number,
    am.house,
    am.course_end_year,
    am.job_position,
    am.company,
    am.current_location,
    (am.profile_photo_path IS NOT NULL AND am.profile_photo_path <> '') AS has_photo
  FROM share_links sl
  JOIN alumni_members am ON am.id = sl.alumni_member_id
  WHERE sl.token = trim(p_token)
    AND am.status = 'approved';
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_share_card(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_or_create_share_link(p_link_type share_link_type)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_token TEXT;
BEGIN
  SELECT id INTO v_member_id
  FROM alumni_members
  WHERE user_id = auth.uid() AND status = 'approved';

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Approved alumni profile required to create share links';
  END IF;

  INSERT INTO share_links (alumni_member_id, link_type)
  VALUES (v_member_id, p_link_type)
  ON CONFLICT (alumni_member_id, link_type)
  DO UPDATE SET updated_at = now()
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_share_link(share_link_type) TO authenticated;

CREATE OR REPLACE FUNCTION regenerate_share_link(p_link_type share_link_type)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_token TEXT;
BEGIN
  SELECT id INTO v_member_id
  FROM alumni_members
  WHERE user_id = auth.uid() AND status = 'approved';

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Approved alumni profile required';
  END IF;

  v_token := encode(gen_random_bytes(18), 'hex');

  UPDATE share_links
  SET token = v_token, updated_at = now()
  WHERE alumni_member_id = v_member_id AND link_type = p_link_type;

  IF NOT FOUND THEN
    INSERT INTO share_links (alumni_member_id, link_type, token)
    VALUES (v_member_id, p_link_type, v_token)
    RETURNING token INTO v_token;
  END IF;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION regenerate_share_link(share_link_type) TO authenticated;
