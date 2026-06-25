-- Recently approved = approved on THIS platform by an admin, not legacy import dates.

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
      WHERE approved_by IS NOT NULL
        AND approved_at IS NOT NULL
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

-- Patch admin_search_members recently_approved filter only (full function replace below).

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
      'Approved on platform'::text AS claim_hint
    FROM alumni_members am
    WHERE am.approved_by IS NOT NULL
      AND am.approved_at IS NOT NULL
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
