-- Consolidated profile-photo storage access + share-link/admin fixes

CREATE OR REPLACE FUNCTION user_owns_profile_photo_object(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    is_admin()
    OR auth.uid()::text = lower(split_part(object_name, '/', 1))
    OR EXISTS (
      SELECT 1
      FROM alumni_members am
      WHERE am.user_id = auth.uid()
        AND lower(am.id::text) = lower(split_part(object_name, '/', 1))
    );
$$;

GRANT EXECUTE ON FUNCTION user_owns_profile_photo_object(TEXT) TO authenticated, anon;

DROP POLICY IF EXISTS profile_photos_insert ON storage.objects;
DROP POLICY IF EXISTS profile_photos_select ON storage.objects;
DROP POLICY IF EXISTS profile_photos_update ON storage.objects;
DROP POLICY IF EXISTS profile_photos_delete ON storage.objects;

CREATE POLICY profile_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND user_owns_profile_photo_object(name)
  );

CREATE POLICY profile_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND user_owns_profile_photo_object(name)
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND user_owns_profile_photo_object(name)
  );

CREATE POLICY profile_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND user_owns_profile_photo_object(name)
  );

CREATE POLICY profile_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR user_owns_profile_photo_object(name)
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.profile_photo_path = name
          AND am.status = 'approved'
          AND am.is_directory_visible = true
      )
    )
  );

-- share_links: allow admins + clearer insert/update checks
DROP POLICY IF EXISTS share_links_insert_own ON share_links;
DROP POLICY IF EXISTS share_links_update_own ON share_links;
DROP POLICY IF EXISTS share_links_select_own ON share_links;

CREATE POLICY share_links_select_own ON share_links
  FOR SELECT TO authenticated
  USING (
    alumni_member_id IN (SELECT id FROM alumni_members WHERE user_id = auth.uid())
    OR is_admin()
  );

CREATE POLICY share_links_insert_own ON share_links
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alumni_members am
      WHERE am.id = alumni_member_id
        AND am.user_id = auth.uid()
        AND (am.status = 'approved' OR is_admin())
    )
  );

CREATE POLICY share_links_update_own ON share_links
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM alumni_members am
      WHERE am.id = alumni_member_id
        AND am.user_id = auth.uid()
    )
    OR is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM alumni_members am
      WHERE am.id = alumni_member_id
        AND am.user_id = auth.uid()
    )
    OR is_admin()
  );

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
  WHERE user_id = auth.uid()
  ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'No alumni profile linked to this account';
  END IF;

  IF NOT is_admin() AND NOT EXISTS (
    SELECT 1 FROM alumni_members WHERE id = v_member_id AND status = 'approved'
  ) THEN
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
  WHERE user_id = auth.uid()
  ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'No alumni profile linked to this account';
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

CREATE OR REPLACE FUNCTION update_own_alumni_profile(
  p_company TEXT DEFAULT NULL,
  p_job_position TEXT DEFAULT NULL,
  p_current_location TEXT DEFAULT NULL,
  p_mobile_phone TEXT DEFAULT NULL,
  p_secondary_email TEXT DEFAULT NULL,
  p_professional_skills TEXT DEFAULT NULL,
  p_industries_worked_in TEXT DEFAULT NULL,
  p_linkedin_link TEXT DEFAULT NULL,
  p_facebook_link TEXT DEFAULT NULL,
  p_twitter_link TEXT DEFAULT NULL,
  p_website_link TEXT DEFAULT NULL,
  p_is_directory_visible BOOLEAN DEFAULT NULL,
  p_visibility_settings JSONB DEFAULT NULL,
  p_profile_photo_path TEXT DEFAULT NULL,
  p_clear_profile_photo BOOLEAN DEFAULT false
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT id INTO v_member_id
  FROM alumni_members
  WHERE user_id = auth.uid()
  ORDER BY CASE WHEN status = 'approved' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'No alumni profile linked to this account';
  END IF;

  IF NOT is_admin() AND NOT EXISTS (
    SELECT 1 FROM alumni_members WHERE id = v_member_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Approved alumni profile required to update profile';
  END IF;

  UPDATE alumni_members
  SET
    company = COALESCE(p_company, company),
    job_position = COALESCE(p_job_position, job_position),
    current_location = COALESCE(p_current_location, current_location),
    mobile_phone = COALESCE(p_mobile_phone, mobile_phone),
    secondary_email = COALESCE(p_secondary_email, secondary_email),
    professional_skills = COALESCE(p_professional_skills, professional_skills),
    industries_worked_in = COALESCE(p_industries_worked_in, industries_worked_in),
    linkedin_link = COALESCE(p_linkedin_link, linkedin_link),
    facebook_link = COALESCE(p_facebook_link, facebook_link),
    twitter_link = COALESCE(p_twitter_link, twitter_link),
    website_link = COALESCE(p_website_link, website_link),
    is_directory_visible = COALESCE(p_is_directory_visible, is_directory_visible),
    visibility_settings = COALESCE(p_visibility_settings, visibility_settings),
    profile_photo_path = CASE
      WHEN p_clear_profile_photo THEN NULL
      WHEN p_profile_photo_path IS NOT NULL THEN p_profile_photo_path
      ELSE profile_photo_path
    END,
    updated_at = now()
  WHERE id = v_member_id
    AND (user_id = auth.uid() OR is_admin());

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_alumni_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, BOOLEAN
) TO authenticated;
