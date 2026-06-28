-- Founding/first-batch correction: SSBJ was founded in 1963 and the first batch
-- passed out in 1967 (MOA & Rules, Art 19(a)). This aligns the server-side
-- validation floors with that fact and fixes any legacy join years that were
-- derived to a pre-founding value (e.g. batch 1967 → 1960 under the 7-year rule).
--   * Batch (passing-out) year floor: 1967
--   * Join year floor: 1963 (school founding)
--   * Birth-year floor: 1947 (first pass-out 1967 − ~19, with slack)

-- 1. Self-service DOB correction — birth-year floor 1940 → 1947.
CREATE OR REPLACE FUNCTION update_own_dob(p_date_of_birth DATE DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_start INT;
  v_end INT;
  v_birth_year INT;
BEGIN
  SELECT id, course_start_year, course_end_year
    INTO v_member_id, v_start, v_end
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

  IF p_date_of_birth IS NOT NULL THEN
    IF p_date_of_birth > current_date THEN
      RAISE EXCEPTION 'Date of birth cannot be in the future';
    END IF;

    v_birth_year := EXTRACT(YEAR FROM p_date_of_birth)::int;
    IF v_birth_year < 1947 THEN
      RAISE EXCEPTION 'Enter a valid date of birth';
    END IF;

    IF v_end IS NOT NULL THEN
      IF (v_end - v_birth_year) < 15 OR (v_end - v_birth_year) > 19 THEN
        RAISE EXCEPTION 'Date of birth does not line up with your batch year';
      END IF;
    ELSIF v_start IS NOT NULL THEN
      IF (v_start - v_birth_year) < 8 OR (v_start - v_birth_year) > 12 THEN
        RAISE EXCEPTION 'Date of birth does not line up with your join year';
      END IF;
    END IF;
  END IF;

  UPDATE alumni_members
  SET date_of_birth = p_date_of_birth,
      updated_at = now()
  WHERE id = v_member_id
    AND (user_id = auth.uid() OR is_admin());

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_dob(DATE) TO authenticated;

-- 2. Self-service join-year correction — floor 1955 → 1963 (school founding).
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
    IF p_course_start_year < 1963 OR p_course_start_year > 2030 THEN
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

-- 3. Data fix: no one could have joined before the school existed. Clamp any
--    legacy join year below the founding year up to 1963.
UPDATE alumni_members
SET course_start_year = 1963,
    updated_at = now()
WHERE course_start_year IS NOT NULL
  AND course_start_year < 1963;
