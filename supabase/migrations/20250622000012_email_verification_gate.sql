-- Email verification gate: requests enter admin queue only after the claimant opens the magic link.

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_one_awaiting_email_per_roll
  ON approval_requests (roll_number)
  WHERE status = 'awaiting_email_verification';

CREATE OR REPLACE FUNCTION expire_stale_email_verifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE approval_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'awaiting_email_verification'
    AND email_verification_expires_at IS NOT NULL
    AND email_verification_expires_at < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_stale_email_verifications TO authenticated;

-- Promote to admin queue after magic-link sign-in.
CREATE OR REPLACE FUNCTION promote_email_verified_request()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  req approval_requests%ROWTYPE;
BEGIN
  IF uid IS NULL OR email = '' THEN
    RETURN NULL;
  END IF;

  PERFORM expire_stale_email_verifications();

  SELECT * INTO req
  FROM approval_requests
  WHERE lower(trim(submitted_email)) = email
    AND status = 'awaiting_email_verification'
    AND email_verification_expires_at >= now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE approval_requests SET
    status = 'pending_review',
    user_id = uid,
    updated_at = now()
  WHERE id = req.id;

  RETURN req.id;
END;
$$;

GRANT EXECUTE ON FUNCTION promote_email_verified_request TO authenticated;

DROP POLICY IF EXISTS approval_link_self ON approval_requests;
CREATE POLICY approval_link_self ON approval_requests
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND user_id IS NULL
    AND lower(submitted_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND type IN ('new_registration', 'claim')
    AND status IN ('awaiting_email_verification', 'pending_review', 'more_info_required')
  )
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS approval_select_own ON approval_requests;
CREATE POLICY approval_select_own ON approval_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_admin()
    OR (
      user_id IS NULL
      AND lower(submitted_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND status IN ('awaiting_email_verification', 'pending_review', 'more_info_required')
    )
  );
