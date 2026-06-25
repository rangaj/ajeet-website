import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type EmailProvider = "auth_service" | "resend";

export type MemberEmailType =
  | "claim_verification"
  | "registration_verification"
  | "password_reset"
  | "email_change_verification"
  | "claim_approved"
  | "registration_approved"
  | "request_rejected"
  | "more_info_required"
  | "request_submitted";

export type MemberEmailStatus =
  | "triggered"
  | "sent_to_auth_service"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "failed"
  | "suppressed"
  | "unknown";

export type LogMemberEmailParams = {
  alumniMemberId?: string | null;
  approvalRequestId?: string | null;
  emailType: MemberEmailType;
  provider: EmailProvider;
  recipient: string;
  status: MemberEmailStatus;
  messageId?: string | null;
  errorMessage?: string | null;
  triggerSource?: string;
};

export async function logMemberEmailEvent(
  adminClient: SupabaseClient,
  params: LogMemberEmailParams
): Promise<void> {
  const { error } = await adminClient.from("member_email_events").insert({
    alumni_member_id: params.alumniMemberId ?? null,
    approval_request_id: params.approvalRequestId ?? null,
    email_type: params.emailType,
    provider: params.provider,
    recipient: params.recipient,
    status: params.status,
    message_id: params.messageId ?? null,
    error_message: params.errorMessage ?? null,
    trigger_source: params.triggerSource ?? "system",
  });

  if (error) {
    console.error("member_email_events insert failed:", error.message);
  }
}

export function authEmailStatus(success: boolean): MemberEmailStatus {
  return success ? "sent_to_auth_service" : "failed";
}

export function resendEmailStatus(
  ok: boolean,
  resendId?: string | null
): { status: MemberEmailStatus; messageId: string | null } {
  if (!ok) return { status: "failed", messageId: null };
  return { status: "sent", messageId: resendId ?? null };
}

export function notifyEmailType(
  event: string,
  requestType: string
): MemberEmailType {
  if (event === "approved") {
    return requestType === "claim" ? "claim_approved" : "registration_approved";
  }
  if (event === "rejected") return "request_rejected";
  if (event === "more_info") return "more_info_required";
  return "request_submitted";
}
