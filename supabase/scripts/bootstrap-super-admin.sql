-- Bootstrap first super admin after creating user in Supabase Auth dashboard
-- Replace YOUR_USER_UUID with the auth.users.id of the admin account

-- Example:
-- UPDATE profiles SET role = 'super_admin', member_status = 'approved' WHERE id = 'YOUR_USER_UUID';

-- Verify RLS is enabled on all app tables:
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'alumni_members', 'import_batches', 'imported_records',
    'approval_requests', 'admin_audit_log', 'import_field_mappings'
  );

-- List policies (audit):
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
