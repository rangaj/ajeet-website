-- Member Support Console: email events, support notes, admin RPCs

CREATE TYPE email_provider AS ENUM ('auth_service', 'resend');

CREATE TYPE member_email_type AS ENUM (
  'claim_verification',
  'registration_verification',
  'password_reset',
  'email_change_verification',
  'claim_approved',
  'registration_approved',
  'request_rejected',
  'more_info_required',
  'request_submitted'
);

CREATE TYPE member_email_status AS ENUM (
  'triggered',
  'sent_to_auth_service',
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced',
  'failed',
  'suppressed',
  'unknown'
);

CREATE TABLE member_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_member_id UUID REFERENCES alumni_members(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES approval_requests(id) ON DELETE SET NULL,
  email_type member_email_type NOT NULL,
  provider email_provider NOT NULL,
  recipient TEXT NOT NULL,
  message_id TEXT,
  status member_email_status NOT NULL DEFAULT 'triggered',
  error_message TEXT,
  trigger_source TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_email_events_member_created
  ON member_email_events (alumni_member_id, created_at DESC);

CREATE INDEX idx_member_email_events_failures
  ON member_email_events (status)
  WHERE status IN ('failed', 'bounced', 'suppressed');

CREATE TABLE member_support_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_member_id UUID NOT NULL REFERENCES alumni_members(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_support_notes_member
  ON member_support_notes (alumni_member_id, created_at DESC);

ALTER TABLE alumni_members
  ADD COLUMN IF NOT EXISTS pending_email TEXT,
  ADD COLUMN IF NOT EXISTS email_change_requested_at TIMESTAMPTZ;

-- RLS
ALTER TABLE member_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_support_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_email_events_admin_select ON member_email_events
  FOR SELECT USING (is_admin());

CREATE POLICY member_support_notes_admin_select ON member_support_notes
  FOR SELECT USING (is_admin());

CREATE POLICY member_support_notes_admin_insert ON member_support_notes
  FOR INSERT WITH CHECK (is_admin() AND author_id = auth.uid());

-- Dashboard metric counts
CREATE OR REPLACE FUNCTION admin_support_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN jsonb_build_object(
    'awaiting_verification',
    (
      SELECT count(*)::int
      FROM approval_requests
      WHERE status = 'awaiting_email_verification'
        AND (
          email_verification_expires_at IS NULL
          OR email_verification_expires_at >= now()
        )
    ),
    'pending_claims',
    (
      SELECT count(*)::int
      FROM approval_requests
      WHERE type = 'claim'
        AND status IN ('pending_review', 'more_info_required')
    ),
    'email_failures',
    (
      SELECT count(DISTINCT alumni_member_id)::int
      FROM member_email_events
      WHERE status IN ('failed', 'bounced', 'suppressed')
        AND alumni_member_id IS NOT NULL
    ),
    'recently_approved',
    (
      SELECT count(*)::int
      FROM alumni_members
      WHERE approved_at IS NOT NULL
        AND approved_at >= now() - interval '7 days'
    ),
    'incomplete_registrations',
    (
      SELECT count(*)::int
      FROM alumni_members
      WHERE status = 'approved'
        AND (registered IS NOT TRUE OR user_id IS NULL)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_support_dashboard_metrics TO authenticated;

-- Member search for support console
CREATE OR REPLACE FUNCTION admin_search_members(
  p_query TEXT DEFAULT NULL,
  p_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  roll_number TEXT,
  name TEXT,
  email TEXT,
  status alumni_status,
  user_id UUID,
  claim_hint TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_query TEXT := lower(trim(coalesce(p_query, '')));
  v_limit INT := greatest(1, least(coalesce(p_limit, 25), 100));
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_filter = 'awaiting_verification' THEN
    RETURN QUERY
    SELECT DISTINCT ON (am.id)
      am.id,
      am.roll_number,
      am.name,
      coalesce(am.email, ar.submitted_email) AS email,
      am.status,
      am.user_id,
      'Awaiting verification'::text AS claim_hint
    FROM approval_requests ar
    JOIN alumni_members am ON am.roll_number = ar.roll_number
    WHERE ar.status = 'awaiting_email_verification'
      AND (
        ar.email_verification_expires_at IS NULL
        OR ar.email_verification_expires_at >= now()
      )
      AND (
        v_query = ''
        OR am.roll_number ILIKE v_query || '%'
        OR lower(am.name) LIKE '%' || v_query || '%'
        OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
        OR lower(ar.submitted_email) LIKE '%' || v_query || '%'
      )
    ORDER BY am.id, ar.created_at DESC
    LIMIT v_limit;
    RETURN;
  END IF;

  IF p_filter = 'pending_claims' THEN
    RETURN QUERY
    SELECT DISTINCT ON (am.id)
      am.id,
      am.roll_number,
      am.name,
      coalesce(am.email, ar.submitted_email) AS email,
      am.status,
      am.user_id,
      'Pending claim review'::text AS claim_hint
    FROM approval_requests ar
    JOIN alumni_members am ON am.roll_number = ar.roll_number
    WHERE ar.type = 'claim'
      AND ar.status IN ('pending_review', 'more_info_required')
      AND (
        v_query = ''
        OR am.roll_number ILIKE v_query || '%'
        OR lower(am.name) LIKE '%' || v_query || '%'
        OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
        OR lower(ar.submitted_email) LIKE '%' || v_query || '%'
      )
    ORDER BY am.id, ar.created_at DESC
    LIMIT v_limit;
    RETURN;
  END IF;

  IF p_filter = 'email_failures' THEN
    RETURN QUERY
    SELECT
      am.id,
      am.roll_number,
      am.name,
      am.email,
      am.status,
      am.user_id,
      'Email delivery issue'::text AS claim_hint
    FROM alumni_members am
    WHERE EXISTS (
      SELECT 1
      FROM member_email_events e
      WHERE e.alumni_member_id = am.id
        AND e.status IN ('failed', 'bounced', 'suppressed')
    )
    AND (
      v_query = ''
      OR am.roll_number ILIKE v_query || '%'
      OR lower(am.name) LIKE '%' || v_query || '%'
      OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
    )
    ORDER BY am.updated_at DESC
    LIMIT v_limit;
    RETURN;
  END IF;

  IF p_filter = 'recently_approved' THEN
    RETURN QUERY
    SELECT
      am.id,
      am.roll_number,
      am.name,
      am.email,
      am.status,
      am.user_id,
      'Recently approved'::text AS claim_hint
    FROM alumni_members am
    WHERE am.approved_at IS NOT NULL
      AND am.approved_at >= now() - interval '7 days'
      AND (
        v_query = ''
        OR am.roll_number ILIKE v_query || '%'
        OR lower(am.name) LIKE '%' || v_query || '%'
        OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
      )
    ORDER BY am.approved_at DESC
    LIMIT v_limit;
    RETURN;
  END IF;

  IF p_filter = 'incomplete_registrations' THEN
    RETURN QUERY
    SELECT
      am.id,
      am.roll_number,
      am.name,
      am.email,
      am.status,
      am.user_id,
      'Incomplete registration'::text AS claim_hint
    FROM alumni_members am
    WHERE am.status = 'approved'
      AND (am.registered IS NOT TRUE OR am.user_id IS NULL)
      AND (
        v_query = ''
        OR am.roll_number ILIKE v_query || '%'
        OR lower(am.name) LIKE '%' || v_query || '%'
        OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
      )
    ORDER BY am.approved_at DESC NULLS LAST
    LIMIT v_limit;
    RETURN;
  END IF;

  -- Default: broad member search
  RETURN QUERY
  SELECT
    am.id,
    am.roll_number,
    am.name,
    am.email,
    am.status,
    am.user_id,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM approval_requests ar
        WHERE ar.roll_number = am.roll_number
          AND ar.status = 'awaiting_email_verification'
          AND (
            ar.email_verification_expires_at IS NULL
            OR ar.email_verification_expires_at >= now()
          )
      ) THEN 'Awaiting verification'
      WHEN EXISTS (
        SELECT 1 FROM approval_requests ar
        WHERE ar.roll_number = am.roll_number
          AND ar.type = 'claim'
          AND ar.status IN ('pending_review', 'more_info_required')
      ) THEN 'Pending claim review'
      WHEN am.status = 'imported_unclaimed' THEN 'Unclaimed import'
      WHEN am.status = 'approved' AND am.user_id IS NOT NULL THEN 'Active member'
      ELSE am.status::text
    END AS claim_hint
  FROM alumni_members am
  WHERE
    v_query = ''
    OR am.roll_number ILIKE v_query || '%'
    OR lower(am.name) LIKE '%' || v_query || '%'
    OR lower(coalesce(am.email, '')) LIKE '%' || v_query || '%'
    OR EXISTS (
      SELECT 1
      FROM approval_requests ar
      WHERE ar.alumni_member_id = am.id
        AND lower(ar.submitted_email) LIKE '%' || v_query || '%'
    )
    OR EXISTS (
      SELECT 1
      FROM approval_requests ar
      WHERE ar.roll_number = am.roll_number
        AND lower(ar.submitted_email) LIKE '%' || v_query || '%'
    )
  ORDER BY
    CASE WHEN v_query <> '' AND am.roll_number = regexp_replace(v_query, '\D', '', 'g') THEN 0 ELSE 1 END,
    am.name
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_search_members TO authenticated;

-- Add support note
CREATE OR REPLACE FUNCTION admin_add_support_note(
  p_member_id UUID,
  p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_body TEXT := trim(coalesce(p_body, ''));
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF v_body = '' THEN
    RAISE EXCEPTION 'Note body is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM alumni_members WHERE id = p_member_id) THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  INSERT INTO member_support_notes (alumni_member_id, author_id, body)
  VALUES (p_member_id, auth.uid(), v_body)
  RETURNING id INTO v_note_id;

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(),
    'support_note_added',
    'alumni_member',
    p_member_id,
    jsonb_build_object('note_id', v_note_id)
  );

  RETURN v_note_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_add_support_note TO authenticated;

-- Full member support snapshot
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
  v_auth RECORD;
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
    SELECT
      u.id IS NOT NULL AS account_exists,
      u.email AS auth_email,
      u.email_confirmed_at IS NOT NULL AS email_verified,
      u.last_sign_in_at,
      u.created_at AS auth_created_at
    INTO v_auth
    FROM auth.users u
    WHERE u.id = v_member.user_id;
  ELSE
    v_auth := NULL;
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
        'account_exists', coalesce(v_auth.account_exists, false),
        'email_verified', coalesce(v_auth.email_verified, false),
        'password_set', v_profile.password_set_at IS NOT NULL,
        'password_set_at', v_profile.password_set_at,
        'last_login', v_auth.last_sign_in_at,
        'auth_email', v_auth.auth_email,
        'member_status', v_profile.member_status
      )
    END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_member_support_snapshot TO authenticated;
