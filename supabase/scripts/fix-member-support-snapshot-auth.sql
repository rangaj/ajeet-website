-- Run in Supabase SQL Editor to fix: record "v_auth" is not assigned yet

CREATE OR REPLACE FUNCTION admin_member_support_snapshot(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_member alumni_members%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_has_profile BOOLEAN := false;
  v_account_exists BOOLEAN := false;
  v_auth_email TEXT;
  v_email_verified BOOLEAN := false;
  v_last_sign_in_at TIMESTAMPTZ;
  v_import JSONB;
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO v_member FROM alumni_members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_member.user_id IS NOT NULL THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_member.user_id;
    v_has_profile := FOUND;

    SELECT
      true,
      u.email,
      u.email_confirmed_at IS NOT NULL,
      u.last_sign_in_at
    INTO
      v_account_exists,
      v_auth_email,
      v_email_verified,
      v_last_sign_in_at
    FROM auth.users u
    WHERE u.id = v_member.user_id;

    IF NOT FOUND THEN
      v_account_exists := false;
      v_auth_email := NULL;
      v_email_verified := false;
      v_last_sign_in_at := NULL;
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'raw_payload', ir.raw_payload,
    'import_batch_id', ir.import_batch_id,
    'file_name', ib.file_name,
    'imported_at', coalesce(ib.committed_at, ib.created_at),
    'row_number', ir.row_number
  )
  INTO v_import
  FROM imported_records ir
  JOIN import_batches ib ON ib.id = ir.import_batch_id
  WHERE ir.alumni_member_id = p_member_id
  ORDER BY ir.created_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'member', jsonb_build_object(
      'id', v_member.id,
      'roll_number', v_member.roll_number,
      'name', v_member.name,
      'email', v_member.email,
      'house', v_member.house,
      'course_end_year', v_member.course_end_year,
      'course_start_year', v_member.course_start_year,
      'current_location', v_member.current_location,
      'status', v_member.status,
      'user_id', v_member.user_id,
      'registered', v_member.registered,
      'registered_at', v_member.registered_at,
      'approved_at', v_member.approved_at,
      'approved_by', v_member.approved_by,
      'profile_updated_at', v_member.profile_updated_at,
      'created_at', v_member.created_at,
      'updated_at', v_member.updated_at,
      'pending_email', v_member.pending_email,
      'email_change_requested_at', v_member.email_change_requested_at,
      'legacy_admin_note', v_member.admin_note,
      'import_batch_id', v_member.import_batch_id
    ),
    'import_snapshot', coalesce(v_import, 'null'::jsonb),
    'approval_requests', coalesce((
      SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC)
      FROM (
        SELECT
          ar.id,
          ar.type,
          ar.status,
          ar.submitted_email,
          ar.submitted_name,
          ar.reviewer_id,
          ar.reviewer_note,
          ar.reviewed_at,
          ar.email_verification_expires_at,
          ar.created_at,
          ar.updated_at,
          ru.email AS reviewer_email
        FROM approval_requests ar
        LEFT JOIN auth.users ru ON ru.id = ar.reviewer_id
        WHERE ar.alumni_member_id = p_member_id
           OR ar.roll_number = v_member.roll_number
        ORDER BY ar.created_at DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb),
    'email_events', coalesce((
      SELECT jsonb_agg(row_to_json(e)::jsonb ORDER BY e.created_at DESC)
      FROM (
        SELECT
          id,
          email_type,
          provider,
          recipient,
          message_id,
          status,
          error_message,
          trigger_source,
          created_at,
          approval_request_id
        FROM member_email_events
        WHERE alumni_member_id = p_member_id
        ORDER BY created_at DESC
        LIMIT 50
      ) e
    ), '[]'::jsonb),
    'support_notes', coalesce((
      SELECT jsonb_agg(row_to_json(n)::jsonb ORDER BY n.created_at DESC)
      FROM (
        SELECT
          sn.id,
          sn.body,
          sn.created_at,
          sn.author_id,
          au.email AS author_email
        FROM member_support_notes sn
        JOIN auth.users au ON au.id = sn.author_id
        WHERE sn.alumni_member_id = p_member_id
        ORDER BY sn.created_at DESC
        LIMIT 100
      ) n
    ), '[]'::jsonb),
    'audit_log', coalesce((
      SELECT jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at DESC)
      FROM (
        SELECT
          al.id,
          al.action,
          al.details,
          al.created_at,
          al.actor_id,
          au.email AS actor_email
        FROM admin_audit_log al
        LEFT JOIN auth.users au ON au.id = al.actor_id
        WHERE al.entity_id = p_member_id
           OR al.details->>'roll_number' = v_member.roll_number
        ORDER BY al.created_at DESC
        LIMIT 25
      ) a
    ), '[]'::jsonb),
    'auth_diagnostics', CASE
      WHEN v_member.user_id IS NULL THEN jsonb_build_object(
        'account_exists', false,
        'email_verified', false,
        'password_set', false,
        'last_login', null,
        'auth_email', null
      )
      ELSE jsonb_build_object(
        'account_exists', v_account_exists,
        'email_verified', v_email_verified,
        'password_set', v_has_profile AND v_profile.password_set_at IS NOT NULL,
        'password_set_at', CASE WHEN v_has_profile THEN v_profile.password_set_at ELSE NULL END,
        'last_login', v_last_sign_in_at,
        'auth_email', v_auth_email,
        'member_status', CASE WHEN v_has_profile THEN v_profile.member_status::text ELSE NULL END
      )
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_member_support_snapshot TO authenticated;
