-- AAA Membership — Phase B2: RPCs.
-- Financial-year helpers, voting-exemption (Art 7(e)(ii)), offline payment
-- recording with numbered receipts (Art 21(b)), member-type grants (Art 7(c-d)),
-- and Roll-of-Members + electoral-roll exports (Art 12, 20, 25).
-- All writes/exports require can_manage_membership(); offline recording also
-- requires payments_offline_enabled. Nothing here is reachable by members.

-- ---------------------------------------------------------------------------
-- Financial-year helpers (Art 4(v): FY runs 1 Apr - 31 Mar by default)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aaa_financial_year_for(p_date DATE)
RETURNS INT AS $$
  SELECT CASE
    WHEN EXTRACT(MONTH FROM p_date)::int
       >= COALESCE((SELECT financial_year_start_month FROM aaa_settings WHERE id = 1), 4)
    THEN EXTRACT(YEAR FROM p_date)::int
    ELSE EXTRACT(YEAR FROM p_date)::int - 1
  END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION aaa_current_fy()
RETURNS INT AS $$
  SELECT aaa_financial_year_for(current_date);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Start date of a financial year (its 1st of the start month).
CREATE OR REPLACE FUNCTION aaa_fy_start(p_fy INT)
RETURNS DATE AS $$
  SELECT make_date(p_fy, COALESCE((SELECT financial_year_start_month FROM aaa_settings WHERE id = 1), 4), 1);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Last day of a financial year.
CREATE OR REPLACE FUNCTION aaa_fy_end(p_fy INT)
RETURNS DATE AS $$
  SELECT (aaa_fy_start(p_fy) + INTERVAL '1 year' - INTERVAL '1 day')::date;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Voting exemption (Art 7(e)(ii)): within 8 years of graduation OR 70+.
-- Exempt members are never suspended from voting for non-payment.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_voting_exempt(p_alumni_member_id UUID, p_as_of DATE DEFAULT current_date)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end INT;
  v_dob DATE;
  v_year INT;
BEGIN
  SELECT course_end_year, date_of_birth INTO v_end, v_dob
  FROM alumni_members WHERE id = p_alumni_member_id;

  v_year := EXTRACT(YEAR FROM p_as_of)::int;

  -- Yet to complete 8 years from graduation.
  IF v_end IS NOT NULL AND (v_year - v_end) < 8 THEN
    RETURN true;
  END IF;

  -- Over 70 in the year preceding the vote (simplified: age >= 70 as of date).
  IF v_dob IS NOT NULL AND (v_year - EXTRACT(YEAR FROM v_dob)::int) >= 70 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- Membership standing for a member as of a date.
--   none       - no membership / registration fee unpaid
--   registered - registration paid, no active membership period
--   active      - within a paid membership period
--   in_default  - had a period that has lapsed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION member_standing(p_alumni_member_id UUID, p_as_of DATE DEFAULT current_date)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m memberships%ROWTYPE;
BEGIN
  SELECT * INTO m FROM memberships WHERE alumni_member_id = p_alumni_member_id;
  IF NOT FOUND THEN RETURN 'none'; END IF;

  -- Honorary / Patron members are standing members without fees (Art 7(c-d)).
  IF m.member_type IN ('honorary', 'patron') THEN RETURN 'active'; END IF;

  IF NOT m.registration_fee_paid THEN RETURN 'none'; END IF;
  IF m.valid_through IS NULL THEN RETURN 'registered'; END IF;
  IF m.valid_through >= p_as_of AND (m.valid_from IS NULL OR m.valid_from <= p_as_of) THEN
    RETURN 'active';
  END IF;
  RETURN 'in_default';
END;
$$;

-- ---------------------------------------------------------------------------
-- Numbered receipt allocation (per financial year, Art 21(b)).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aaa_next_receipt_number(p_fy INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num INT;
BEGIN
  INSERT INTO membership_receipt_counters (financial_year, last_number)
  VALUES (p_fy, 1)
  ON CONFLICT (financial_year)
  DO UPDATE SET last_number = membership_receipt_counters.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN v_num;
END;
$$;

-- ---------------------------------------------------------------------------
-- Record an offline payment (cheque / UPI / cash / bank transfer), optionally
-- issue a numbered receipt, and update the member's standing.
-- Returns the receipt number (or payment id when no receipt is issued).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_offline_payment(
  p_alumni_member_id UUID,
  p_fee_kind payment_fee_kind,
  p_amount NUMERIC,
  p_period_fy INT DEFAULT NULL,
  p_method TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_issue_receipt BOOLEAN DEFAULT true,
  p_idempotency_key TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s aaa_settings%ROWTYPE;
  v_fy INT;
  v_from DATE;
  v_through DATE;
  v_payment_id UUID;
  v_receipt_id UUID;
  v_receipt_no TEXT;
  v_num INT;
  v_member alumni_members%ROWTYPE;
BEGIN
  IF NOT can_manage_membership() THEN
    RAISE EXCEPTION 'Membership management access required';
  END IF;

  SELECT * INTO s FROM aaa_settings WHERE id = 1;
  IF NOT s.payments_offline_enabled THEN
    RAISE EXCEPTION 'Offline payment recording is disabled';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v_member FROM alumni_members WHERE id = p_alumni_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;

  -- Idempotency: if this key was already recorded, return its receipt/payment.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT mp.id, mr.receipt_no INTO v_payment_id, v_receipt_no
    FROM membership_payments mp
    LEFT JOIN membership_receipts mr ON mr.id = mp.receipt_id
    WHERE mp.idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN COALESCE(v_receipt_no, v_payment_id::text);
    END IF;
  END IF;

  v_fy := COALESCE(p_period_fy, aaa_current_fy());

  INSERT INTO membership_payments (
    alumni_member_id, fee_kind, period_fy, amount, currency,
    source, method, reference, status, idempotency_key, notes, recorded_by
  ) VALUES (
    p_alumni_member_id, p_fee_kind, v_fy, p_amount, s.currency,
    'offline', p_method, p_reference, 'recorded', p_idempotency_key, p_notes, auth.uid()
  )
  RETURNING id INTO v_payment_id;

  IF p_issue_receipt THEN
    v_num := aaa_next_receipt_number(v_fy);
    v_receipt_no := s.receipt_prefix || '/' || v_fy::text || '/' || lpad(v_num::text, 4, '0');

    INSERT INTO membership_receipts (
      receipt_no, mode, financial_year, alumni_member_id, payment_id, amount, currency,
      entity_snapshot, issued_by
    ) VALUES (
      v_receipt_no, s.receipt_mode, v_fy, p_alumni_member_id, v_payment_id, p_amount, s.currency,
      jsonb_build_object(
        'entity_name', s.entity_name,
        'registered_office', s.registered_office,
        'registration_number', s.registration_number,
        'pan', s.pan,
        'reg_12a', s.reg_12a,
        'reg_80g', s.reg_80g,
        'member_name', v_member.name,
        'roll_number', v_member.roll_number,
        'fee_kind', p_fee_kind
      ),
      auth.uid()
    )
    RETURNING id INTO v_receipt_id;

    UPDATE membership_payments SET receipt_id = v_receipt_id WHERE id = v_payment_id;
  END IF;

  -- Update standing.
  IF p_fee_kind IN ('initial', 'renewal') THEN
    v_from := aaa_fy_start(v_fy);
    v_through := aaa_fy_end(v_fy);
  END IF;

  INSERT INTO memberships (
    alumni_member_id, member_type, registration_fee_paid, registration_paid_at,
    current_period_fy, valid_from, valid_through
  ) VALUES (
    p_alumni_member_id, 'ajeet',
    (p_fee_kind = 'registration'),
    CASE WHEN p_fee_kind = 'registration' THEN now() END,
    CASE WHEN p_fee_kind IN ('initial', 'renewal') THEN v_fy END,
    v_from, v_through
  )
  ON CONFLICT (alumni_member_id) DO UPDATE SET
    registration_fee_paid = memberships.registration_fee_paid OR EXCLUDED.registration_fee_paid,
    registration_paid_at = COALESCE(memberships.registration_paid_at, EXCLUDED.registration_paid_at),
    current_period_fy = COALESCE(EXCLUDED.current_period_fy, memberships.current_period_fy),
    valid_from = COALESCE(memberships.valid_from, EXCLUDED.valid_from),
    valid_through = GREATEST(memberships.valid_through, EXCLUDED.valid_through),
    updated_at = now();

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'membership_offline_payment', 'membership_payments', v_payment_id,
    jsonb_build_object(
      'alumni_member_id', p_alumni_member_id,
      'fee_kind', p_fee_kind,
      'amount', p_amount,
      'period_fy', v_fy,
      'receipt_no', v_receipt_no
    ));

  RETURN COALESCE(v_receipt_no, v_payment_id::text);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grant / change member type (Art 7(c-d): Honorary / Patron, EC-granted).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_member_type(p_alumni_member_id UUID, p_member_type member_type)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_manage_membership() THEN
    RAISE EXCEPTION 'Membership management access required';
  END IF;

  INSERT INTO memberships (alumni_member_id, member_type)
  VALUES (p_alumni_member_id, p_member_type)
  ON CONFLICT (alumni_member_id) DO UPDATE SET
    member_type = EXCLUDED.member_type, updated_at = now();

  INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), 'membership_set_type', 'memberships', p_alumni_member_id,
    jsonb_build_object('member_type', p_member_type));

  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- Roll of Members (Art 12, 25) — full standing snapshot for managers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION membership_roll(p_as_of DATE DEFAULT current_date)
RETURNS TABLE (
  alumni_member_id UUID,
  roll_number TEXT,
  name TEXT,
  course_end_year INT,
  house TEXT,
  member_type member_type,
  standing TEXT,
  registration_fee_paid BOOLEAN,
  valid_through DATE,
  voting_exempt BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_manage_membership() THEN
    RAISE EXCEPTION 'Membership management access required';
  END IF;

  RETURN QUERY
  SELECT
    am.id,
    am.roll_number,
    am.name,
    am.course_end_year,
    am.house,
    COALESCE(m.member_type, 'ajeet')::member_type,
    member_standing(am.id, p_as_of),
    COALESCE(m.registration_fee_paid, false),
    m.valid_through,
    member_voting_exempt(am.id, p_as_of)
  FROM alumni_members am
  LEFT JOIN memberships m ON m.alumni_member_id = am.id
  WHERE am.status = 'approved'
  ORDER BY am.course_end_year NULLS LAST, am.name;
END;
$$;

-- ---------------------------------------------------------------------------
-- Electoral roll as of a record date (Art 7(e)(ii), 20(a)(iii)):
-- Ajeet Members in good standing as of the date, OR voting-exempt.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION membership_electoral_roll(p_record_date DATE DEFAULT current_date)
RETURNS TABLE (
  alumni_member_id UUID,
  roll_number TEXT,
  name TEXT,
  course_end_year INT,
  house TEXT,
  standing TEXT,
  voting_exempt BOOLEAN,
  eligible_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_manage_membership() THEN
    RAISE EXCEPTION 'Membership management access required';
  END IF;

  RETURN QUERY
  SELECT
    am.id,
    am.roll_number,
    am.name,
    am.course_end_year,
    am.house,
    member_standing(am.id, p_record_date),
    member_voting_exempt(am.id, p_record_date),
    CASE
      WHEN member_standing(am.id, p_record_date) = 'active' THEN 'in_good_standing'
      ELSE 'exempt'
    END
  FROM alumni_members am
  LEFT JOIN memberships m ON m.alumni_member_id = am.id
  WHERE am.status = 'approved'
    AND COALESCE(m.member_type, 'ajeet') = 'ajeet'   -- only Ajeet Members vote (Art 7(e)(i))
    AND (
      member_standing(am.id, p_record_date) = 'active'
      OR member_voting_exempt(am.id, p_record_date)
    )
  ORDER BY am.course_end_year NULLS LAST, am.name;
END;
$$;

GRANT EXECUTE ON FUNCTION aaa_financial_year_for(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION aaa_current_fy() TO authenticated;
GRANT EXECUTE ON FUNCTION aaa_fy_start(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION aaa_fy_end(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION member_voting_exempt(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION member_standing(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION record_offline_payment(UUID, payment_fee_kind, NUMERIC, INT, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_member_type(UUID, member_type) TO authenticated;
GRANT EXECUTE ON FUNCTION membership_roll(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION membership_electoral_roll(DATE) TO authenticated;
