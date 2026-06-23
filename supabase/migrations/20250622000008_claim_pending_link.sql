-- Allow claimants to link auth account and read unlinked pending claims by email

DROP POLICY IF EXISTS approval_link_self ON approval_requests;
CREATE POLICY approval_link_self ON approval_requests
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND user_id IS NULL
    AND lower(submitted_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND type IN ('new_registration', 'claim')
    AND status IN ('pending_review', 'more_info_required')
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
      AND status IN ('pending_review', 'more_info_required')
    )
  );
