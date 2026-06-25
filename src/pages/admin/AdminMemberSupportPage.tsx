import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ClipboardCopy,
  ExternalLink,
  History,
  LifeBuoy,
  Loader2,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  SUPPORT_DASHBOARD_FILTERS,
  buildImportComparison,
  buildMemberTimeline,
  deriveClaimStage,
  deriveRegistrationStage,
  displayEmailStatus,
  emailStatusVariant,
  EMAIL_TYPE_LABELS,
  formatTriggerSource,
  memberSummaryText,
  PROVIDER_LABELS,
} from "@/constants/member-support";
import {
  addMemberSupportNote,
  fetchMemberSupportSnapshot,
  fetchSupportDashboardMetrics,
  searchSupportMembers,
} from "@/lib/data-access";
import { allowAdminDirectoryView } from "@/lib/admin-navigation";
import { formatSupportError } from "@/lib/member-support-errors";
import { formatBatch, formatHousesWithLabel } from "@/lib/alumni-display";
import { invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  AdminMemberSearchRow,
  MemberSupportSnapshot,
  MemberSupportTimelineEvent,
  SupportDashboardFilter,
  SupportDashboardMetrics,
} from "@/types/member-support";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

function JourneyEvent({ event }: { event: MemberSupportTimelineEvent }) {
  const isLegacy = event.origin === "legacy";
  return (
    <li className="flex gap-3">
      <div
        className={cn(
          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isLegacy ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        )}
      >
        {isLegacy ? <History className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-medium text-slate-900">{event.label}</p>
        <p className="text-xs text-slate-500">{formatDateTime(event.at)}</p>
        <p className="break-words text-xs text-slate-600">{event.status}</p>
      </div>
    </li>
  );
}

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-sm font-medium text-slate-900 sm:text-right",
          highlight && "text-amber-700"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function MetricChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors sm:text-sm",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
        )}
      >
        {count}
      </span>
    </button>
  );
}

export function AdminMemberSupportPage() {
  const [metrics, setMetrics] = useState<SupportDashboardMetrics | null>(null);
  const [activeFilter, setActiveFilter] = useState<SupportDashboardFilter | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminMemberSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MemberSupportSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const loadMetrics = useCallback(async () => {
    const { data, error: metricsError } = await fetchSupportDashboardMetrics();
    if (metricsError) {
      setError(formatSupportError(metricsError));
      return;
    }
    if (data) setMetrics(data);
  }, []);

  const runSearch = useCallback(async (searchQuery: string, filter: SupportDashboardFilter | null) => {
    setSearching(true);
    setError("");
    const { data, error: searchError } = await searchSupportMembers(searchQuery, filter);
    setSearching(false);
    if (searchError) {
      setError(formatSupportError(searchError));
      setResults([]);
      return;
    }
    setResults(data);
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void runSearch(query, activeFilter);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, activeFilter, runSearch]);

  const loadSnapshot = useCallback(async (memberId: string) => {
    setLoadingSnapshot(true);
    setError("");
    const { data, error: snapshotError } = await fetchMemberSupportSnapshot(memberId);
    setLoadingSnapshot(false);
    if (snapshotError) {
      setError(formatSupportError(snapshotError));
      setSnapshot(null);
      return;
    }
    setSnapshot(data);
    setEmailDraft(data?.member.email ?? "");
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSnapshot(null);
      return;
    }
    void loadSnapshot(selectedId);
  }, [selectedId, loadSnapshot]);

  const latestRequest = snapshot?.approval_requests[0] ?? null;
  const importComparison = useMemo(
    () => (snapshot ? buildImportComparison(snapshot.member, snapshot.import_snapshot) : []),
    [snapshot]
  );
  const timeline = useMemo(() => (snapshot ? buildMemberTimeline(snapshot) : []), [snapshot]);
  const platformEvents = useMemo(
    () => timeline.filter((event) => event.origin === "platform"),
    [timeline]
  );
  const legacyEvents = useMemo(
    () => timeline.filter((event) => event.origin === "legacy"),
    [timeline]
  );

  const metricCount = (key: SupportDashboardFilter) => metrics?.[key] ?? 0;

  const handleSelectMember = (memberId: string) => {
    setSelectedId(memberId);
    setActionMessage("");
    setShowEmailForm(false);
  };

  const refreshSelected = async () => {
    if (!selectedId) return;
    await loadSnapshot(selectedId);
    await loadMetrics();
    await runSearch(query, activeFilter);
  };

  const handleResendVerification = async () => {
    if (!latestRequest) return;
    if (!window.confirm("Resend verification email to this member?")) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      await invokeFunction("resend-approval-link", { request_id: latestRequest.id });
      setActionMessage("Verification email successfully queued.");
      await refreshSelected();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to send email.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendApproval = async () => {
    const approved = snapshot?.approval_requests.find((request) => request.status === "approved");
    const requestId = approved?.id ?? latestRequest?.id;
    if (!requestId) return;
    if (!window.confirm("Resend approval email to this member?")) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      await invokeFunction("notify-registrant", { request_id: requestId, event: "approved" });
      setActionMessage("Approval email successfully queued.");
      await refreshSelected();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to send email.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendPasswordReset = async () => {
    if (!selectedId) return;
    if (!window.confirm("Resend password reset email to this member?")) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      await invokeFunction("admin-resend-password-reset", { member_id: selectedId });
      setActionMessage("Password reset email successfully queued.");
      await refreshSelected();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Unable to send email.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!selectedId || !emailDraft.trim()) return;
    const nextEmail = emailDraft.trim().toLowerCase();
    if (
      !window.confirm(
        `Update email address to ${nextEmail}? A verification email will be sent where applicable.`
      )
    ) {
      return;
    }
    setActionLoading(true);
    setActionMessage("");
    try {
      await invokeFunction("admin-update-member-email", {
        member_id: selectedId,
        new_email: nextEmail,
      });
      setActionMessage("Email address updated.");
      setShowEmailForm(false);
      await refreshSelected();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not update email.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedId || !noteBody.trim()) return;
    setNoteSaving(true);
    setError("");
    const { error: noteError } = await addMemberSupportNote(selectedId, noteBody.trim());
    setNoteSaving(false);
    if (noteError) {
      setError(formatSupportError(noteError));
      return;
    }
    setNoteBody("");
    await loadSnapshot(selectedId);
  };

  const handleCopySummary = async () => {
    if (!snapshot) return;
    await navigator.clipboard.writeText(memberSummaryText(snapshot));
    setActionMessage("Member details copied to clipboard.");
  };

  const canResendVerification =
    latestRequest?.status === "awaiting_email_verification" ||
    latestRequest?.status === "expired";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-1 h-6 w-6 text-brand-600" aria-hidden />
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Member Support
          </h2>
          <p className="text-sm text-slate-600">
            Investigate onboarding issues, email delivery, and member status without database access.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUPPORT_DASHBOARD_FILTERS.map((filter) => (
          <MetricChip
            key={filter.key}
            label={filter.label}
            count={metricCount(filter.key)}
            active={activeFilter === filter.key}
            onClick={() =>
              setActiveFilter((current) => (current === filter.key ? null : filter.key))
            }
          />
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by roll number, name, or email…"
          className="pl-9"
          aria-label="Search members"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionMessage && <Alert variant="info">{actionMessage}</Alert>}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <Card className="min-w-0 p-0">
          <div className="border-b border-surface-border px-4 py-3">
            <p className="text-sm font-medium text-slate-900">
              {searching ? "Searching…" : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <ul className="max-h-[70vh] divide-y divide-surface-border overflow-y-auto">
            {results.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => handleSelectMember(row.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-brand-50",
                    selectedId === row.id && "bg-brand-50"
                  )}
                >
                  <p className="break-words font-medium text-slate-900">{row.name}</p>
                  <p className="break-words text-xs text-slate-500">
                    Roll {row.roll_number}
                    {row.email ? ` · ${row.email}` : ""}
                  </p>
                  {row.claim_hint && (
                    <p className="mt-1 text-xs text-brand-700">{row.claim_hint}</p>
                  )}
                </button>
              </li>
            ))}
            {!searching && results.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                No members match this search.
              </li>
            )}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          {!selectedId && (
            <Card className="text-sm text-slate-600">
              Select a member to view diagnostics, email activity, and support actions.
            </Card>
          )}

          {selectedId && loadingSnapshot && (
            <Card className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading member details…
            </Card>
          )}

          {snapshot && !loadingSnapshot && (
            <>
              <Card className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{snapshot.member.name}</h3>
                    <p className="text-sm text-slate-600">
                      Roll {snapshot.member.roll_number}
                      {formatBatch(snapshot.member.course_end_year)
                        ? ` · ${formatBatch(snapshot.member.course_end_year)}`
                        : ""}
                      {snapshot.member.house
                        ? ` · ${formatHousesWithLabel(snapshot.member.house)}`
                        : ""}
                    </p>
                  </div>
                  <Badge>{snapshot.member.status.replace(/_/g, " ")}</Badge>
                </div>

                {snapshot.member.pending_email && (
                  <Alert variant="warning">
                    Email change pending verification for {snapshot.member.pending_email}.
                  </Alert>
                )}

                <dl className="grid gap-3 sm:grid-cols-2">
                  <DetailRow label="Current email" value={snapshot.member.email ?? "—"} />
                  <DetailRow
                    label="Claim status"
                    value={deriveClaimStage(snapshot.member, snapshot.approval_requests)}
                  />
                  <DetailRow
                    label="Registration"
                    value={deriveRegistrationStage(snapshot.member)}
                  />
                  <DetailRow
                    label="Profile last updated"
                    value={formatDateTime(snapshot.member.profile_updated_at)}
                  />
                  <DetailRow
                    label="Account created"
                    value={formatDateTime(snapshot.member.created_at)}
                  />
                  <DetailRow
                    label="Last modified"
                    value={formatDateTime(snapshot.member.updated_at)}
                  />
                </dl>

                {snapshot.member.legacy_admin_note && (
                  <Alert variant="info">
                    Legacy import note: {snapshot.member.legacy_admin_note}
                  </Alert>
                )}
              </Card>

              <Card className="space-y-3">
                <SectionTitle>Quick Actions</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowEmailForm((value) => !value)}
                  >
                    <Mail className="h-4 w-4" />
                    Update email
                  </Button>
                  {canResendVerification && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => void handleResendVerification()}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend verification
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => void handleResendApproval()}
                  >
                    <Mail className="h-4 w-4" />
                    Resend approval email
                  </Button>
                  {snapshot.member.user_id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => void handleResendPasswordReset()}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Resend password reset
                    </Button>
                  )}
                  <Link
                    to="/directory"
                    onClick={allowAdminDirectoryView}
                    className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Admin directory
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => void handleCopySummary()}>
                    <ClipboardCopy className="h-4 w-4" />
                    Copy details
                  </Button>
                  {latestRequest && (
                    <Link
                      to="/admin"
                      className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Review queue
                    </Link>
                  )}
                </div>

                {showEmailForm && (
                  <div className="space-y-2 rounded-xl border border-surface-border bg-slate-50 p-4">
                    <label className="text-sm font-medium text-slate-700" htmlFor="support-email">
                      New email address
                    </label>
                    <Input
                      id="support-email"
                      type="email"
                      value={emailDraft}
                      onChange={(event) => setEmailDraft(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={actionLoading || !emailDraft.trim()}
                        onClick={() => void handleUpdateEmail()}
                      >
                        Save email
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowEmailForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="space-y-3">
                <SectionTitle>Imported vs current profile</SectionTitle>
                {snapshot.import_snapshot ? (
                  <>
                    <p className="text-xs text-slate-500">
                      Source: {snapshot.import_snapshot.file_name} · imported{" "}
                      {formatDateTime(snapshot.import_snapshot.imported_at)}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-border text-left text-slate-500">
                            <th className="py-2 pr-4 font-medium">Field</th>
                            <th className="py-2 pr-4 font-medium">Imported</th>
                            <th className="py-2 font-medium">Current</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importComparison.map((row) => {
                            const changed = Boolean(
                              row.original &&
                                row.current &&
                                row.original !== row.current
                            );
                            return (
                              <tr
                                key={row.label}
                                className={cn(
                                  "border-b border-surface-border/70",
                                  changed && "bg-amber-50/60"
                                )}
                              >
                                <td className="py-2 pr-4 font-medium text-slate-700">
                                  {row.label}
                                </td>
                                <td className="py-2 pr-4 text-slate-600">{row.original ?? "—"}</td>
                                <td className="py-2 text-slate-900">
                                  {row.current ?? "—"}
                                  {changed && (
                                    <Badge variant="warning" className="ml-2">
                                      Changed
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">No imported record linked to this member.</p>
                )}
              </Card>

              <Card className="space-y-4">
                <SectionTitle>Member journey</SectionTitle>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Activity on this platform
                  </p>
                  {platformEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity on this platform yet.</p>
                  ) : (
                    <ol className="space-y-3">
                      {platformEvents.map((event) => (
                        <JourneyEvent key={`platform-${event.label}-${event.at}`} event={event} />
                      ))}
                    </ol>
                  )}
                </div>

                {legacyEvents.length > 0 && (
                  <div className="space-y-2 border-t border-surface-border pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Legacy record (from old platform / import)
                    </p>
                    <ol className="space-y-3">
                      {legacyEvents.map((event) => (
                        <JourneyEvent key={`legacy-${event.label}-${event.at}`} event={event} />
                      ))}
                    </ol>
                  </div>
                )}
              </Card>

              <Card className="space-y-3">
                <SectionTitle>Email activity</SectionTitle>
                <p className="text-xs text-slate-500">
                  Verification and password emails use the Authentication Service. Approval emails
                  use Resend. Status detail varies by provider.
                </p>
                {snapshot.email_events.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No email activity recorded yet. Historical email information unavailable.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border text-left text-slate-500">
                          <th className="py-2 pr-3 font-medium">Email type</th>
                          <th className="py-2 pr-3 font-medium">Provider</th>
                          <th className="py-2 pr-3 font-medium">Recipient</th>
                          <th className="py-2 pr-3 font-medium">Date/time</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.email_events.map((event) => (
                          <tr key={event.id} className="border-b border-surface-border/70">
                            <td className="py-2 pr-3">{EMAIL_TYPE_LABELS[event.email_type]}</td>
                            <td className="py-2 pr-3">{PROVIDER_LABELS[event.provider]}</td>
                            <td className="py-2 pr-3">{event.recipient}</td>
                            <td className="py-2 pr-3">{formatDateTime(event.created_at)}</td>
                            <td className="py-2 pr-3">
                              <Badge variant={emailStatusVariant(event.provider, event.status)}>
                                {displayEmailStatus(event.provider, event.status)}
                              </Badge>
                            </td>
                            <td className="py-2">{formatTriggerSource(event.trigger_source)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                <Card className="min-w-0 space-y-3">
                  <SectionTitle>Claim & approval diagnostics</SectionTitle>
                  <dl className="space-y-2">
                    <DetailRow
                      label="Current stage"
                      value={deriveClaimStage(snapshot.member, snapshot.approval_requests)}
                    />
                    {latestRequest && (
                      <>
                        <DetailRow label="Request type" value={latestRequest.type} />
                        <DetailRow label="Request status" value={latestRequest.status} />
                        <DetailRow
                          label="Submitted email"
                          value={latestRequest.submitted_email}
                        />
                      </>
                    )}
                    {snapshot.approval_requests.find((request) => request.status === "approved") && (
                      <>
                        <DetailRow
                          label="Approved by"
                          value={
                            snapshot.approval_requests.find((request) => request.status === "approved")
                              ?.reviewer_email ?? "—"
                          }
                        />
                        <DetailRow
                          label="Approval date"
                          value={formatDateTime(
                            snapshot.approval_requests.find((request) => request.status === "approved")
                              ?.reviewed_at
                          )}
                        />
                        <DetailRow
                          label="Approval notes"
                          value={
                            snapshot.approval_requests.find((request) => request.status === "approved")
                              ?.reviewer_note ?? "—"
                          }
                        />
                      </>
                    )}
                  </dl>
                </Card>

                <Card className="min-w-0 space-y-3">
                  <SectionTitle>Authentication diagnostics</SectionTitle>
                  <dl className="space-y-2">
                    <DetailRow
                      label="Account exists"
                      value={snapshot.auth_diagnostics.account_exists ? "Yes" : "No"}
                    />
                    <DetailRow
                      label="Email verified"
                      value={snapshot.auth_diagnostics.email_verified ? "Yes" : "No"}
                    />
                    <DetailRow
                      label="Password set"
                      value={snapshot.auth_diagnostics.password_set ? "Yes" : "No"}
                    />
                    <DetailRow
                      label="Auth email"
                      value={snapshot.auth_diagnostics.auth_email ?? "—"}
                    />
                    <DetailRow
                      label="Last login"
                      value={formatDateTime(snapshot.auth_diagnostics.last_login)}
                    />
                  </dl>
                </Card>
              </div>

              <Card className="space-y-4">
                <SectionTitle>Support notes</SectionTitle>
                <div className="space-y-2">
                  <Textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Add an internal support note…"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    disabled={noteSaving || !noteBody.trim()}
                    onClick={() => void handleAddNote()}
                  >
                    {noteSaving ? "Saving…" : "Add note"}
                  </Button>
                </div>
                <ul className="space-y-3">
                  {snapshot.support_notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-xl border border-surface-border bg-slate-50 px-4 py-3"
                    >
                      <p className="text-sm text-slate-900">{note.body}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {formatDateTime(note.created_at)}
                        {note.author_email ? ` · ${note.author_email}` : ""}
                      </p>
                    </li>
                  ))}
                  {snapshot.support_notes.length === 0 && (
                    <p className="text-sm text-slate-600">No support notes yet.</p>
                  )}
                </ul>
              </Card>

              {snapshot.audit_log.length > 0 && (
                <Card className="space-y-3">
                  <SectionTitle>Recent administrative actions</SectionTitle>
                  <ul className="space-y-2 text-sm">
                    {snapshot.audit_log.map((entry) => (
                      <li key={entry.id} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                        <span className="break-words font-medium text-slate-800">{entry.action}</span>
                        <span className="break-words text-xs text-slate-500 sm:text-right">
                          {formatDateTime(entry.created_at)}
                          {entry.actor_email ? ` · ${entry.actor_email}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
