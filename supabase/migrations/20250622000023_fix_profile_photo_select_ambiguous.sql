-- Fix profile photo SELECT policy: "name" inside alumni_members subquery
-- was resolving to am.name (person's name) instead of the storage object path.

CREATE OR REPLACE FUNCTION is_directory_profile_photo(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM alumni_members am
    WHERE am.profile_photo_path = object_name
      AND am.status = 'approved'
      AND am.is_directory_visible = true
  );
$$;

GRANT EXECUTE ON FUNCTION is_directory_profile_photo(TEXT) TO authenticated, anon;

DROP POLICY IF EXISTS profile_photos_select ON storage.objects;

CREATE POLICY profile_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      is_admin()
      OR user_owns_profile_photo_object(name)
      OR is_directory_profile_photo(name)
    )
  );
