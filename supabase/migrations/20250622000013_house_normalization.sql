-- House normalization: canonical storage, lenient search, backfill existing rows.

-- ---------------------------------------------------------------------------
-- Resolve a single house token (abbreviation, alias, or partial) to canonical
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_house_token(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT;
  c TEXT;
BEGIN
  t := trim(regexp_replace(trim(coalesce(p_token, '')), '\s+house$', '', 'i'));
  IF t = '' THEN RETURN NULL; END IF;

  -- Canonical names (display order)
  FOREACH c IN ARRAY ARRAY[
    'Adilshahi', 'Chalukya', 'Hoysala', 'Rashtrakoota',
    'Vijayanagar', 'Wodeyar', 'Rani Channamma'
  ] LOOP
    IF lower(t) = lower(c) THEN RETURN c; END IF;
    IF length(t) >= 3 AND lower(c) LIKE lower(t) || '%' THEN RETURN c; END IF;
    IF position(lower(c) IN lower(t)) > 0 THEN RETURN c; END IF;
  END LOOP;

  -- Abbreviations and aliases
  IF upper(t) IN ('ADL', 'ADI') THEN RETURN 'Adilshahi'; END IF;
  IF upper(t) IN ('CHA', 'CHL', 'CHU') THEN RETURN 'Chalukya'; END IF;
  IF upper(t) = 'HOY' THEN RETURN 'Hoysala'; END IF;
  IF upper(t) = 'RAS' THEN RETURN 'Rashtrakoota'; END IF;
  IF upper(t) = 'VIJ' THEN RETURN 'Vijayanagar'; END IF;
  IF upper(t) = 'WOD' THEN RETURN 'Wodeyar'; END IF;
  IF upper(t) IN ('RAN', 'RCM') THEN RETURN 'Rani Channamma'; END IF;

  IF upper(t) IN ('ADIL SHAHI', 'ADILSHAHI') THEN RETURN 'Adilshahi'; END IF;
  IF upper(t) IN ('RANI CHENAMMA', 'CHENAMMA', 'CHANNAMMA') THEN RETURN 'Rani Channamma'; END IF;
  IF upper(t) = 'RASHTHRAKOOTA' OR upper(t) = 'RASHTHRAKUTA' THEN RETURN 'Rashtrakoota'; END IF;
  IF upper(t) = 'VIJAYNAGAR' THEN RETURN 'Vijayanagar'; END IF;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- Normalize comma / pipe / dash separated house field to canonical CSV
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_houses_string(p_house TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw TEXT;
  segment TEXT;
  piece TEXT;
  resolved TEXT;
  results TEXT[] := ARRAY[]::TEXT[];
  canonical_order TEXT[] := ARRAY[
    'Adilshahi', 'Chalukya', 'Hoysala', 'Rashtrakoota',
    'Vijayanagar', 'Wodeyar', 'Rani Channamma'
  ];
  c TEXT;
BEGIN
  raw := trim(coalesce(p_house, ''));
  IF raw = '' THEN RETURN NULL; END IF;

  FOREACH segment IN ARRAY regexp_split_to_array(raw, '\s*[,|]\s*') LOOP
    FOREACH piece IN ARRAY regexp_split_to_array(segment, '\s*-\s*') LOOP
      resolved := resolve_house_token(piece);
      IF resolved IS NOT NULL AND NOT resolved = ANY(results) THEN
        results := array_append(results, resolved);
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(results, 1) IS NULL THEN
    RETURN raw;
  END IF;

  RETURN array_to_string(
    ARRAY(
      SELECT c FROM unnest(canonical_order) AS c
      WHERE c = ANY(results)
    ),
    ', '
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Match stored house value against a canonical filter (browse chips)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION alumni_matches_canonical_house(p_stored TEXT, p_canonical TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF p_stored IS NULL OR p_canonical IS NULL THEN RETURN FALSE; END IF;
  normalized := normalize_houses_string(p_stored);
  IF normalized IS NULL THEN
    RETURN p_stored ILIKE '%' || p_canonical || '%';
  END IF;
  RETURN position(p_canonical IN normalized) > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- Match free-text query against house field (abbreviations, partial names)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION house_query_matches(p_stored TEXT, p_query TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  q TEXT;
  resolved TEXT;
  c TEXT;
BEGIN
  IF p_stored IS NULL THEN RETURN FALSE; END IF;
  q := trim(coalesce(p_query, ''));
  IF length(q) < 2 THEN RETURN FALSE; END IF;

  resolved := resolve_house_token(q);
  IF resolved IS NOT NULL THEN
    RETURN alumni_matches_canonical_house(p_stored, resolved);
  END IF;

  FOREACH c IN ARRAY ARRAY[
    'Adilshahi', 'Chalukya', 'Hoysala', 'Rashtrakoota',
    'Vijayanagar', 'Wodeyar', 'Rani Channamma'
  ] LOOP
    IF length(q) >= 3 AND lower(c) LIKE lower(q) || '%' THEN
      IF alumni_matches_canonical_house(p_stored, c) THEN RETURN TRUE; END IF;
    END IF;
  END LOOP;

  RETURN p_stored ILIKE '%' || q || '%';
END;
$$;

-- ---------------------------------------------------------------------------
-- Auto-normalize on write
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION alumni_members_normalize_house()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.house IS NOT NULL AND trim(NEW.house) <> '' THEN
    NEW.house := normalize_houses_string(NEW.house);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS alumni_members_normalize_house_trigger ON alumni_members;
CREATE TRIGGER alumni_members_normalize_house_trigger
  BEFORE INSERT OR UPDATE OF house ON alumni_members
  FOR EACH ROW EXECUTE FUNCTION alumni_members_normalize_house();

-- Backfill existing rows
UPDATE alumni_members
SET house = normalize_houses_string(house)
WHERE house IS NOT NULL AND trim(house) <> '';

-- Enrich search vector with canonical house names for better discovery
CREATE OR REPLACE FUNCTION alumni_members_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.house IS NOT NULL AND trim(NEW.house) <> '' THEN
    NEW.house := normalize_houses_string(NEW.house);
  END IF;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.roll_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.job_position, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.professional_skills, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.industries_worked_in, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.roles_played, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.house, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.current_location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.home_town, '')), 'C');
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND (
    NEW.name IS DISTINCT FROM OLD.name OR
    NEW.company IS DISTINCT FROM OLD.company OR
    NEW.job_position IS DISTINCT FROM OLD.job_position OR
    NEW.professional_skills IS DISTINCT FROM OLD.professional_skills
  ) THEN
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rebuild search vectors after backfill
UPDATE alumni_members SET house = house WHERE house IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Lenient house matching in directory search
-- ---------------------------------------------------------------------------
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
    AND (p_house IS NULL OR alumni_matches_canonical_house(am.house, p_house))
    AND (
      p_query IS NULL OR trim(p_query) = ''
      OR am.roll_number ILIKE trim(p_query)
      OR am.search_vector @@ plainto_tsquery('english', trim(p_query))
      OR am.name ILIKE '%' || trim(p_query) || '%'
      OR house_query_matches(am.house, trim(p_query))
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

-- Normalize house on approval from registration payload
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
