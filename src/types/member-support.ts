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

export type SupportDashboardFilter =
  | "awaiting_verification"
  | "pending_claims"
  | "email_failures"
  | "recently_approved"
  | "incomplete_registrations";

export type AdminMemberSearchRow = {
  id: string;
  roll_number: string;
  name: string;
  email: string | null;
  status: string;
  user_id: string | null;
  claim_hint: string | null;
};

export type SupportDashboardMetrics = {
  awaiting_verification: number;
  pending_claims: number;
  email_failures: number;
  recently_approved: number;
  incomplete_registrations: number;
};

export type MemberSupportSnapshotMember = {
  id: string;
  roll_number: string;
  name: string;
  email: string | null;
  house: string | null;
  course_end_year: number | null;
  course_start_year: number | null;
  current_location: string | null;
  status: string;
  user_id: string | null;
  registered: boolean | null;
  registered_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  profile_updated_at: string | null;
  created_at: string;
  updated_at: string;
  pending_email: string | null;
  email_change_requested_at: string | null;
  legacy_admin_note: string | null;
  import_batch_id: string | null;
};

export type MemberSupportImportSnapshot = {
  raw_payload: Record<string, string>;
  import_batch_id: string;
  file_name: string;
  imported_at: string;
  row_number: number;
} | null;

export type MemberSupportApprovalRequest = {
  id: string;
  type: string;
  status: string;
  submitted_email: string;
  submitted_name: string | null;
  reviewer_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  email_verification_expires_at: string | null;
  created_at: string;
  updated_at: string;
  reviewer_email: string | null;
};

export type MemberSupportEmailEvent = {
  id: string;
  email_type: MemberEmailType;
  provider: EmailProvider;
  recipient: string;
  message_id: string | null;
  status: MemberEmailStatus;
  error_message: string | null;
  trigger_source: string;
  created_at: string;
  approval_request_id: string | null;
};

export type MemberSupportNote = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_email: string | null;
};

export type MemberSupportAuditEntry = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_id: string;
  actor_email: string | null;
};

export type MemberSupportAuthDiagnostics = {
  account_exists: boolean;
  email_verified: boolean;
  password_set: boolean;
  password_set_at?: string | null;
  last_login: string | null;
  auth_email: string | null;
  member_status?: string | null;
};

export type MemberSupportSnapshot = {
  member: MemberSupportSnapshotMember;
  import_snapshot: MemberSupportImportSnapshot;
  approval_requests: MemberSupportApprovalRequest[];
  email_events: MemberSupportEmailEvent[];
  support_notes: MemberSupportNote[];
  audit_log: MemberSupportAuditEntry[];
  auth_diagnostics: MemberSupportAuthDiagnostics;
};

export type MemberSupportTimelineEvent = {
  at: string;
  label: string;
  status: string;
  source: "recorded" | "historical_unavailable";
};
