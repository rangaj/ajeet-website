import { supabase } from "@/lib/supabase";
import type {
  AaaSettings,
  AdminMembershipSummary,
  ElectoralRollRow,
  MemberType,
  MembershipPaymentRow,
  MembershipReceiptRow,
  MembershipRollRow,
  MembershipSummary,
  PaymentFeeKind,
} from "@/types/database";

// --- Visibility / rollout ----------------------------------------------------

export async function membershipIsLive() {
  return supabase.rpc("membership_is_live");
}

export async function canPreviewMembership() {
  return supabase.rpc("can_preview_membership");
}

export async function canManageMembership() {
  return supabase.rpc("can_manage_membership");
}

// --- Settings (super-admin) --------------------------------------------------

export async function fetchMembershipSettings() {
  return supabase
    .from("aaa_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()
    .then(({ data, error }) => ({ data: data as AaaSettings | null, error }));
}

export async function updateMembershipSettings(patch: Partial<AaaSettings>) {
  return supabase.from("aaa_settings").update(patch).eq("id", 1);
}

// --- Payments / receipts -----------------------------------------------------

export type RecordOfflinePaymentParams = {
  alumniMemberId: string;
  feeKind: PaymentFeeKind;
  amount: number;
  periodFy?: number | null;
  method?: string | null;
  reference?: string | null;
  issueReceipt?: boolean;
  idempotencyKey?: string | null;
  notes?: string | null;
};

export async function recordOfflinePayment(params: RecordOfflinePaymentParams) {
  return supabase.rpc("record_offline_payment", {
    p_alumni_member_id: params.alumniMemberId,
    p_fee_kind: params.feeKind,
    p_amount: params.amount,
    p_period_fy: params.periodFy ?? null,
    p_method: params.method ?? null,
    p_reference: params.reference ?? null,
    p_issue_receipt: params.issueReceipt ?? true,
    p_idempotency_key: params.idempotencyKey ?? null,
    p_notes: params.notes ?? null,
  });
}

export async function setMemberType(alumniMemberId: string, memberType: MemberType) {
  return supabase.rpc("set_member_type", {
    p_alumni_member_id: alumniMemberId,
    p_member_type: memberType,
  });
}

export async function fetchMemberPayments(alumniMemberId: string) {
  return supabase
    .from("membership_payments")
    .select("*")
    .eq("alumni_member_id", alumniMemberId)
    .order("created_at", { ascending: false })
    .then(({ data, error }) => ({
      data: (data ?? []) as MembershipPaymentRow[],
      error,
    }));
}

export async function fetchMemberReceipts(alumniMemberId: string) {
  return supabase
    .from("membership_receipts")
    .select("*")
    .eq("alumni_member_id", alumniMemberId)
    .order("issued_at", { ascending: false })
    .then(({ data, error }) => ({
      data: (data ?? []) as MembershipReceiptRow[],
      error,
    }));
}

// --- Rolls -------------------------------------------------------------------

export async function fetchMembershipRoll(asOf?: string | null) {
  return supabase
    .rpc("membership_roll", { p_as_of: asOf ?? null })
    .then(({ data, error }) => ({
      data: (data ?? []) as MembershipRollRow[],
      error,
    }));
}

export async function fetchElectoralRoll(recordDate?: string | null) {
  return supabase
    .rpc("membership_electoral_roll", { p_record_date: recordDate ?? null })
    .then(({ data, error }) => ({
      data: (data ?? []) as ElectoralRollRow[],
      error,
    }));
}

// --- Summaries ---------------------------------------------------------------

export async function fetchMyMembershipSummary() {
  return supabase.rpc("my_membership_summary").then(({ data, error }) => ({
    data: data as MembershipSummary | null,
    error,
  }));
}

export async function fetchAdminMemberMembership(alumniMemberId: string) {
  return supabase
    .rpc("admin_member_membership", { p_alumni_member_id: alumniMemberId })
    .then(({ data, error }) => ({
      data: data as AdminMembershipSummary | null,
      error,
    }));
}
