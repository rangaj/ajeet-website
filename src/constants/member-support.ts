import type {
  EmailProvider,
  ImportStoredPayload,
  MemberEmailStatus,
  MemberEmailType,
  MemberSupportApprovalRequest,
  MemberSupportImportSnapshot,
  MemberSupportSnapshot,
  MemberSupportSnapshotMember,
  MemberSupportTimelineEvent,
} from "@/types/member-support";

export const SUPPORT_DASHBOARD_FILTERS = [
  { key: "awaiting_verification" as const, label: "Awaiting Verification" },
  { key: "pending_claims" as const, label: "Pending Claims" },
  { key: "email_failures" as const, label: "Email Failures" },
  { key: "recently_approved" as const, label: "Recently Approved" },
  { key: "incomplete_registrations" as const, label: "Incomplete Registrations" },
];

export const EMAIL_TYPE_LABELS: Record<MemberEmailType, string> = {
  claim_verification: "Claim Verification",
  registration_verification: "Registration Verification",
  password_reset: "Password Reset",
  email_change_verification: "Email Change Verification",
  claim_approved: "Claim Approved",
  registration_approved: "Registration Approved",
  request_rejected: "Request Rejected",
  more_info_required: "More Information Required",
  request_submitted: "Request Submitted",
};

export const PROVIDER_LABELS: Record<EmailProvider, string> = {
  auth_service: "Authentication Service",
  resend: "Resend",
};

export function displayEmailStatus(
  provider: EmailProvider,
  status: MemberEmailStatus
): string {
  if (provider === "auth_service") {
    if (status === "failed") return "Failed";
    if (status === "triggered") return "Triggered";
    return "Sent to Authentication Service";
  }

  const labels: Record<MemberEmailStatus, string> = {
    triggered: "Triggered",
    sent_to_auth_service: "Sent to Authentication Service",
    queued: "Queued",
    sent: "Sent",
    delivered: "Delivered",
    opened: "Opened",
    clicked: "Clicked",
    bounced: "Bounced",
    failed: "Failed",
    suppressed: "Suppressed",
    unknown: "Unknown",
  };
  return labels[status] ?? status;
}

export function emailStatusVariant(
  provider: EmailProvider,
  status: MemberEmailStatus
): "default" | "success" | "warning" | "danger" {
  if (status === "failed" || status === "bounced" || status === "suppressed") {
    return "danger";
  }
  if (provider === "auth_service") return "default";
  if (status === "delivered" || status === "opened" || status === "clicked" || status === "sent") {
    return "success";
  }
  return "warning";
}

export function formatTriggerSource(source: string): string {
  if (source === "system") return "System";
  if (source === "member") return "Member";
  if (/^[0-9a-f-]{36}$/i.test(source)) return "Admin";
  return source;
}

export function deriveClaimStage(
  member: MemberSupportSnapshotMember,
  requests: MemberSupportApprovalRequest[]
): string {
  const latest = requests[0];
  if (latest?.status === "awaiting_email_verification") return "Awaiting email verification";
  if (latest?.status === "pending_review" || latest?.status === "more_info_required") {
    return "Awaiting approval";
  }
  if (latest?.status === "rejected") return "Rejected";
  if (member.status === "imported_unclaimed" && !latest) return "Imported only — not claimed";
  if (member.status === "approved" && member.user_id) return "Completed on this platform";
  if (latest?.status === "approved") return "Approved";
  if (latest?.status === "expired") return "Verification expired";
  return member.status.replace(/_/g, " ");
}

export function deriveRegistrationStage(member: MemberSupportSnapshotMember): string {
  if (member.user_id) return "Active on this platform";
  if (member.status === "approved") return "Approved — no account yet";
  if (member.status === "imported_unclaimed") return "Not started (legacy import)";
  return member.status.replace(/_/g, " ");
}

type ImportField = {
  label: string;
  current: string | null;
  original: string | null;
};

function pickFromObject(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

/** Read import values from nested staging payload (mapped + raw CSV) or legacy flat rows. */
function pickImportValue(
  payload: ImportStoredPayload | null | undefined,
  mappedKeys: string[],
  rawKeys: string[]
): string | null {
  if (!payload) return null;

  if (payload.mapped || payload.raw) {
    const fromMapped = pickFromObject(payload.mapped, mappedKeys);
    if (fromMapped) return fromMapped;
    return pickFromObject(payload.raw, rawKeys);
  }

  return pickFromObject(payload, [...mappedKeys, ...rawKeys]);
}

export function buildImportComparison(
  member: MemberSupportSnapshotMember,
  importSnapshot: MemberSupportImportSnapshot
): ImportField[] {
  const payload = importSnapshot?.raw_payload ?? null;
  return [
    {
      label: "Name",
      current: member.name,
      original: pickImportValue(payload, ["name"], ["Name", "name"]),
    },
    {
      label: "Roll Number",
      current: member.roll_number,
      original: pickImportValue(payload, ["roll_number"], ["Roll no", "Roll No"]),
    },
    {
      label: "Batch",
      current: member.course_end_year ? String(member.course_end_year) : null,
      original: pickImportValue(payload, ["course_end_year"], ["Course End Year", "Batch"]),
    },
    {
      label: "House",
      current: member.house,
      original: pickImportValue(payload, ["house"], ["House", "house"]),
    },
    {
      label: "Email",
      current: member.email,
      original: pickImportValue(payload, ["email"], ["email_id", "Email", "email"]),
    },
    {
      label: "Location",
      current: member.current_location,
      original: pickImportValue(
        payload,
        ["current_location"],
        ["Current Location", "current_location"]
      ),
    },
  ];
}

/**
 * Build a strictly factual journey. Every event is backed by real data and tagged
 * with its origin — `legacy` (from the old platform / import) or `platform`
 * (activity on this app). Nothing is assumed or synthesized.
 */
export function buildMemberTimeline(snapshot: MemberSupportSnapshot): MemberSupportTimelineEvent[] {
  const events: MemberSupportTimelineEvent[] = [];
  const { member, import_snapshot, approval_requests, email_events, auth_diagnostics } = snapshot;

  // --- Legacy record (old platform / import) ---
  if (import_snapshot?.imported_at) {
    events.push({
      at: import_snapshot.imported_at,
      label: "Imported from legacy records",
      status: import_snapshot.file_name ? `Source: ${import_snapshot.file_name}` : "Recorded",
      origin: "legacy",
    });
  }

  // Approval date carried in from the old platform (no admin approved it here).
  if (member.approved_at && !member.approved_by) {
    events.push({
      at: member.approved_at,
      label: "Marked approved on legacy platform",
      status: "Legacy record value",
      origin: "legacy",
    });
  }

  // Registered flag carried in from the old platform (no account exists here).
  if (member.registered_at && !member.user_id) {
    events.push({
      at: member.registered_at,
      label: "Marked registered on legacy platform",
      status: "Legacy record value",
      origin: "legacy",
    });
  }

  // --- Activity on this platform (only real, recorded events) ---
  for (const request of approval_requests) {
    events.push({
      at: request.created_at,
      label: request.type === "claim" ? "Claim requested" : "Registration requested",
      status: request.status.replace(/_/g, " "),
      origin: "platform",
    });
  }

  // Verification emails — only when an actual send was logged.
  for (const event of email_events) {
    if (
      event.email_type === "claim_verification" ||
      event.email_type === "registration_verification"
    ) {
      events.push({
        at: event.created_at,
        label: "Verification email sent",
        status: displayEmailStatus(event.provider, event.status),
        origin: "platform",
      });
    }
  }

  // Approved on this platform — only when an admin approved it (approved_by set).
  if (member.approved_by) {
    const approvedRequest = approval_requests.find((request) => request.status === "approved");
    const approvedAt = approvedRequest?.reviewed_at ?? member.approved_at;
    if (approvedAt) {
      events.push({
        at: approvedAt,
        label: "Approved on this platform",
        status: "Approved by admin",
        origin: "platform",
      });
    }
  }

  // Password set on this platform.
  if (auth_diagnostics?.password_set && auth_diagnostics.password_set_at) {
    events.push({
      at: auth_diagnostics.password_set_at,
      label: "Password set",
      status: "Completed",
      origin: "platform",
    });
  }

  // Most recent sign-in on this platform.
  if (auth_diagnostics?.last_login) {
    events.push({
      at: auth_diagnostics.last_login,
      label: "Last sign-in",
      status: "Recorded",
      origin: "platform",
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function memberSummaryText(snapshot: MemberSupportSnapshot): string {
  const { member } = snapshot;
  const lines = [
    `Name: ${member.name}`,
    `Roll: ${member.roll_number}`,
    `Email: ${member.email ?? "—"}`,
    `Status: ${member.status}`,
    `Batch: ${member.course_end_year ?? "—"}`,
    `House: ${member.house ?? "—"}`,
  ];
  return lines.join("\n");
}
