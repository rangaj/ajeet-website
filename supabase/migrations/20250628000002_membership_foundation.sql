-- AAA Membership — Phase B1: foundation (schema, RLS, rollout switch).
-- Implements the MOA-grounded membership model. Ships DARK: nothing is exposed
-- to members until the module state is flipped to 'live', and going live requires
-- a recorded EC resolution reference (Art 6, 7, 25). See docs/MEMBERSHIP_FEE_PLAN.md.
--
-- This migration is storage + controls only. Payment recording, receipts, and the
-- Roll/electoral-roll exports come in the next migration (B2).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE membership_module_state AS ENUM ('hidden', 'coming_soon', 'live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Ajeet Member pays + votes; Honorary/Patron are EC-granted, fee-exempt, non-voting (Art 7).
  CREATE TYPE member_type AS ENUM ('ajeet', 'honorary', 'patron');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_fee_kind AS ENUM ('registration', 'initial', 'renewal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_source AS ENUM ('offline', 'razorpay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('recorded', 'captured', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE receipt_mode AS ENUM ('plain', '80g');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Settings (single row): entity, fee schedule, receipt mode, rollout controls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aaa_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Entity / statutory (Art 21(b), 24, 25)
  entity_name TEXT NOT NULL DEFAULT 'Ajeet Alumni Association',
  registration_number TEXT,
  registered_office TEXT NOT NULL DEFAULT 'Vijayapura, Karnataka',
  pan TEXT,
  reg_12a TEXT,
  reg_80g TEXT,

  -- Financial year (Art 4(v)) — month the FY starts (April = 4)
  financial_year_start_month INT NOT NULL DEFAULT 4
    CHECK (financial_year_start_month BETWEEN 1 AND 12),

  -- Fee schedule (Art 6, 7) — NULL until the Executive Committee sets them
  currency TEXT NOT NULL DEFAULT 'INR',
  fee_registration NUMERIC(10,2),
  fee_initial NUMERIC(10,2),
  fee_renewal NUMERIC(10,2),

  -- Receipts (both modes built; super-admin picks the active one)
  receipt_mode receipt_mode NOT NULL DEFAULT 'plain',
  receipt_prefix TEXT NOT NULL DEFAULT 'AAA',

  -- Rollout controls (decisions #9-11). Fully dark by default.
  module_state membership_module_state NOT NULL DEFAULT 'hidden',
  preview_user_ids UUID[] NOT NULL DEFAULT '{}',
  ec_resolution_ref TEXT,

  -- Incremental sub-toggles
  payments_offline_enabled BOOLEAN NOT NULL DEFAULT true,
  gateway_provider TEXT NOT NULL DEFAULT 'none',
  gateway_enabled BOOLEAN NOT NULL DEFAULT false,
  gating_enforced BOOLEAN NOT NULL DEFAULT false,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO aaa_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Membership (current standing, one row per member) + payments + receipts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_member_id UUID NOT NULL UNIQUE REFERENCES alumni_members(id) ON DELETE CASCADE,
  member_type member_type NOT NULL DEFAULT 'ajeet',

  registration_fee_paid BOOLEAN NOT NULL DEFAULT false,
  registration_paid_at TIMESTAMPTZ,

  -- Current paid period (FY-aligned, Art 4(v)). valid_through NULL = not active.
  current_period_fy INT,
  valid_from DATE,
  valid_through DATE,

  -- Future-proofing for Ajeet Alumni Chapter funds (Art 16-17). 'central' for now.
  fund TEXT NOT NULL DEFAULT 'central',

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memberships_member ON memberships(alumni_member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_valid_through ON memberships(valid_through);

CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_member_id UUID NOT NULL REFERENCES alumni_members(id) ON DELETE CASCADE,
  fee_kind payment_fee_kind NOT NULL,
  period_fy INT,                       -- FY the payment covers (e.g. 2026 = FY 2026-27)
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  source payment_source NOT NULL DEFAULT 'offline',
  method TEXT,                         -- offline: cheque / upi / cash / bank_transfer
  reference TEXT,                      -- cheque no / UTR / txn reference
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  status payment_status NOT NULL DEFAULT 'recorded',
  idempotency_key TEXT UNIQUE,
  receipt_id UUID,                     -- FK added after receipts table exists
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_member ON membership_payments(alumni_member_id);

CREATE TABLE IF NOT EXISTS membership_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL UNIQUE,
  mode receipt_mode NOT NULL,
  financial_year INT NOT NULL,
  alumni_member_id UUID NOT NULL REFERENCES alumni_members(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES membership_payments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  entity_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_receipts_member ON membership_receipts(alumni_member_id);

DO $$ BEGIN
  ALTER TABLE membership_payments
    ADD CONSTRAINT membership_payments_receipt_fk
    FOREIGN KEY (receipt_id) REFERENCES membership_receipts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-financial-year receipt counter (Art 21(b) numbered receipts).
CREATE TABLE IF NOT EXISTS membership_receipt_counters (
  financial_year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Helper functions (visibility / live state)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION membership_is_live()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT module_state = 'live' FROM aaa_settings WHERE id = 1), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Super-admins always; trusted testers on the preview allowlist (decision #10).
CREATE OR REPLACE FUNCTION can_preview_membership()
RETURNS BOOLEAN AS $$
  SELECT is_super_admin()
    OR EXISTS (
      SELECT 1 FROM aaa_settings
      WHERE id = 1 AND auth.uid() = ANY(preview_user_ids)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Who can see/operate the membership admin surface: super-admins + preview testers
-- always; regular admins only once the module is live.
CREATE OR REPLACE FUNCTION can_manage_membership()
RETURNS BOOLEAN AS $$
  SELECT can_preview_membership() OR (membership_is_live() AND is_admin());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE aaa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_receipt_counters ENABLE ROW LEVEL SECURITY;

-- Settings: readable by those who can manage; only super-admins write.
DROP POLICY IF EXISTS aaa_settings_select ON aaa_settings;
CREATE POLICY aaa_settings_select ON aaa_settings
  FOR SELECT USING (can_manage_membership());

DROP POLICY IF EXISTS aaa_settings_write ON aaa_settings;
CREATE POLICY aaa_settings_write ON aaa_settings
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Memberships: a member sees their own; managers see all; writes via RPC/admin.
DROP POLICY IF EXISTS memberships_select ON memberships;
CREATE POLICY memberships_select ON memberships
  FOR SELECT USING (
    can_manage_membership()
    OR alumni_member_id = own_alumni_member_id()
  );

DROP POLICY IF EXISTS memberships_admin ON memberships;
CREATE POLICY memberships_admin ON memberships
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Payments: own (read) + managers; writes via RPC (security definer) or admin.
DROP POLICY IF EXISTS membership_payments_select ON membership_payments;
CREATE POLICY membership_payments_select ON membership_payments
  FOR SELECT USING (
    can_manage_membership()
    OR alumni_member_id = own_alumni_member_id()
  );

DROP POLICY IF EXISTS membership_payments_admin ON membership_payments;
CREATE POLICY membership_payments_admin ON membership_payments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Receipts: own (read) + managers; writes via RPC or admin.
DROP POLICY IF EXISTS membership_receipts_select ON membership_receipts;
CREATE POLICY membership_receipts_select ON membership_receipts
  FOR SELECT USING (
    can_manage_membership()
    OR alumni_member_id = own_alumni_member_id()
  );

DROP POLICY IF EXISTS membership_receipts_admin ON membership_receipts;
CREATE POLICY membership_receipts_admin ON membership_receipts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Counters: admin only.
DROP POLICY IF EXISTS membership_receipt_counters_admin ON membership_receipt_counters;
CREATE POLICY membership_receipt_counters_admin ON membership_receipt_counters
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ---------------------------------------------------------------------------
-- Rollout guard: enforce the go-live gate + stamp + audit every state change.
-- Direct super-admin updates to aaa_settings are allowed; this trigger makes
-- the EC-resolution requirement and audit logging unavoidable.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aaa_settings_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Going live (or to coming_soon) requires a recorded EC resolution reference.
  IF NEW.module_state IN ('live', 'coming_soon')
     AND COALESCE(btrim(NEW.ec_resolution_ref), '') = '' THEN
    RAISE EXCEPTION 'A recorded EC resolution reference is required to enable the membership module';
  END IF;

  NEW.updated_at := now();
  NEW.updated_by := auth.uid();

  IF TG_OP = 'UPDATE' AND NEW.module_state IS DISTINCT FROM OLD.module_state THEN
    INSERT INTO admin_audit_log (actor_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'membership_module_state_change',
      'aaa_settings',
      NULL,
      jsonb_build_object(
        'from', OLD.module_state,
        'to', NEW.module_state,
        'ec_resolution_ref', NEW.ec_resolution_ref
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_settings_guard_trigger ON aaa_settings;
CREATE TRIGGER aaa_settings_guard_trigger
  BEFORE INSERT OR UPDATE ON aaa_settings
  FOR EACH ROW EXECUTE FUNCTION aaa_settings_guard();

GRANT EXECUTE ON FUNCTION membership_is_live() TO authenticated;
GRANT EXECUTE ON FUNCTION can_preview_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_membership() TO authenticated;
