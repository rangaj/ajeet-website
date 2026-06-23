-- Registration wizard: extended approve fields, registration-assets bucket, profile photo RLS

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('registration-assets', 'registration-assets', false, 524288, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY registration_assets_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'registration-assets'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY registration_assets_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'registration-assets'
    AND (
      is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY registration_assets_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'registration-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow pre-approval uploads to profile-photos under auth user id folder
DROP POLICY IF EXISTS profile_photos_insert ON storage.objects;
CREATE POLICY profile_photos_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
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

-- Approved alumni can view directory profile photos
DROP POLICY IF EXISTS profile_photos_select ON storage.objects;
CREATE POLICY profile_photos_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.profile_photo_path = name
        AND am.status = 'approved'
        AND am.is_directory_visible = true
      )
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.user_id = auth.uid()
        AND am.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE OR REPLACE FUNCTION approve_registration(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req approval_requests%ROWTYPE;
  member_id UUID;
  payload JSONB;
  house_value TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO req FROM approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status != 'pending_review' AND req.status != 'more_info_required' THEN
    RAISE EXCEPTION 'Request is not pending review';
  END IF;

  payload := req.submitted_payload;

  house_value := COALESCE(
    NULLIF(payload->>'house', ''),
    (
      SELECT string_agg(elem, ', ' ORDER BY elem)
      FROM jsonb_array_elements_text(payload->'houses') AS elem
    )
  );

  IF req.type = 'new_registration' THEN
    INSERT INTO alumni_members (
      roll_number, name, salutation, email, date_of_birth,
      course_start_year, course_end_year, house,
      mobile_phone, secondary_email, current_location, home_town,
      company, job_position, work_experience_years,
      professional_skills, industries_worked_in,
      profile_photo_path, status, user_id,
      registered, registered_at, approved_at, approved_by
    ) VALUES (
      req.roll_number,
      COALESCE(req.submitted_name, payload->>'name'),
      NULLIF(payload->>'salutation', ''),
      req.submitted_email,
      COALESCE(req.submitted_dob, NULLIF(payload->>'date_of_birth', ''))::date,
      (payload->>'course_start_year')::int,
      (payload->>'course_end_year')::int,
      house_value,
      COALESCE(req.submitted_phone, NULLIF(payload->>'mobile_phone', '')),
      NULLIF(payload->>'secondary_email', ''),
      NULLIF(payload->>'current_location', ''),
      NULLIF(payload->>'home_town', ''),
      NULLIF(payload->>'company', ''),
      NULLIF(payload->>'job_position', ''),
      NULLIF(payload->>'work_experience_years', '')::numeric,
      NULLIF(payload->>'professional_skills', ''),
      NULLIF(payload->>'industries_worked_in', ''),
      NULLIF(payload->>'profile_photo_path', ''),
      'approved',
      req.user_id,
      true,
      now(),
      now(),
      auth.uid()
    )
    ON CONFLICT (roll_number) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, alumni_members.name),
      salutation = COALESCE(EXCLUDED.salutation, alumni_members.salutation),
      email = COALESCE(EXCLUDED.email, alumni_members.email),
      date_of_birth = COALESCE(EXCLUDED.date_of_birth, alumni_members.date_of_birth),
      course_start_year = COALESCE(EXCLUDED.course_start_year, alumni_members.course_start_year),
      course_end_year = COALESCE(EXCLUDED.course_end_year, alumni_members.course_end_year),
      house = COALESCE(EXCLUDED.house, alumni_members.house),
      mobile_phone = COALESCE(EXCLUDED.mobile_phone, alumni_members.mobile_phone),
      secondary_email = COALESCE(EXCLUDED.secondary_email, alumni_members.secondary_email),
      current_location = COALESCE(EXCLUDED.current_location, alumni_members.current_location),
      home_town = COALESCE(EXCLUDED.home_town, alumni_members.home_town),
      company = COALESCE(EXCLUDED.company, alumni_members.company),
      job_position = COALESCE(EXCLUDED.job_position, alumni_members.job_position),
      work_experience_years = COALESCE(EXCLUDED.work_experience_years, alumni_members.work_experience_years),
      professional_skills = COALESCE(EXCLUDED.professional_skills, alumni_members.professional_skills),
      industries_worked_in = COALESCE(EXCLUDED.industries_worked_in, alumni_members.industries_worked_in),
      profile_photo_path = COALESCE(EXCLUDED.profile_photo_path, alumni_members.profile_photo_path),
      status = 'approved',
      user_id = COALESCE(req.user_id, alumni_members.user_id),
      approved_at = now(),
      approved_by = auth.uid()
    RETURNING id INTO member_id;
  ELSIF req.type IN ('claim', 'conflict') THEN
    UPDATE alumni_members SET
      status = 'approved',
      user_id = req.user_id,
      email = COALESCE(req.submitted_email, email),
      approved_at = now(),
      approved_by = auth.uid()
    WHERE id = req.alumni_member_id OR roll_number = req.roll_number
    RETURNING id INTO member_id;
  END IF;

  UPDATE approval_requests SET
    status = 'approved',
    reviewer_id = auth.uid(),
    reviewer_note = p_note,
    reviewed_at = now(),
    alumni_member_id = member_id,
    updated_at = now()
  WHERE id = p_request_id;

  IF req.user_id IS NOT NULL THEN
    UPDATE profiles SET member_status = 'approved', updated_at = now()
    WHERE id = req.user_id;
  END IF;

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'approve_registration', 'approval_requests', p_request_id,
    jsonb_build_object('type', req.type, 'roll_number', req.roll_number, 'note', p_note));

  RETURN member_id;
END;
$$;

-- Allow registrants to link their auth account to a pending registration
CREATE POLICY approval_link_self ON approval_requests
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND user_id IS NULL
    AND lower(submitted_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND type = 'new_registration'
    AND status IN ('pending_review', 'more_info_required')
  )
  WITH CHECK (user_id = auth.uid());

-- Allow registrants to attach a staging photo path to their own pending request
CREATE POLICY approval_update_own_photo ON approval_requests
  FOR UPDATE USING (
    auth.uid() = user_id
    AND type = 'new_registration'
    AND status IN ('pending_review', 'more_info_required')
  )
  WITH CHECK (
    auth.uid() = user_id
    AND type = 'new_registration'
    AND status IN ('pending_review', 'more_info_required')
  );
