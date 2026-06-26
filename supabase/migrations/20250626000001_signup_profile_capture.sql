-- Sign-up & profile improvements (Phase 1 backend).
-- 1. approve_registration now maps the new sign-up payload fields onto the member
--    record: social links, directory-visibility consent, and "Get Involved" interest.
--    (Mentoring interest is intentionally NOT mapped to open_to_mentorship, since that
--     requires a mentorship blurb + visibility; it stays in submitted_payload for admins.)
-- 2. New update_own_join_year RPC lets an approved member self-correct their join year.
--
-- Recreated verbatim from 20250622000013_house_normalization.sql with additive columns only.

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
  resolved_user_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO req FROM approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status != 'pending_review' AND req.status != 'more_info_required' THEN
    RAISE EXCEPTION 'Request is not pending review';
  END IF;

  resolved_user_id := req.user_id;
  IF resolved_user_id IS NULL AND nullif(trim(req.submitted_email), '') IS NOT NULL THEN
    SELECT u.id INTO resolved_user_id
    FROM auth.users u
    WHERE lower(trim(u.email)) = lower(trim(req.submitted_email))
    LIMIT 1;
  END IF;

  payload := req.submitted_payload;

  house_value := normalize_houses_string(
    COALESCE(
      NULLIF(payload->>'house', ''),
      (
        SELECT string_agg(elem, ', ' ORDER BY elem)
        FROM jsonb_array_elements_text(payload->'houses') AS elem
      )
    )
  );

  IF req.type = 'new_registration' THEN
    INSERT INTO alumni_members (
      roll_number, name, salutation, email, date_of_birth,
      course_start_year, course_end_year, house,
      mobile_phone, secondary_email, current_location, home_town,
      company, job_position, work_experience_years,
      professional_skills, industries_worked_in,
      linkedin_link, twitter_link, website_link,
      is_directory_visible,
      get_involved_wants_to_participate, get_involved_updated_at,
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
      NULLIF(payload->>'linkedin_link', ''),
      NULLIF(payload->>'twitter_link', ''),
      NULLIF(payload->>'website_link', ''),
      COALESCE((payload->>'is_directory_visible')::boolean, true),
      COALESCE((payload->>'interested_in_get_involved')::boolean, false),
      CASE WHEN COALESCE((payload->>'interested_in_get_involved')::boolean, false) THEN now() ELSE NULL END,
      NULLIF(payload->>'profile_photo_path', ''),
      'approved',
      resolved_user_id,
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
      linkedin_link = COALESCE(EXCLUDED.linkedin_link, alumni_members.linkedin_link),
      twitter_link = COALESCE(EXCLUDED.twitter_link, alumni_members.twitter_link),
      website_link = COALESCE(EXCLUDED.website_link, alumni_members.website_link),
      is_directory_visible = EXCLUDED.is_directory_visible,
      get_involved_wants_to_participate = EXCLUDED.get_involved_wants_to_participate,
      get_involved_updated_at = COALESCE(EXCLUDED.get_involved_updated_at, alumni_members.get_involved_updated_at),
      profile_photo_path = COALESCE(EXCLUDED.profile_photo_path, alumni_members.profile_photo_path),
      status = 'approved',
      user_id = COALESCE(resolved_user_id, alumni_members.user_id),
      approved_at = now(),
      approved_by = auth.uid()
    RETURNING id INTO member_id;
  ELSIF req.type IN ('claim', 'conflict') THEN
    UPDATE alumni_members SET
      status = 'approved',
      user_id = COALESCE(resolved_user_id, user_id),
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
    user_id = COALESCE(resolved_user_id, user_id),
    updated_at = now()
  WHERE id = p_request_id;

  IF resolved_user_id IS NOT NULL THEN
    UPDATE profiles SET member_status = 'approved', updated_at = now()
    WHERE id = resolved_user_id;
  END IF;

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'approve_registration', 'approval_requests', p_request_id,
    jsonb_build_object(
      'type', req.type,
      'roll_number', req.roll_number,
      'note', p_note,
      'linked_user_id', resolved_user_id
    ));

  RETURN member_id;
END;
$$;

-- Self-service join-year correction for approved members.
CREATE OR REPLACE FUNCTION update_own_join_year(p_course_start_year INT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_end INT;
BEGIN
  SELECT id, course_end_year INTO v_member_id, v_end
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

  IF p_course_start_year IS NOT NULL THEN
    IF p_course_start_year < 1955 OR p_course_start_year > 2030 THEN
      RAISE EXCEPTION 'Enter a valid join year';
    END IF;
    IF v_end IS NOT NULL AND p_course_start_year > v_end THEN
      RAISE EXCEPTION 'Join year cannot be after the passing-out year';
    END IF;
  END IF;

  UPDATE alumni_members
  SET course_start_year = p_course_start_year,
      updated_at = now()
  WHERE id = v_member_id
    AND (user_id = auth.uid() OR is_admin());

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_join_year(INT) TO authenticated;
