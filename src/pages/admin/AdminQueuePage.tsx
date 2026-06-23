import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase, invokeFunction } from "@/lib/supabase";
import { approveRegistration, rejectRegistration } from "@/lib/data-access";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge, Alert } from "@/components/ui/Card";
import type {
  ApprovalRequest,
  ApprovalType,
  ApprovalStatus,
  AlumniMember,
  Json,
} from "@/types/database";

const TABS: { key: ApprovalType | "all" | "approved" | "rejected"; label: string }[] = [
  { key: "all", label: "All Pending" },
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
  submitted?: string | null;
  onFile?: string | null;
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

function RequestDetails({ request }: { request: QueueRequest }) {
  const payload = request.submitted_payload;
  const member = request.member;
  const isClaim = request.type === "claim" || request.type === "conflict";

  if (isClaim && member) {
    return (
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <VerificationBadge payload={payload} />
          {member.status && (
            <Badge variant={member.status === "imported_unclaimed" ? "warning" : "default"}>
              On file: {member.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <div className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[8rem_1fr_1fr] sm:gap-2">
          <span />
          <span>Submitted</span>
          <span>On file</span>
        </div>
        <dl>
          <DetailRow label="Name" submitted={request.submitted_name} onFile={member.name} />
          <DetailRow label="Roll" submitted={request.roll_number} onFile={request.roll_number} />
          <DetailRow label="Email" submitted={request.submitted_email} onFile={member.email} emphasize />
          <DetailRow label="Mobile" submitted={request.submitted_phone} onFile={member.mobile_phone} />
          <DetailRow
            label="Date of birth"
            submitted={request.submitted_dob}
            onFile={member.date_of_birth}
          />
          {!isRecord(payload) || payload.verification !== "auto_matched" ? (
            <DetailRow
              label="Imported email"
              submitted={request.submitted_email}
              onFile={payloadString(payload, "imported_email")}
              emphasize
            />
          ) : null}
          <DetailRow label="Course" submitted={payloadString(payload, "course")} onFile={member.course} />
          <DetailRow label="Stream" submitted={payloadString(payload, "stream")} onFile={member.stream} />
          <DetailRow
            label="Batch end"
            submitted={payloadString(payload, "course_end_year")}
            onFile={member.course_end_year}
          />
          <DetailRow label="Company" submitted={payloadString(payload, "company")} onFile={member.company} />
          <DetailRow
            label="Location"
            submitted={payloadString(payload, "current_location")}
            onFile={member.current_location}
          />
          <DetailRow label="House" submitted={payloadString(payload, "house")} onFile={member.house} />
        </dl>
      </div>
    );
  }

  const payloadEntries = isRecord(payload)
    ? Object.entries(payload).filter(
        ([key, value]) =>
          key !== "verification" &&
          key !== "imported_email" &&
          value !== null &&
          value !== undefined &&
          value !== ""
      )
    : [];

  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      {isRecord(payload) && payload.verification ? (
        <div className="mb-3">
          <VerificationBadge payload={payload} />
        </div>
      ) : null}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Name</dt>
          <dd className="text-sm text-slate-800">{formatValue(request.submitted_name)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-400">Roll</dt>
          <dd className="text-sm text-slate-800">{formatValue(request.roll_number)}</dd>
        </div>
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
        {payloadEntries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs font-medium uppercase text-slate-400">
              {PAYLOAD_FIELD_LABELS[key] ?? key.replace(/_/g, " ")}
            </dt>
            <dd className="text-sm text-slate-800">{formatValue(String(value))}</dd>
          </div>
        ))}
      </dl>
      {request.evidence_path && (
        <p className="mt-3 text-sm text-slate-600">
          Evidence: <span className="font-mono text-xs">{request.evidence_path}</span>
        </p>
      )}
    </div>
  );
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
    let query = supabase
      .from("approval_requests")
      .select(
        `
        *,
        member:alumni_members(
          name, email, mobile_phone, date_of_birth, course, stream,
          course_start_year, course_end_year, company, job_position,
          current_location, home_town, house, status
        )
      `
      )
      .order("created_at", { ascending: false });

    if (tab === "all") query = query.in("status", ["pending_review", "more_info_required"]);
    else if (tab === "approved" || tab === "rejected") query = query.eq("status", tab as ApprovalStatus);
    else query = query.eq("type", tab as ApprovalType).in("status", ["pending_review", "more_info_required"]);

    const { data, error: loadError } = await query;
    if (loadError) {
      setError(loadError.message);
      setRequests([]);
      return;
    }
    setRequests((data as QueueRequest[]) ?? []);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Review Queue</h2>
          <p className="text-sm text-slate-500">
            Compare submitted details with on-file records. Select multiple to approve or reject in bulk.
          </p>
        </div>
        {isPendingTab && requests.length > 0 && (
          <p className="text-sm text-slate-500">
            {requests.length} pending · {selected.size} selected
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.key ? "bg-brand-100 text-brand-800 font-medium" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPendingTab && actionableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
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
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-4 transition-colors ${
                selected.has(r.id) ? "border-brand-300 bg-brand-50/30" : "border-slate-100"
              }`}
            >
              <div className="flex gap-3">
                {isPendingTab && actionable && (
                  <div className="pt-1">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{TYPE_LABELS[r.type]}</Badge>
                    <Badge
                      variant={
                        r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"
                      }
                    >
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm text-slate-500">{formatDate(r.created_at)}</span>
                    {r.reviewed_at && (
                      <span className="text-sm text-slate-400">· Reviewed {formatDate(r.reviewed_at)}</span>
                    )}
                  </div>

                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {r.submitted_name ?? "—"}
                    <span className="font-normal text-slate-500"> · Roll {r.roll_number}</span>
                  </p>

                  <RequestDetails request={r} />

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
        {requests.length === 0 && <p className="text-slate-500">No requests in this tab.</p>}
      </ul>
    </div>
  );
}
