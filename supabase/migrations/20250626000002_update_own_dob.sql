-- Allow an approved member to correct their own date of birth, with the same
-- sanity checks used at sign-up (not future, plausible year, and consistent with
-- the batch — SSBJ students join class VI around age 10-11). Wide slack so genuine
-- cases are never blocked. DOB stays optional (NULL clears it).

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
    IF v_birth_year < 1940 THEN
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
