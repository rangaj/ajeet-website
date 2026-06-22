-- Row Level Security policies

-- Helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_approved_alumni()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'alumni'
    AND member_status = 'approved'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION own_alumni_member_id()
RETURNS UUID AS $$
  SELECT id FROM alumni_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION can_view_sensitive_field(
  target_member alumni_members,
  field_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  vis JSONB;
BEGIN
  IF is_admin() THEN RETURN true; END IF;
  IF target_member.user_id = auth.uid() THEN RETURN true; END IF;
  vis := target_member.visibility_settings;
  RETURN COALESCE((vis ->> field_key)::boolean, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_field_mappings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid() OR is_super_admin());

CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (is_super_admin());

-- Alumni members policies
CREATE POLICY alumni_select_directory ON alumni_members
  FOR SELECT USING (
    is_admin()
    OR (is_approved_alumni() AND status = 'approved' AND is_directory_visible = true)
    OR user_id = auth.uid()
  );

CREATE POLICY alumni_update_own ON alumni_members
  FOR UPDATE USING (user_id = auth.uid() AND status = 'approved')
  WITH CHECK (user_id = auth.uid() AND status = 'approved');

CREATE POLICY alumni_admin_all ON alumni_members
  FOR ALL USING (is_admin());

-- Import batches (admin only)
CREATE POLICY import_batches_admin ON import_batches
  FOR ALL USING (is_admin());

-- Imported records (admin only)
CREATE POLICY imported_records_admin ON imported_records
  FOR ALL USING (is_admin());

-- Approval requests
CREATE POLICY approval_select_own ON approval_requests
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

CREATE POLICY approval_insert_authenticated ON approval_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY approval_admin_update ON approval_requests
  FOR UPDATE USING (is_admin());

CREATE POLICY approval_admin_select ON approval_requests
  FOR SELECT USING (is_admin() OR user_id = auth.uid());

-- Audit log (admin read, system insert via service role)
CREATE POLICY audit_log_admin_select ON admin_audit_log
  FOR SELECT USING (is_admin());

CREATE POLICY audit_log_insert ON admin_audit_log
  FOR INSERT WITH CHECK (is_admin() OR auth.uid() = actor_id);

-- Import field mappings (admin manage, authenticated read for mapping UI)
CREATE POLICY import_mappings_read ON import_field_mappings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY import_mappings_admin ON import_field_mappings
  FOR ALL USING (is_admin());

-- Storage buckets (run after creating buckets in dashboard or via storage migration)
-- profile-photos: private bucket
-- evidence-uploads: private bucket
-- import-temp: admin only

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('evidence-uploads', 'evidence-uploads', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('import-temp', 'import-temp', false, 52428800, ARRAY['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY profile_photos_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'profile-photos'
    AND (is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY profile_photos_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid() IS NOT NULL
    AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM alumni_members am
        WHERE am.user_id = auth.uid()
        AND am.id::text = (storage.foldername(name))[1]
      )
    )
  );

CREATE POLICY profile_photos_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos'
    AND (is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY evidence_uploads_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'evidence-uploads'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY evidence_uploads_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'evidence-uploads'
    AND (is_admin() OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY import_temp_admin ON storage.objects
  FOR ALL USING (bucket_id = 'import-temp' AND is_admin());
