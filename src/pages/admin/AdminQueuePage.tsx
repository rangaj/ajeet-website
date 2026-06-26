// Admin review queue — synced with GitHub main (build >= pending-profile-fix)
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, XCircle } from "lucide-react";
import { supabase, invokeFunction } from "@/lib/supabase";
import { approveRegistration, rejectRegistration } from "@/lib/data-access";
import { formatHouses, formatHousesDisplay, parseHouses } from "@/constants/houses";
import { formatEmailLinkExpiry, isEmailLinkExpired } from "@/lib/approval-email";
import { HouseColorDots, HouseColorStrip } from "@/components/house/HouseColorDots";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge, Alert } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  ApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  AlumniMember,
  Json,
} from "@/types/database";

const TABS: { key: ApprovalType | "all" | "approved" | "rejected" | "awaiting_email_link"; label: string }[] = [
  { key: "all", label: "All Pending" },
  { key: "awaiting_email_link", label: "Awaiting email link" },
  { key: "claim", label: "Claims" },
  { key: "new_registration", label: "New Registrations" },
  { key: "conflict", label: "Conflicts" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const TYPE_LABELS: Record<ApprovalType, string> = {
  claim: "Claim",
  new_registration: "New registration",
  conflict: "Conflict",
};

const PAYLOAD_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  course: "Course",
  stream: "Stream",
  course_start_year: "Start year",
  course_end_year: "End year",
  mobile_phone: "Mobile",
  company: "Company",
  job_position: "Position",
  current_location: "Location",
  home_town: "Home town",
  house: "House",
  date_of_birth: "Date of birth",
  professional_skills: "Skills",
  industries_worked_in: "Industries",
};

type MemberSnapshot = Pick<
  AlumniMember,
  | "name"
  | "email"
  | "mobile_phone"
  | "date_of_birth"
  | "course"
  | "stream"
  | "course_start_year"
  | "course_end_year"
  | "company"
  | "job_position"
  | "current_location"
  | "home_town"
  | "house"
  | "status"
>;

type QueueRequest = ApprovalRequest & { member: MemberSnapshot | null };

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function payloadString(payload: Json, key: string): string | null {
  if (!isRecord(payload)) return null;
  const value = payload[key];
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function DetailRow({
  label,
  submitted,
  onFile,
  emphasize,
}: {
  label: string;
  submitted?: string | number | null;
  onFile?: string | number | null;
  emphasize?: boolean;
}) {
  const mismatch =
    onFile !== undefined &&
    submitted !== undefined &&
    formatValue(submitted) !== "—" &&
    formatValue(onFile) !== "—" &&
    formatValue(submitted).toLowerCase() !== formatValue(onFile).toLowerCase();

  return (
    <div
      className={`grid gap-2 border-b border-slate-100 py-2 text-sm last:border-0 sm:grid-cols-[8rem_1fr_1fr] ${
        emphasize ? "bg-amber-50/60 -mx-3 px-3 rounded-lg" : ""
      }`}
    >
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className={mismatch ? "font-medium text-amber-900" : "text-slate-800"}>
        {formatValue(submitted)}
      </dd>
      {onFile !== undefined && (
        <dd className={mismatch ? "text-amber-800" : "text-slate-600"}>{formatValue(onFile)}</dd>
      )}
    </div>
  );
}

function VerificationBadge({ payload }: { payload: Json }) {
  const verification = isRecord(payload) ? String(payload.verification ?? "") : "";
  if (verification === "auto_matched") {
    return <Badge variant="success">Auto-matched</Badge>;
  }
  if (verification === "admin_review") {
    return <Badge variant="warning">Manual review</Badge>;
  }
  return null;
}

function houseLabelFromPayload(payload: Json): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.house === "string" && payload.house) return payload.house;
  if (Array.isArray(payload.houses)) {
    return formatHouses(payload.houses as string[]);
  }
  return null;
}

function passingYear(request: QueueRequest): string {
  const fromPayload = payloadString(request.submitted_payload, "course_end_year");
  if (fromPayload) return fromPayload;
  if (request.member?.course_end_year != null) return String(request.member.course_end_year);
  return "—";
}

function houseRawValue(request: QueueRequest): string | null {
  const fromPayload = houseLabelFromPayload(request.submitted_payload);
  if (fromPayload) return fromPayload;
  return request.member?.house ?? null;
}

function displayHouses(request: QueueRequest): string {
  const raw = houseLabelFromPayload(request.submitted_payload) ?? request.member?.house;
  return formatValue(raw ? formatHousesDisplay(raw) : null);
}

function displayName(request: QueueRequest): string {
  return formatValue(request.submitted_name ?? request.member?.name);
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function RequestExtraDetails({ request }: { request: QueueRequest }) {
  const payload = request.submitted_payload;
  const member = request.member;
  const isClaim = request.type === "claim" || request.type === "conflict";

  const payloadEntries = isRecord(payload)
    ? Object.entries(payload).filter(
        ([key, value]) =>
          !["verification", "imported_email", "house", "houses", "name", "course_end_year"].includes(key) &&
          value !== null &&
          value !== undefined &&
          value !== ""
      )
    : [];

  return (
    <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50/50">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-slate-50">
        More details
      </summary>
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <VerificationBadge payload={payload} />
          {member?.status && (
            <Badge variant={member.status === "imported_unclaimed" ? "warning" : "default"}>
              On file: {member.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>

        {isClaim && member ? (
          <>
            <div className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[8rem_1fr_1fr] sm:gap-2">
              <span />
              <span>Submitted</span>
              <span>On file</span>
            </div>
            <dl>
              <DetailRow label="Email" submitted={request.submitted_email} onFile={member.email} emphasize />
              <DetailRow label="Mobile" submitted={request.submitted_phone} onFile={member.mobile_phone} />
              <DetailRow label="Date of birth" submitted={request.submitted_dob} onFile={member.date_of_birth} />
              {!isRecord(payload) || payload.verification !== "auto_matched" ? (
                <DetailRow
                  label="Imported email"
                  submitted={request.submitted_email}
                  onFile={payloadString(payload, "imported_email")}
                  emphasize
                />
              ) : null}
              <DetailRow label="Start year" submitted={payloadString(payload, "course_start_year")} onFile={member.course_start_year} />
              <DetailRow label="Company" submitted={payloadString(payload, "company")} onFile={member.company} />
              <DetailRow label="Location" submitted={payloadString(payload, "current_location")} onFile={member.current_location} />
            </dl>
          </>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Email</dt>
              <dd className="text-sm text-slate-800">{formatValue(request.submitted_email)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Mobile</dt>
              <dd className="text-sm text-slate-800">{formatValue(request.submitted_phone)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Date of birth</dt>
              <dd className="text-sm text-slate-800">{formatValue(request.submitted_dob)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-slate-400">Start year</dt>
              <dd className="text-sm text-slate-800">{formatValue(payloadString(payload, "course_start_year"))}</dd>
            </div>
            {payloadEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs font-medium uppercase text-slate-400">
                  {PAYLOAD_FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
                </dt>
                <dd className="text-sm text-slate-800">{formatValue(String(value))}</dd>
              </div>
            ))}
          </dl>
        )}

        {request.evidence_path && (
          <p className="mt-3 text-sm text-slate-600">
            Evidence: <span className="font-mono text-xs">{request.evidence_path}</span>
          </p>
        )}
      </div>
    </details>
  );
}

function mergeQueueRequests(
  approvals: ApprovalRequest[],
  memberById: Map<string, MemberSnapshot>
): QueueRequest[] {
  return approvals.map((r) => ({
    ...r,
    member: r.alumni_member_id ? memberById.get(r.alumni_member_id) ?? null : null,
  }));
}

export function AdminQueuePage() {
  const [tab, setTab] = useState<string>("all");
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const [bulkNote, setBulkNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isPendingTab = tab === "all" || tab === "claim" || tab === "new_registration" || tab === "conflict";
  const isAwaitingEmailTab = tab === "awaiting_email_link";

  const actionableIds = useMemo(
    () =>
      requests
        .filter((r) => r.status === "pending_review" || r.status === "more_info_required")
        .map((r) => r.id),
    [requests]
  );

  const allActionableSelected =
    actionableIds.length > 0 && actionableIds.every((id) => selected.has(id));

  const load = async () => {
    await supabase.rpc("expire_stale_email_verifications");

    let query = supabase.from("approval_requests").select("*").order("created_at", { ascending: false });

    if (tab === "awaiting_email_link") {
      query = query.in("status", ["awaiting_email_verification", "expired"]);
    } else if (tab === "all") {
      query = query.in("status", ["pending_review", "more_info_required"]);
    } else if (tab === "approved" || tab === "rejected") {
      query = query.eq("status", tab as ApprovalStatus);
    } else {
      query = query.eq("type", tab as ApprovalType).in("status", ["pending_review", "more_info_required"]);
    }

    const { data: rows, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setRequests([]);
      return;
    }

    const approvals = rows ?? [];
    const memberIds = [
      ...new Set(approvals.map((r) => r.alumni_member_id).filter((id): id is string => Boolean(id))),
    ];

    const memberById = new Map<string, MemberSnapshot>();
    if (memberIds.length > 0) {
      const { data: members, error: memberError } = await supabase
        .from("alumni_members")
        .select(
          "id, name, email, mobile_phone, date_of_birth, course, stream, course_start_year, course_end_year, company, job_position, current_location, home_town, house, status"
        )
        .in("id", memberIds);

      if (memberError) {
        setError(memberError.message);
        setRequests([]);
        return;
      }

      for (const member of members ?? []) {
        const { id, ...snapshot } = member;
        memberById.set(id, snapshot);
      }
    }

    setRequests(mergeQueueRequests(approvals, memberById));
    setSelected(new Set());
  };

  useEffect(() => {
    load();
  }, [tab]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allActionableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actionableIds));
    }
  };

  const processRequests = async (ids: string[], action: "approve" | "reject") => {
    if (ids.length === 0) return;

    setLoading(true);
    setError("");
    setMessage("");

    let ok = 0;
    let failed = 0;

    for (const id of ids) {
      const reviewerNote = note[id]?.trim() || bulkNote.trim() || null;
      const { error: actionError } =
        action === "approve"
          ? await approveRegistration(id, reviewerNote)
          : await rejectRegistration(id, reviewerNote);

      if (actionError) {
        failed += 1;
        continue;
      }

      await invokeFunction("notify-registrant", {
        request_id: id,
        event: action === "approve" ? "approved" : "rejected",
        note: reviewerNote,
      }).catch(() => {});

      ok += 1;
    }

    setLoading(false);
    if (failed > 0) {
      setError(`${failed} of ${ids.length} could not be ${action === "approve" ? "approved" : "rejected"}.`);
    }
    if (ok > 0) {
      setMessage(
        `${ok} request${ok === 1 ? "" : "s"} ${action === "approve" ? "approved" : "rejected"}.`
      );
    }
    await load();
  };

  const runBulk = (action: "approve" | "reject") => processRequests([...selected], action);
  const handleApprove = (id: string) => processRequests([id], "approve");
  const handleReject = (id: string) => processRequests([id], "reject");

  const handleResendLink = async (id: string) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await invokeFunction<{ message: string }>("resend-approval-link", {
        request_id: id,
        email_redirect_to: `${window.location.origin}/pending`,
      });
      setMessage(data.message ?? "Verification link resent.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
            Review Queue
          </h2>
          <p className="text-sm text-slate-600">
            {isAwaitingEmailTab
              ? "Submitted but the verification email has not been opened yet. Links expire after 7 days — resend if needed."
              : "Key fields at a glance. Expand a card for email, verification, and other details."}
          </p>
        </div>
        {isPendingTab && requests.length > 0 && (
          <p className="text-sm text-slate-500">
            {requests.length} pending · {selected.size} selected
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Queue filters">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:text-sm",
              tab === t.key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPendingTab && actionableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-white p-4 shadow-card">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={allActionableSelected}
              onChange={toggleSelectAll}
            />
            Select all ({actionableIds.length})
          </label>
          <div className="min-w-[12rem] flex-1">
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Bulk note for selected (optional)"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => runBulk("approve")}
            disabled={loading || selected.size === 0}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve selected
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => runBulk("reject")}
            disabled={loading || selected.size === 0}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject selected
          </Button>
        </div>
      )}

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <ul className="space-y-4">
        {requests.map((r) => {
          const actionable = r.status === "pending_review" || r.status === "more_info_required";
          const expired = isEmailLinkExpired(r);
          const expiryLabel = formatEmailLinkExpiry(r.email_verification_expires_at);
          const houses = parseHouses(houseRawValue(r));
          const batchLine = [
            passingYear(r) !== "—" ? `Batch ${passingYear(r)}` : null,
            r.roll_number ? `Roll ${r.roll_number}` : null,
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <li
              key={r.id}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-white transition-colors",
                selected.has(r.id)
                  ? "border-brand-300 bg-brand-50/30 shadow-card"
                  : "border-surface-border hover:border-brand-200"
              )}
            >
              <HouseColorStrip houses={houses} />
              <div className="flex gap-3 py-4 pl-5 pr-4 sm:py-5 sm:pl-6 sm:pr-5">
                {isPendingTab && actionable && (
                  <div className="pt-1.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelected(r.id)}
                      aria-label={`Select ${r.submitted_name ?? r.roll_number}`}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h3 className="min-w-0 flex-1 font-display text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                      {displayName(r)}
                    </h3>
                    <HouseColorDots houseValue={houseRawValue(r)} className="mt-1.5" />
                  </div>

                  {batchLine && <p className="mt-1 text-sm text-gold-700">{batchLine}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge>{TYPE_LABELS[r.type]}</Badge>
                    <Badge
                      variant={
                        r.status === "approved"
                          ? "success"
                          : r.status === "rejected" || expired
                            ? "danger"
                            : "warning"
                      }
                    >
                      {expired && r.status === "awaiting_email_verification"
                        ? "expired"
                        : r.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm text-slate-500">{formatDate(r.created_at)}</span>
                    {expiryLabel && isAwaitingEmailTab && !expired && (
                      <span className="text-sm text-slate-400">· Link expires {expiryLabel}</span>
                    )}
                    {expired && isAwaitingEmailTab && (
                      <span className="text-sm text-red-600">
                        · Email link expired — resend or user may claim again
                      </span>
                    )}
                    {r.reviewed_at && (
                      <span className="text-sm text-slate-400">· Reviewed {formatDate(r.reviewed_at)}</span>
                    )}
                  </div>

                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <SummaryField label="Roll number" value={formatValue(r.roll_number)} />
                    <SummaryField label="House(s)" value={displayHouses(r)} />
                    <SummaryField label="Year of passing" value={passingYear(r)} />
                  </dl>

                  <RequestExtraDetails request={r} />

                  {isAwaitingEmailTab && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-sm text-slate-600">
                        Email: <strong>{r.submitted_email}</strong>
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResendLink(r.id)}
                        disabled={loading}
                      >
                        <Mail className="mr-1.5 h-4 w-4" />
                        Resend verification link
                      </Button>
                    </div>
                  )}

                  {actionable && (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      <Textarea
                        placeholder="Reviewer note for this request (optional)"
                        value={note[r.id] ?? ""}
                        onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => handleApprove(r.id)} disabled={loading}>
                          Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleReject(r.id)} disabled={loading}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {r.reviewer_note && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      Reviewer note: {r.reviewer_note}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-surface-border bg-white px-4 py-10 text-center text-sm text-slate-500">
            No requests in this tab.
          </p>
        )}
      </ul>
    </div>
  );
}
