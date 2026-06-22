-- UAT / security verification queries (run after deployment)

-- 1. RLS must be ON for every table
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- 2. Roll number uniqueness
SELECT roll_number, count(*) FROM alumni_members GROUP BY roll_number HAVING count(*) > 1;

-- 3. Search performance smoke test (should use GIN index)
EXPLAIN ANALYZE
SELECT * FROM alumni_members
WHERE status = 'approved' AND is_directory_visible = true
  AND search_vector @@ plainto_tsquery('english', 'engineer')
LIMIT 24;

-- 4. Exact roll lookup
EXPLAIN ANALYZE SELECT * FROM alumni_members WHERE roll_number = 'SEED-00001';

-- Acceptance checklist (manual):
-- [ ] Admin CSV import preview shows valid/invalid/duplicate counts
-- [ ] Admin commit imports without duplicate roll numbers
-- [ ] Claim flow sends OTP when email matches
-- [ ] Claim mismatch routes to admin review
-- [ ] New registration pending until admin approves
-- [ ] Approved user can search directory with pagination
-- [ ] Hidden alumni excluded from directory search
-- [ ] Profile photo upload/replace/remove works
-- [ ] Forgot password sends reset link
-- [ ] Sensitive fields masked in directory results by default
-- [ ] Admin actions appear in admin_audit_log
