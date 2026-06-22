-- Search RPC and admin workflow functions

CREATE OR REPLACE FUNCTION search_alumni(
  p_query TEXT DEFAULT NULL,
  p_course TEXT DEFAULT NULL,
  p_stream TEXT DEFAULT NULL,
  p_year_from INT DEFAULT NULL,
  p_year_to INT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_skills TEXT DEFAULT NULL,
  p_house TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 24,
  p_admin_mode BOOLEAN DEFAULT false
)
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
  v_offset INT;
  v_limit INT;
  v_viewer_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_viewer_id := auth.uid();
  v_is_admin := is_admin();

  IF NOT v_is_admin AND NOT is_approved_alumni() THEN
    RAISE EXCEPTION 'Directory access requires approved alumni or admin role';
  END IF;

  v_limit := LEAST(GREATEST(p_page_size, 1), 50);
  v_offset := (GREATEST(p_page, 1) - 1) * v_limit;

  IF p_query IS NOT NULL AND length(trim(p_query)) < 2
     AND p_course IS NULL AND p_stream IS NULL AND p_location IS NULL
     AND p_company IS NULL AND p_house IS NULL THEN
    RAISE EXCEPTION 'Provide at least 2 characters in search or one filter';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT am.*
    FROM alumni_members am
    WHERE
      (
        (p_admin_mode AND v_is_admin)
        OR (NOT p_admin_mode AND am.status = 'approved' AND am.is_directory_visible = true)
      )
    AND (p_course IS NULL OR am.course ILIKE p_course)
    AND (p_stream IS NULL OR am.stream ILIKE p_stream)
    AND (p_year_from IS NULL OR am.course_end_year >= p_year_from)
    AND (p_year_to IS NULL OR am.course_end_year <= p_year_to)
    AND (p_location IS NULL OR am.current_location ILIKE '%' || p_location || '%'
         OR am.home_town ILIKE '%' || p_location || '%')
    AND (p_company IS NULL OR am.company ILIKE '%' || p_company || '%')
    AND (p_industry IS NULL OR am.industries_worked_in ILIKE '%' || p_industry || '%')
    AND (p_skills IS NULL OR am.professional_skills ILIKE '%' || p_skills || '%')
    AND (p_house IS NULL OR am.house ILIKE p_house)
    AND (
      p_query IS NULL OR trim(p_query) = ''
      OR am.roll_number ILIKE trim(p_query)
      OR am.search_vector @@ plainto_tsquery('english', trim(p_query))
      OR am.name ILIKE '%' || trim(p_query) || '%'
    )
    ORDER BY
      CASE WHEN p_query IS NOT NULL AND am.roll_number ILIKE trim(p_query) THEN 0 ELSE 1 END,
      am.name
    OFFSET v_offset
    LIMIT v_limit + 1
  ),
  page_rows AS (
    SELECT * FROM filtered LIMIT v_limit
  )
  SELECT
    pr.id,
    pr.roll_number,
    pr.name,
    pr.salutation,
    pr.course,
    pr.stream,
    pr.course_start_year,
    pr.course_end_year,
    pr.company,
    pr.job_position,
    pr.current_location,
    pr.home_town,
    pr.house,
    pr.professional_skills,
    pr.industries_worked_in,
    pr.profile_photo_path,
    CASE WHEN can_view_sensitive_field(pr, 'show_email') THEN pr.email ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_secondary_email') THEN pr.secondary_email ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_phone') THEN pr.mobile_phone ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_dob') THEN pr.date_of_birth ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_address') THEN pr.correspondence_address ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_social_links') THEN pr.facebook_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_social_links') THEN pr.linkedin_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_social_links') THEN pr.twitter_link ELSE NULL END,
    CASE WHEN can_view_sensitive_field(pr, 'show_social_links') THEN pr.website_link ELSE NULL END,
    pr.visibility_settings,
    pr.status,
    pr.is_directory_visible,
    (SELECT count(*) > v_limit FROM filtered) AS has_more
  FROM page_rows pr;
END;
$$;

CREATE OR REPLACE FUNCTION lookup_roll_number(p_roll_number TEXT)
RETURNS TABLE (
  found BOOLEAN,
  status alumni_status,
  can_claim BOOLEAN,
  member_id UUID,
  name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec alumni_members%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM alumni_members WHERE roll_number = trim(p_roll_number);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::alumni_status, false, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Only expose minimal info to non-admins (no email/phone leak)
  IF NOT is_admin() THEN
    RETURN QUERY SELECT
      true,
      rec.status,
      rec.status = 'imported_unclaimed' AND rec.user_id IS NULL,
      rec.id,
      rec.name;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    rec.status,
    rec.status = 'imported_unclaimed',
    rec.id,
    rec.name;
END;
$$;

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

  IF req.type = 'new_registration' THEN
    INSERT INTO alumni_members (
      roll_number, name, email, course, stream, course_start_year, course_end_year,
      mobile_phone, company, job_position, current_location, house, status, user_id,
      registered, registered_at, approved_at, approved_by
    ) VALUES (
      req.roll_number,
      COALESCE(req.submitted_name, payload->>'name'),
      req.submitted_email,
      payload->>'course',
      payload->>'stream',
      (payload->>'course_start_year')::int,
      (payload->>'course_end_year')::int,
      req.submitted_phone,
      payload->>'company',
      payload->>'job_position',
      payload->>'current_location',
      payload->>'house',
      'approved',
      req.user_id,
      true,
      now(),
      now(),
      auth.uid()
    )
    ON CONFLICT (roll_number) DO UPDATE SET
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

CREATE OR REPLACE FUNCTION reject_registration(
  p_request_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req approval_requests%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT * INTO req FROM approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  UPDATE approval_requests SET
    status = 'rejected',
    reviewer_id = auth.uid(),
    reviewer_note = p_note,
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'reject_registration', 'approval_requests', p_request_id,
    jsonb_build_object('note', p_note));
END;
$$;

GRANT EXECUTE ON FUNCTION search_alumni TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_roll_number TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_roll_number TO anon;
GRANT EXECUTE ON FUNCTION approve_registration TO authenticated;
GRANT EXECUTE ON FUNCTION reject_registration TO authenticated;
