-- AAA Membership — Phase B4: member-facing + member-support surfacing.
-- A member may read their own membership summary; managers may read any member's.
-- The internal building-block functions are locked down so an arbitrary member
-- cannot probe another member's dues standing.

-- Lock down the building blocks (still callable inside SECURITY DEFINER functions
-- owned by the migration role, e.g. membership_roll / my_membership_summary).
REVOKE EXECUTE ON FUNCTION member_standing(UUID, DATE) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION member_voting_exempt(UUID, DATE) FROM PUBLIC, authenticated;

-- A member's own membership summary (safe; scoped to own_alumni_member_id()).
CREATE OR REPLACE FUNCTION my_membership_summary()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mid UUID;
  s aaa_settings%ROWTYPE;
  m memberships%ROWTYPE;
BEGIN
  v_mid := own_alumni_member_id();
  SELECT * INTO s FROM aaa_settings WHERE id = 1;

  IF v_mid IS NULL THEN
    RETURN jsonb_build_object('has_member', false, 'module_state', s.module_state);
  END IF;

  SELECT * INTO m FROM memberships WHERE alumni_member_id = v_mid;

  RETURN jsonb_build_object(
    'has_member', true,
    'module_state', s.module_state,
    'member_type', COALESCE(m.member_type, 'ajeet'),
    'standing', member_standing(v_mid),
    'registration_fee_paid', COALESCE(m.registration_fee_paid, false),
    'valid_through', m.valid_through,
    'current_period_fy', m.current_period_fy,
    'voting_exempt', member_voting_exempt(v_mid),
    'currency', s.currency,
    'fee_registration', s.fee_registration,
    'fee_initial', s.fee_initial,
    'fee_renewal', s.fee_renewal
  );
END;
$$;

-- Membership summary for a specific member, for managers (Member Support).
CREATE OR REPLACE FUNCTION admin_member_membership(p_alumni_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m memberships%ROWTYPE;
BEGIN
  IF NOT can_manage_membership() THEN
    RAISE EXCEPTION 'Membership management access required';
  END IF;

  SELECT * INTO m FROM memberships WHERE alumni_member_id = p_alumni_member_id;

  RETURN jsonb_build_object(
    'member_type', COALESCE(m.member_type, 'ajeet'),
    'standing', member_standing(p_alumni_member_id),
    'registration_fee_paid', COALESCE(m.registration_fee_paid, false),
    'valid_through', m.valid_through,
    'current_period_fy', m.current_period_fy,
    'voting_exempt', member_voting_exempt(p_alumni_member_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION my_membership_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_member_membership(UUID) TO authenticated;
