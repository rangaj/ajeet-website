-- Get Involved: member contribution preferences (living profile section).

ALTER TABLE alumni_members
  ADD COLUMN IF NOT EXISTS get_involved_wants_to_participate BOOLEAN,
  ADD COLUMN IF NOT EXISTS get_involved_interest_areas TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS get_involved_geography TEXT,
  ADD COLUMN IF NOT EXISTS get_involved_time_commitment TEXT,
  ADD COLUMN IF NOT EXISTS get_involved_comments TEXT,
  ADD COLUMN IF NOT EXISTS get_involved_updated_at TIMESTAMPTZ;

ALTER TABLE alumni_members
  ADD CONSTRAINT alumni_members_get_involved_comments_length
  CHECK (get_involved_comments IS NULL OR char_length(get_involved_comments) <= 2000);

CREATE OR REPLACE FUNCTION is_valid_get_involved_interest(area TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT area IN (
    'technology_platform',
    'events_reunions',
    'communications_content',
    'student_outreach',
    'fundraising_sponsorship',
    'regional_chapters',
    'alumni_data_directory',
    'podcast_media',
    'administrative_support',
    'other'
  );
$$;

CREATE OR REPLACE FUNCTION is_valid_get_involved_geography(value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT value IN ('local_city', 'state_region', 'india', 'global_remote');
$$;

CREATE OR REPLACE FUNCTION is_valid_get_involved_time_commitment(value TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT value IN ('occasionally', 'quarterly', 'monthly', 'discuss');
$$;

CREATE OR REPLACE FUNCTION update_get_involved_preferences(
  p_wants_to_participate BOOLEAN,
  p_interest_areas TEXT[] DEFAULT NULL,
  p_geography TEXT DEFAULT NULL,
  p_time_commitment TEXT DEFAULT NULL,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_areas TEXT[];
  v_area TEXT;
  v_comments TEXT;
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
    RAISE EXCEPTION 'Approved alumni profile required to update Get Involved preferences';
  END IF;

  IF p_wants_to_participate IS NULL THEN
    RAISE EXCEPTION 'Please indicate whether you would like to get involved';
  END IF;

  v_comments := NULLIF(btrim(p_comments), '');

  IF p_wants_to_participate THEN
    v_areas := COALESCE(p_interest_areas, ARRAY[]::TEXT[]);

    IF coalesce(array_length(v_areas, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Select at least one area of interest';
    END IF;

    FOREACH v_area IN ARRAY v_areas LOOP
      IF NOT is_valid_get_involved_interest(v_area) THEN
        RAISE EXCEPTION 'Invalid area of interest';
      END IF;
    END LOOP;

    IF p_geography IS NULL OR NOT is_valid_get_involved_geography(p_geography) THEN
      RAISE EXCEPTION 'Select a preferred geography';
    END IF;

    IF p_time_commitment IS NULL OR NOT is_valid_get_involved_time_commitment(p_time_commitment) THEN
      RAISE EXCEPTION 'Select a time commitment';
    END IF;

    IF v_comments IS NOT NULL AND char_length(v_comments) > 2000 THEN
      RAISE EXCEPTION 'Comments must be 2000 characters or less';
    END IF;

    UPDATE alumni_members
    SET
      get_involved_wants_to_participate = true,
      get_involved_interest_areas = v_areas,
      get_involved_geography = p_geography,
      get_involved_time_commitment = p_time_commitment,
      get_involved_comments = v_comments,
      get_involved_updated_at = now(),
      updated_at = now()
    WHERE id = v_member_id
      AND (user_id = auth.uid() OR is_admin());
  ELSE
    UPDATE alumni_members
    SET
      get_involved_wants_to_participate = false,
      get_involved_interest_areas = '{}',
      get_involved_geography = NULL,
      get_involved_time_commitment = NULL,
      get_involved_comments = NULL,
      get_involved_updated_at = now(),
      updated_at = now()
    WHERE id = v_member_id
      AND (user_id = auth.uid() OR is_admin());
  END IF;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_get_involved_preferences(BOOLEAN, TEXT[], TEXT, TEXT, TEXT) TO authenticated;
