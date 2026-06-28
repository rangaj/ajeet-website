import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Lock, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMembershipAccess } from "@/hooks/useMembershipAccess";
import {
  fetchElectoralRoll,
  fetchMembershipRoll,
  fetchMembershipSettings,
  recordOfflinePayment,
  updateMembershipSettings,
} from "@/lib/membership";
import { searchSupportMembers } from "@/lib/data-access";
import type {
  AaaSettings,
  ElectoralRollRow,
  MembershipModuleState,
  MembershipRollRow,
  PaymentFeeKind,
  ReceiptMode,
} from "@/types/database";
import type { AdminMemberSearchRow } from "@/types/member-support";
import { formatBatch, formatRollNumber } from "@/lib/alumni-display";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const STATE_LABELS: Record<MembershipModuleState, { label: string; variant: "default" | "warning" | "success" }> = {
  hidden: { label: "Hidden (dark)", variant: "default" },
  coming_soon: { label: "Coming soon", variant: "warning" },
  live: { label: "Live", variant: "success" },
};

const FEE_KINDS: { value: PaymentFeeKind; label: string }[] = [
  { value: "registration", label: "Registration fee (one-time)" },
  { value: "initial", label: "Initial membership fee" },
  { value: "renewal", label: "Renewal fee" },
];

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function numOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Rollout + settings (super-admin writes; managers read)
// ---------------------------------------------------------------------------
function SettingsSection({
  settings,
  canWrite,
  onSaved,
}: {
  settings: AaaSettings;
  canWrite: boolean;
  onSaved: (next: AaaSettings) => void;
}) {
  const [draft, setDraft] = useState<AaaSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => setDraft(settings), [settings]);

  const set = <K extends keyof AaaSettings>(key: K, value: AaaSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async (patch: Partial<AaaSettings>) => {
    setSaving(true);
    setError("");
    setSuccess("");
    const { error: saveErr } = await updateMembershipSettings(patch);
    setSaving(false);
    if (saveErr) {
      setError(saveErr.message);
      return;
    }
    setSuccess("Saved.");
    onSaved({ ...settings, ...draft, ...patch });
  };

  const previewIdsText = (draft.preview_user_ids ?? []).join("\n");

  return (
    <div className="space-y-5">
      {/* Rollout */}
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-slate-900">Rollout</h2>
          <Badge variant={STATE_LABELS[draft.module_state].variant}>
            {STATE_LABELS[draft.module_state].label}
          </Badge>
        </div>
        <p className="text-sm text-slate-600">
          The membership module is invisible to members until it is set to{" "}
          <strong>Live</strong>. Flipping to Coming soon or Live requires a recorded
          Executive Committee resolution reference (auditable per the constitution).
        </p>

        <Input
          label="EC resolution reference"
          placeholder="e.g. EC/2026-27/Res-14 dated 12 Apr 2026"
          value={draft.ec_resolution_ref ?? ""}
          onChange={(e) => set("ec_resolution_ref", e.target.value)}
          disabled={!canWrite}
        />

        <div className="flex flex-wrap gap-2">
          {(["hidden", "coming_soon", "live"] as MembershipModuleState[]).map((state) => (
            <Button
              key={state}
              type="button"
              size="sm"
              variant={draft.module_state === state ? "primary" : "secondary"}
              disabled={!canWrite || saving}
              onClick={() => {
                set("module_state", state);
                void save({
                  module_state: state,
                  ec_resolution_ref: draft.ec_resolution_ref,
                });
              }}
            >
              {STATE_LABELS[state].label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3 border-t border-surface-border pt-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.payments_offline_enabled}
              disabled={!canWrite}
              onChange={(e) => set("payments_offline_enabled", e.target.checked)}
            />
            Offline payment recording enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.gating_enforced}
              disabled={!canWrite}
              onChange={(e) => set("gating_enforced", e.target.checked)}
            />
            Enforce member-only gating
          </label>
        </div>

        <Textarea
          label="Preview testers (one user UUID per line)"
          rows={3}
          value={previewIdsText}
          disabled={!canWrite}
          onChange={(e) =>
            set(
              "preview_user_ids",
              e.target.value
                .split(/[\s,]+/)
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
        />

        {canWrite && (
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() =>
              save({
                payments_offline_enabled: draft.payments_offline_enabled,
                gating_enforced: draft.gating_enforced,
                preview_user_ids: draft.preview_user_ids,
                ec_resolution_ref: draft.ec_resolution_ref,
              })
            }
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save rollout settings
          </Button>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
      </Card>

      {/* Entity + fees */}
      <Card className="space-y-4 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Association &amp; fee schedule
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Entity name" value={draft.entity_name}
            disabled={!canWrite} onChange={(e) => set("entity_name", e.target.value)} />
          <Input label="Registered office" value={draft.registered_office}
            disabled={!canWrite} onChange={(e) => set("registered_office", e.target.value)} />
          <Input label="Registration number" value={draft.registration_number ?? ""}
            disabled={!canWrite} onChange={(e) => set("registration_number", e.target.value || null)} />
          <Input label="PAN" value={draft.pan ?? ""}
            disabled={!canWrite} onChange={(e) => set("pan", e.target.value || null)} />
          <Input label="12A registration" value={draft.reg_12a ?? ""}
            disabled={!canWrite} onChange={(e) => set("reg_12a", e.target.value || null)} />
          <Input label="80G registration" value={draft.reg_80g ?? ""}
            disabled={!canWrite} onChange={(e) => set("reg_80g", e.target.value || null)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Currency" value={draft.currency}
            disabled={!canWrite} onChange={(e) => set("currency", e.target.value)} />
          <Input label="FY start month (1-12)" type="number" min={1} max={12}
            value={String(draft.financial_year_start_month)} disabled={!canWrite}
            onChange={(e) => set("financial_year_start_month", Number(e.target.value) || 4)} />
          <Select
            label="Active receipt format"
            value={draft.receipt_mode}
            disabled={!canWrite}
            onChange={(e) => set("receipt_mode", e.target.value as ReceiptMode)}
            options={[
              { value: "plain", label: "Plain receipt" },
              { value: "80g", label: "80G receipt" },
            ]}
          />
          <Input label="Registration fee" type="number" min={0} value={draft.fee_registration?.toString() ?? ""}
            disabled={!canWrite} onChange={(e) => set("fee_registration", numOrNull(e.target.value))} />
          <Input label="Initial membership fee" type="number" min={0} value={draft.fee_initial?.toString() ?? ""}
            disabled={!canWrite} onChange={(e) => set("fee_initial", numOrNull(e.target.value))} />
          <Input label="Renewal fee" type="number" min={0} value={draft.fee_renewal?.toString() ?? ""}
            disabled={!canWrite} onChange={(e) => set("fee_renewal", numOrNull(e.target.value))} />
          <Input label="Receipt prefix" value={draft.receipt_prefix}
            disabled={!canWrite} onChange={(e) => set("receipt_prefix", e.target.value)} />
        </div>

        {canWrite && (
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() =>
              save({
                entity_name: draft.entity_name,
                registered_office: draft.registered_office,
                registration_number: draft.registration_number,
                pan: draft.pan,
                reg_12a: draft.reg_12a,
                reg_80g: draft.reg_80g,
                currency: draft.currency,
                financial_year_start_month: draft.financial_year_start_month,
                receipt_mode: draft.receipt_mode,
                receipt_prefix: draft.receipt_prefix,
                fee_registration: draft.fee_registration,
                fee_initial: draft.fee_initial,
                fee_renewal: draft.fee_renewal,
              })
            }
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save association &amp; fees
          </Button>
        )}
        {!canWrite && (
          <p className="text-xs text-slate-500">
            Only a super-admin can edit these settings.
          </p>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offline payment recorder
// ---------------------------------------------------------------------------
function OfflinePaymentSection({ enabled }: { enabled: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminMemberSearchRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminMemberSearchRow | null>(null);

  const [feeKind, setFeeKind] = useState<PaymentFeeKind>("initial");
  const [amount, setAmount] = useState("");
  const [periodFy, setPeriodFy] = useState("");
  const [method, setMethod] = useState("upi");
  const [reference, setReference] = useState("");
  const [issueReceipt, setIssueReceipt] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receiptNo, setReceiptNo] = useState("");

  const runSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setError("");
    const { data, error: searchErr } = await searchSupportMembers(query.trim(), null, 15);
    setSearching(false);
    if (searchErr) {
      setError(searchErr.message);
      return;
    }
    setResults(data);
  }, [query]);

  const submit = async () => {
    if (!selected) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError("");
    setReceiptNo("");
    const { data, error: payErr } = await recordOfflinePayment({
      alumniMemberId: selected.id,
      feeKind,
      amount: amt,
      periodFy: numOrNull(periodFy),
      method,
      reference: reference || null,
      issueReceipt,
      idempotencyKey: `${selected.id}:${feeKind}:${periodFy || "current"}:${reference || amt}`,
    });
    setSaving(false);
    if (payErr) {
      setError(payErr.message);
      return;
    }
    setReceiptNo(typeof data === "string" ? data : "recorded");
    setAmount("");
    setReference("");
  };

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Record offline payment
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Treasurer entry for cheque / UPI / cash / bank transfer. Issues a numbered
          receipt in the active format.
        </p>
      </div>

      {!enabled && (
        <Alert variant="warning">
          Offline payment recording is currently disabled in rollout settings.
        </Alert>
      )}

      <div className="flex gap-2">
        <Input
          label="Find member"
          placeholder="Name, roll number, or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="flex-1"
        />
        <Button type="button" variant="secondary" size="sm" className="mt-6" disabled={searching} onClick={runSearch}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && !selected && (
        <ul className="divide-y divide-surface-border rounded-xl border border-surface-border">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
                onClick={() => {
                  setSelected(m);
                  setResults([]);
                }}
              >
                <span className="min-w-0">
                  <span className="font-medium text-slate-900">{m.name}</span>{" "}
                  <span className="text-slate-500">
                    {[formatRollNumber(m.roll_number), m.email].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="space-y-4 rounded-xl border border-surface-border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">
              <span className="font-semibold text-slate-900">{selected.name}</span>{" "}
              <span className="text-slate-500">{formatRollNumber(selected.roll_number)}</span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Change
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Fee type"
              value={feeKind}
              onChange={(e) => setFeeKind(e.target.value as PaymentFeeKind)}
              options={FEE_KINDS}
            />
            <Input label="Amount" type="number" min={0} value={amount}
              onChange={(e) => setAmount(e.target.value)} />
            <Input
              label="Financial year (optional)"
              type="number"
              placeholder="e.g. 2026 for FY 2026-27"
              value={periodFy}
              onChange={(e) => setPeriodFy(e.target.value)}
            />
            <Select
              label="Method"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={[
                { value: "upi", label: "UPI" },
                { value: "cheque", label: "Cheque" },
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank transfer" },
              ]}
            />
            <Input label="Reference (cheque no / UTR)" value={reference}
              onChange={(e) => setReference(e.target.value)} />
            <label className="mt-6 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={issueReceipt} onChange={(e) => setIssueReceipt(e.target.checked)} />
              Issue receipt
            </label>
          </div>

          <Button type="button" size="sm" disabled={!enabled || saving} onClick={submit}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Record payment
          </Button>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {receiptNo && (
        <Alert variant="success">
          Payment recorded. {receiptNo !== "recorded" ? `Receipt: ${receiptNo}` : ""}
        </Alert>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Roll exports
// ---------------------------------------------------------------------------
function RollsSection() {
  const [roll, setRoll] = useState<MembershipRollRow[] | null>(null);
  const [electoral, setElectoral] = useState<ElectoralRollRow[] | null>(null);
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<"roll" | "electoral" | null>(null);
  const [error, setError] = useState("");

  const loadRoll = async () => {
    setLoading("roll");
    setError("");
    const { data, error: err } = await fetchMembershipRoll();
    setLoading(null);
    if (err) return setError(err.message);
    setRoll(data);
  };

  const loadElectoral = async () => {
    setLoading("electoral");
    setError("");
    const { data, error: err } = await fetchElectoralRoll(recordDate);
    setLoading(null);
    if (err) return setError(err.message);
    setElectoral(data);
  };

  const exportRoll = () => {
    if (!roll) return;
    const header = ["Roll number", "Name", "Batch", "House", "Member type", "Standing", "Reg fee paid", "Valid through", "Voting exempt"];
    const lines = roll.map((r) =>
      [r.roll_number, r.name, formatBatch(r.course_end_year) ?? "", r.house ?? "", r.member_type, r.standing,
        r.registration_fee_paid ? "yes" : "no", r.valid_through ?? "", r.voting_exempt ? "yes" : "no"]
        .map((c) => csvEscape(String(c))).join(",")
    );
    downloadCsv(`aaa-roll-of-members-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"));
  };

  const exportElectoral = () => {
    if (!electoral) return;
    const header = ["Roll number", "Name", "Batch", "House", "Standing", "Voting exempt", "Eligible reason"];
    const lines = electoral.map((r) =>
      [r.roll_number, r.name, formatBatch(r.course_end_year) ?? "", r.house ?? "", r.standing,
        r.voting_exempt ? "yes" : "no", r.eligible_reason]
        .map((c) => csvEscape(String(c))).join(",")
    );
    downloadCsv(`aaa-electoral-roll-${recordDate}.csv`, [header.join(","), ...lines].join("\n"));
  };

  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-slate-900">Roll of Members</h2>

      <div className="flex flex-wrap items-end gap-3">
        <Button type="button" variant="secondary" size="sm" disabled={loading === "roll"} onClick={loadRoll}>
          {loading === "roll" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Load full roll
        </Button>
        {roll && (
          <>
            <Badge>{roll.length} members</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={exportRoll}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-surface-border pt-4">
        <Input
          label="Electoral roll as of"
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
        />
        <Button type="button" variant="secondary" size="sm" className="mb-0.5" disabled={loading === "electoral"} onClick={loadElectoral}>
          {loading === "electoral" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Generate electoral roll
        </Button>
        {electoral && (
          <>
            <Badge variant="success">{electoral.length} eligible voters</Badge>
            <Button type="button" variant="ghost" size="sm" onClick={exportElectoral}>
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Eligible voters are Ajeet Members in good standing as of the record date, plus
        members exempt from suspension (within 8 years of graduation or aged 70+).
      </p>

      {error && <Alert variant="error">{error}</Alert>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function AdminMembershipPage() {
  const { profile } = useAuth();
  const { loading: accessLoading, canManage } = useMembershipAccess();
  const [settings, setSettings] = useState<AaaSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  const isSuperAdmin = profile?.role === "super_admin";

  useEffect(() => {
    if (accessLoading || !canManage) return;
    let cancelled = false;
    setSettingsLoading(true);
    void fetchMembershipSettings().then(({ data, error }) => {
      if (cancelled) return;
      setSettingsLoading(false);
      if (error) {
        setSettingsError(error.message);
        return;
      }
      setSettings(data);
    });
    return () => {
      cancelled = true;
    };
  }, [accessLoading, canManage]);

  const offlineEnabled = useMemo(
    () => Boolean(settings?.payments_offline_enabled),
    [settings]
  );

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!canManage) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Lock className="h-8 w-8 text-slate-400" />
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Membership module is not available
        </h2>
        <p className="max-w-md text-sm text-slate-600">
          This module ships dark. It is visible only to super-admins and approved
          preview testers until the Executive Committee greenlights go-live.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-bold text-slate-900">AAA Membership</h1>
        <p className="text-sm text-slate-600">
          Fee schedule, offline payments &amp; receipts, and the Roll of Members.
          Member-facing surfaces stay dark until the module is set Live.
        </p>
      </header>

      {settingsError && <Alert variant="error">{settingsError}</Alert>}

      {settingsLoading || !settings ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading settings…
        </div>
      ) : (
        <>
          <SettingsSection settings={settings} canWrite={isSuperAdmin} onSaved={setSettings} />
          <OfflinePaymentSection enabled={offlineEnabled} />
          <RollsSection />
        </>
      )}
    </div>
  );
}
