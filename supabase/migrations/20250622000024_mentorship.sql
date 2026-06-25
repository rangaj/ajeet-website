-- Mentorship opt-in, paid external booking links, directory filter.

ALTER TABLE alumni_members
  ADD COLUMN IF NOT EXISTS open_to_mentorship BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mentorship_blurb TEXT,
  ADD COLUMN IF NOT EXISTS paid_session_links JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE alumni_members
  ADD CONSTRAINT alumni_members_mentorship_blurb_length
  CHECK (mentorship_blurb IS NULL OR char_length(mentorship_blurb) <= 500);

ALTER TABLE alumni_members
  ADD CONSTRAINT alumni_members_paid_session_links_array
  CHECK (jsonb_typeof(paid_session_links) = 'array' AND jsonb_array_length(paid_session_links) <= 3);

CREATE OR REPLACE FUNCTION is_mentor_booking_hostname(p_host TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT lower(btrim(p_host)) IN (
    'topmate.io',
    'www.topmate.io',
    'cal.com',
    'www.cal.com',
    'calendly.com',
    'www.calendly.com',
    'mentorcruise.com',
    'www.mentorcruise.com',
    'superpeer.com',
    'www.superpeer.com',
    'intro.co',
    'www.intro.co',
    'adplist.org',
    'www.adplist.org',
    'linkedin.com',
    'www.linkedin.com'
  );
$$;

CREATE OR REPLACE FUNCTION mentor_booking_url_host(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_url TEXT;
  v_host TEXT;
BEGIN
  v_url := lower(btrim(p_url));
  IF v_url = '' THEN
    RETURN NULL;
  END IF;

  IF v_url LIKE 'http://%' THEN
    v_url := 'https://' || substring(v_url FROM 8);
  ELSIF v_url NOT LIKE 'https://%' THEN
    RETURN NULL;
  END IF;

  v_host := substring(v_url FROM '^https://([^/:]+)');
  IF v_host IS NULL OR NOT is_mentor_booking_hostname(v_host) THEN
    RETURN NULL;
  END IF;

  RETURN v_host;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_mentor_booking_url(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  v_url TEXT;
  v_host TEXT;
BEGIN
  v_url := lower(btrim(p_url));
  IF v_url = '' THEN
    RETURN NULL;
  END IF;

  IF v_url LIKE 'http://%' THEN
    v_url := 'https://' || substring(v_url FROM 8);
  ELSIF v_url NOT LIKE 'https://%' THEN
    RETURN NULL;
  END IF;

  v_url := regexp_replace(v_url, '/+$', '');
  v_host := mentor_booking_url_host(v_url);
  IF v_host IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION validate_mentorship_paid_links(p_links JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_len INT;
  v_item JSONB;
  v_url TEXT;
  v_norm TEXT;
  v_host TEXT;
  v_hosts TEXT[] := ARRAY[]::TEXT[];
  i INT;
BEGIN
  IF p_links IS NULL THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_links) <> 'array' THEN
    RAISE EXCEPTION 'Paid session links must be an array';
  END IF;

  v_len := jsonb_array_length(p_links);
  IF v_len > 3 THEN
    RAISE EXCEPTION 'At most 3 paid session links are allowed';
  END IF;

  FOR i IN 0..v_len - 1 LOOP
    v_item := p_links -> i;
    v_url := v_item ->> 'url';
    IF v_url IS NULL OR btrim(v_url) = '' THEN
      RAISE EXCEPTION 'Each paid session link must include a URL';
    END IF;

    v_norm := normalize_mentor_booking_url(v_url);
    IF v_norm IS NULL THEN
      RAISE EXCEPTION 'Paid session URLs must use HTTPS and a supported booking platform';
    END IF;

    v_host := mentor_booking_url_host(v_norm);
    IF v_host = ANY (v_hosts) THEN
      RAISE EXCEPTION 'Duplicate booking platform links are not allowed';
    END IF;
    v_hosts := array_append(v_hosts, v_host);
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS update_own_alumni_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, BOOLEAN
);

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
  p_clear_profile_photo BOOLEAN DEFAULT false,
  p_open_to_mentorship BOOLEAN DEFAULT NULL,
  p_mentorship_blurb TEXT DEFAULT NULL,
  p_paid_session_links JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_row alumni_members%ROWTYPE;
  v_open BOOLEAN;
  v_visible BOOLEAN;
  v_blurb TEXT;
  v_links JSONB;
  v_norm_links JSONB := '[]'::jsonb;
  v_len INT;
  v_norm TEXT;
  i INT;
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

  SELECT * INTO v_row FROM alumni_members WHERE id = v_member_id;

  v_open := COALESCE(p_open_to_mentorship, v_row.open_to_mentorship);
  v_visible := COALESCE(p_is_directory_visible, v_row.is_directory_visible);
  v_blurb := CASE WHEN p_mentorship_blurb IS NOT NULL THEN p_mentorship_blurb ELSE v_row.mentorship_blurb END;
  v_links := COALESCE(p_paid_session_links, v_row.paid_session_links);

  IF p_open_to_mentorship IS TRUE AND NOT v_visible THEN
    RAISE EXCEPTION 'Enable directory visibility before offering mentorship';
  END IF;

  IF v_open THEN
    IF btrim(coalesce(v_blurb, '')) = '' THEN
      RAISE EXCEPTION 'Describe your mentorship expertise and how fellow Ajeets can reach you';
    END IF;
    IF char_length(v_blurb) > 500 THEN
      RAISE EXCEPTION 'Mentorship description must be 500 characters or less';
    END IF;
  END IF;

  PERFORM validate_mentorship_paid_links(v_links);

  v_len := jsonb_array_length(v_links);
  IF v_len > 0 THEN
    FOR i IN 0..v_len - 1 LOOP
      v_norm := normalize_mentor_booking_url(v_links -> i ->> 'url');
      v_norm_links := v_norm_links || jsonb_build_array(jsonb_build_object('url', v_norm));
    END LOOP;
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
    open_to_mentorship = COALESCE(p_open_to_mentorship, open_to_mentorship),
    mentorship_blurb = CASE WHEN p_mentorship_blurb IS NOT NULL THEN NULLIF(btrim(p_mentorship_blurb), '') ELSE mentorship_blurb END,
    paid_session_links = CASE WHEN p_paid_session_links IS NOT NULL THEN v_norm_links ELSE paid_session_links END,
    updated_at = now()
  WHERE id = v_member_id
    AND (user_id = auth.uid() OR is_admin());

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_alumni_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT, BOOLEAN, BOOLEAN, TEXT, JSONB
) TO authenticated;

DROP FUNCTION IF EXISTS search_alumni(
  TEXT, TEXT, TEXT, INT, INT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, BOOLEAN
);

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
  p_open_to_mentorship BOOLEAN DEFAULT NULL,
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
  open_to_mentorship BOOLEAN,
  mentorship_blurb TEXT,
  paid_session_links JSONB,
  has_more BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_limit INT;
  v_is_admin BOOLEAN;
  v_total BIGINT;
  v_query TEXT;
  v_batch_year INT;
BEGIN
  v_is_admin := is_admin();
  v_query := nullif(btrim(p_query), '');
  v_batch_year := search_query_batch_year(p_query);

  IF NOT v_is_admin AND NOT is_approved_alumni() THEN
    RAISE EXCEPTION 'Directory access requires approved alumni or admin role';
  END IF;

  v_limit := LEAST(GREATEST(p_page_size, 1), 50);
  v_offset := (GREATEST(p_page, 1) - 1) * v_limit;

  IF v_query IS NOT NULL AND length(v_query) < 2
     AND p_course IS NULL AND p_stream IS NULL AND p_location IS NULL
     AND p_company IS NULL AND p_house IS NULL
     AND NOT COALESCE(p_open_to_mentorship, false) THEN
    RAISE EXCEPTION 'Provide at least 2 characters in search or one filter';
  END IF;

  SELECT count(*) INTO v_total
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
    AND (NOT COALESCE(p_open_to_mentorship, false) OR am.open_to_mentorship = true)
    AND (
      v_query IS NULL
      OR am.roll_number ILIKE v_query
      OR am.search_vector @@ plainto_tsquery('english', v_query)
      OR am.name ILIKE '%' || v_query || '%'
      OR house_query_matches(am.house, v_query)
      OR (
        v_batch_year IS NOT NULL
        AND (
          am.course_end_year = v_batch_year
          OR am.course_start_year = v_batch_year
        )
      )
    );

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
    AND (NOT COALESCE(p_open_to_mentorship, false) OR am.open_to_mentorship = true)
    AND (
      v_query IS NULL
      OR am.roll_number ILIKE v_query
      OR am.search_vector @@ plainto_tsquery('english', v_query)
      OR am.name ILIKE '%' || v_query || '%'
      OR house_query_matches(am.house, v_query)
      OR (
        v_batch_year IS NOT NULL
        AND (
          am.course_end_year = v_batch_year
          OR am.course_start_year = v_batch_year
        )
      )
    )
    ORDER BY
      CASE
        WHEN v_query IS NOT NULL AND am.roll_number ILIKE v_query THEN 0
        WHEN v_batch_year IS NOT NULL AND (
          am.course_end_year = v_batch_year OR am.course_start_year = v_batch_year
        ) THEN 1
        ELSE 2
      END,
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
    pr.open_to_mentorship,
    CASE WHEN pr.open_to_mentorship THEN pr.mentorship_blurb ELSE NULL END,
    CASE WHEN pr.open_to_mentorship THEN pr.paid_session_links ELSE '[]'::jsonb END,
    (SELECT count(*) > v_limit FROM filtered) AS has_more,
    v_total AS total_count
  FROM page_rows pr;
END;
$$;

GRANT EXECUTE ON FUNCTION search_alumni TO authenticated;

DROP FUNCTION IF EXISTS list_recent_alumni(INT);

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
  open_to_mentorship BOOLEAN,
  mentorship_blurb TEXT,
  paid_session_links JSONB,
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
    am.open_to_mentorship,
    CASE WHEN am.open_to_mentorship THEN am.mentorship_blurb ELSE NULL END,
    CASE WHEN am.open_to_mentorship THEN am.paid_session_links ELSE '[]'::jsonb END,
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
