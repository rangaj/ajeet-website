-- Add total_count to directory search results

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
BEGIN
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
    AND (
      p_query IS NULL OR trim(p_query) = ''
      OR am.roll_number ILIKE trim(p_query)
      OR am.search_vector @@ plainto_tsquery('english', trim(p_query))
      OR am.name ILIKE '%' || trim(p_query) || '%'
      OR house_query_matches(am.house, trim(p_query))
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
    (SELECT count(*) > v_limit FROM filtered) AS has_more,
    v_total AS total_count
  FROM page_rows pr;
END;
$$;

GRANT EXECUTE ON FUNCTION search_alumni TO authenticated;
