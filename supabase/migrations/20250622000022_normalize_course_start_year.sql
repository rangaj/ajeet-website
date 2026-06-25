-- SSBJ canonical school span: join year = batch (passing-out) year - 7.
-- Fixes legacy import data that used a 12-year gap in Course Start Year.

UPDATE alumni_members
SET
  course_start_year = course_end_year - 7,
  updated_at = now()
WHERE course_end_year IS NOT NULL
  AND course_end_year BETWEEN 1963 AND 2030;

COMMENT ON COLUMN alumni_members.course_start_year IS
  'Year joined SSBJ (Class 6). When course_end_year is set: course_end_year - 7.';
