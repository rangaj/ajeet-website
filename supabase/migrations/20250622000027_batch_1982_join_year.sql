-- Batch 1982 passed out in 1982 but joined in 1974 (8-year span, not the default 7).

UPDATE alumni_members
SET
  course_start_year = 1974,
  updated_at = now()
WHERE course_end_year = 1982
  AND course_start_year IS DISTINCT FROM 1974;

COMMENT ON COLUMN alumni_members.course_start_year IS
  'Year joined SSBJ (Class 6). Default: course_end_year - 7. Batch 1982 uses 1974.';
