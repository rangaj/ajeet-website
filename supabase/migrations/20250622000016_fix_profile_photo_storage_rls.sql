-- Profile photo storage: allow upsert under member-id paths (not only auth.uid() folder)

DROP POLICY IF EXISTS profile_photos_update ON storage.objects;

CREATE POLICY profile_photos_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.user_id = auth.uid()
          AND am.id::text = (storage.foldername(name))[1]
      )
    )
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.user_id = auth.uid()
          AND am.id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS profile_photos_delete ON storage.objects;

CREATE POLICY profile_photos_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.user_id = auth.uid()
          AND am.id::text = (storage.foldername(name))[1]
      )
    )
  );

-- Approved alumni can update their own directory profile fields (explicit allow-list)
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
  p_profile_photo_path TEXT DEFAULT NULL
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
  WHERE user_id = auth.uid() AND status = 'approved';

  IF v_member_id IS NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'No approved alumni profile linked to this account';
  END IF;

  IF v_member_id IS NULL AND is_admin() THEN
    SELECT id INTO v_member_id
    FROM alumni_members
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'No alumni profile linked to this account';
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
    profile_photo_path = COALESCE(p_profile_photo_path, profile_photo_path),
    updated_at = now()
  WHERE id = v_member_id
    AND (user_id = auth.uid() OR is_admin());

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_alumni_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT
) TO authenticated;
