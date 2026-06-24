-- Remove 14-arg overload left by 000016; keep 15-arg version from 000017

DROP FUNCTION IF EXISTS update_own_alumni_profile(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, JSONB, TEXT
);
