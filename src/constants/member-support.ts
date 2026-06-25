import type {
  EmailProvider,
  MemberEmailStatus,
  MemberEmailType,
  MemberSupportApprovalRequest,
  MemberSupportEmailEvent,
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
  if (member.status === "imported_unclaimed" && !latest) return "Imported only";
  if (member.status === "approved" && member.user_id) return "Completed";
  if (latest?.status === "approved") return "Approved";
  if (latest?.status === "expired") return "Verification expired";
  return member.status.replace(/_/g, " ");
}

export function deriveRegistrationStage(member: MemberSupportSnapshotMember): string {
  if (member.registered && member.registered_at) return "Registration completed";
  if (member.status === "approved" && !member.user_id) return "Verification pending";
  if (member.status === "approved" && member.user_id && !member.registered) {
    return "Registration started";
  }
  if (member.status === "imported_unclaimed") return "Not started";
  return "Unknown";
}

type ImportField = {
  label: string;
  current: string | null;
  original: string | null;
};

function pickImportValue(
  raw: Record<string, string> | null | undefined,
  keys: string[]
): string | null {
  if (!raw) return null;
  for (const key of keys) {
    const value = raw[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return null;
}

export function buildImportComparison(
  member: MemberSupportSnapshotMember,
  importSnapshot: MemberSupportImportSnapshot
): ImportField[] {
  const raw = importSnapshot?.raw_payload ?? null;
  return [
    {
      label: "Name",
      current: member.name,
      original: pickImportValue(raw, ["Name", "name"]),
    },
    {
      label: "Roll Number",
      current: member.roll_number,
      original: pickImportValue(raw, ["Roll no", "Roll No", "roll_number"]),
    },
    {
      label: "Batch",
      current: member.course_end_year ? String(member.course_end_year) : null,
      original: pickImportValue(raw, ["Course End Year", "course_end_year", "Batch"]),
    },
    {
      label: "House",
      current: member.house,
      original: pickImportValue(raw, ["House", "house"]),
    },
    {
      label: "Email",
      current: member.email,
      original: pickImportValue(raw, ["email_id", "Email", "email"]),
    },
    {
      label: "Location",
      current: member.current_location,
      original: pickImportValue(raw, ["Current Location", "current_location"]),
    },
  ];
}

function hasLoggedVerification(events: MemberSupportEmailEvent[]): boolean {
  return events.some((event) =>
    event.email_type === "claim_verification" ||
    event.email_type === "registration_verification" ||
    event.email_type === "email_change_verification"
  );
}

export function buildMemberTimeline(snapshot: MemberSupportSnapshot): MemberSupportTimelineEvent[] {
  const events: MemberSupportTimelineEvent[] = [];
  const { member, import_snapshot, approval_requests, email_events } = snapshot;

  if (import_snapshot?.imported_at) {
    events.push({
      at: import_snapshot.imported_at,
      label: "Profile Imported",
      status: "Recorded",
      source: "recorded",
    });
  }

  const claimRequest = approval_requests.find((request) => request.type === "claim")
    ?? approval_requests[0];

  if (claimRequest) {
    events.push({
      at: claimRequest.created_at,
      label: claimRequest.type === "claim" ? "Claim Requested" : "Registration Requested",
      status: claimRequest.status.replace(/_/g, " "),
      source: "recorded",
    });
  }

  if (hasLoggedVerification(email_events)) {
    const latestVerification = email_events.find((event) =>
      event.email_type === "claim_verification" ||
      event.email_type === "registration_verification"
    );
    if (latestVerification) {
      events.push({
        at: latestVerification.created_at,
        label: "Verification Email Sent",
        status: displayEmailStatus(latestVerification.provider, latestVerification.status),
        source: "recorded",
      });
    }
  } else if (claimRequest?.status !== "awaiting_email_verification") {
    events.push({
      at: claimRequest?.updated_at ?? member.created_at,
      label: "Verification Email Sent",
      status: "Historical email information unavailable",
      source: "historical_unavailable",
    });
  }

  if (
    claimRequest &&
    claimRequest.status !== "awaiting_email_verification" &&
    claimRequest.status !== "expired" &&
    claimRequest.updated_at
  ) {
    events.push({
      at: claimRequest.updated_at,
      label: "Email Verified",
      status: "Email link verified",
      source: "recorded",
    });
  }

  const approvedRequest = approval_requests.find((request) => request.status === "approved");
  if (approvedRequest?.reviewed_at) {
    events.push({
      at: approvedRequest.reviewed_at,
      label: "Claim Approved",
      status: "Approved",
      source: "recorded",
    });
  } else if (member.approved_at) {
    events.push({
      at: member.approved_at,
      label: "Profile Activated",
      status: "Approved",
      source: "recorded",
    });
  }

  if (member.registered_at) {
    events.push({
      at: member.registered_at,
      label: "Registration Completed",
      status: "Completed",
      source: "recorded",
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
