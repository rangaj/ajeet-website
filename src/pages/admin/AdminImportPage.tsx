import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Card } from "@/components/ui/Card";

type RowStatus = "valid" | "invalid" | "duplicate" | "imported";

interface PreviewSummary {
  total: number;
  willImport: number;
  notImported: number;
  invalid: number;
  duplicates: number;
  reasonBreakdown: Record<string, number>;
}

interface PreviewRow {
  sourceLine: number;
  rollNumber: string;
  name: string;
  rowStatus: RowStatus;
  skipReason: string;
  skipReasonDetail: string;
}

interface PreviewState {
  batchId: string;
  summary: PreviewSummary;
  rows: PreviewRow[];
  notImportedCsv: string;
}

interface CommitState {
  imported: number;
  importedTotal: number;
  commitFailed: number;
  notImported: number;
  remainingValid: number;
  fullyComplete: boolean;
  message: string;
}

function normalizeCommitResponse(
  raw: Record<string, unknown>,
  expectedImport?: number
): CommitState {
  const imported = Number(raw.imported ?? 0);
  const importedTotal = Number(raw.imported_total ?? raw.imported ?? 0);
  const remainingValid = Number(raw.remaining_valid ?? 0);
  const hasRemainingField = raw.remaining_valid !== undefined || raw.fully_complete !== undefined;
  const fullyComplete = hasRemainingField
    ? Boolean(raw.fully_complete ?? remainingValid === 0)
    : expectedImport !== undefined
      ? importedTotal >= expectedImport
      : remainingValid === 0;

  return {
    imported,
    importedTotal,
    commitFailed: Number(raw.commit_failed ?? 0),
    notImported: Number(raw.not_imported ?? 0),
    remainingValid: hasRemainingField
      ? remainingValid
      : Math.max(0, (expectedImport ?? importedTotal) - importedTotal),
    fullyComplete,
    message: String(raw.message ?? ""),
  };
}

type PreviewTab = "all" | "will_import" | "skipped";

const REASON_LABELS: Record<string, string> = {
  ROLL_MISSING: "Missing roll number",
  ROLL_NON_NUMERIC: "Non-numeric roll",
  ROLL_ZERO_STAFF: "Staff / roll zero",
  ROLL_ABOVE_MAX: "Roll above 7001",
  REGISTERED_NO: "Registered = No",
  REGISTERED_BLOCKED: "Registered = Blocked",
  DUPLICATE_SUPERSEDED: "Duplicate (other row kept)",
  MISSING_NAME: "Missing name",
  INVALID_EMAIL: "Invalid email",
  INVALID_COURSE_YEARS: "Invalid course years",
  ALREADY_IN_DATABASE: "Already in database",
  COMMIT_FAILED: "Database insert failed",
};

const IMPORT_RULES = [
  "Roll numbers 1–7001 only (numeric)",
  "Skip Registered = No or Blocked",
  "Skip staff / roll zero",
  "Duplicates: richer row wins",
  "Imported status: unclaimed (ready for Claim ID)",
];

function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function inferReasonFromLegacy(errors: unknown): { code: string; detail: string } {
  if (!Array.isArray(errors) || errors.length === 0) {
    return { code: "", detail: "" };
  }
  const detail = String(errors[0]);
  if (detail.includes("Duplicate")) return { code: "DUPLICATE_SUPERSEDED", detail };
  if (detail.includes("already in database")) return { code: "ALREADY_IN_DATABASE", detail };
  if (detail.includes("Missing roll")) return { code: "ROLL_MISSING", detail };
  if (detail.includes("Invalid email")) return { code: "INVALID_EMAIL", detail };
  return { code: "INVALID", detail };
}

function normalizePreviewResponse(raw: Record<string, unknown>): PreviewState {
  const summary = (raw.summary ?? {}) as Record<string, unknown>;
  const invalid = Number(summary.invalid ?? 0);
  const duplicates = Number(summary.duplicates ?? summary.duplicate_rows ?? 0);
  const willImport = Number(summary.will_import ?? summary.valid ?? 0);
  const total = Number(summary.total ?? 0);
  const notImported = Number(summary.not_imported ?? invalid + duplicates);

  const reasonBreakdown = (summary.reason_breakdown ?? {}) as Record<string, number>;

  const rows = ((raw.preview ?? []) as Record<string, unknown>[]).map((row) => {
    const legacy = inferReasonFromLegacy(row.__errors);
    const rowStatus = String(row.row_status ?? row.__status ?? "valid") as RowStatus;

    return {
      sourceLine: Number(row.source_line ?? row.__row_number ?? 0),
      rollNumber: String(row.roll_number ?? ""),
      name: String(row.name ?? ""),
      rowStatus,
      skipReason: String(row.skip_reason ?? legacy.code),
      skipReasonDetail: String(row.skip_reason_detail ?? legacy.detail),
    };
  });

  return {
    batchId: String(raw.batch_id ?? ""),
    summary: {
      total,
      willImport,
      notImported,
      invalid,
      duplicates,
      reasonBreakdown,
    },
    rows,
    notImportedCsv: String(raw.not_imported_csv ?? ""),
  };
}

function statusBadge(status: RowStatus) {
  if (status === "valid") return <Badge variant="success">Will import</Badge>;
  if (status === "duplicate") return <Badge variant="warning">Duplicate</Badge>;
  if (status === "imported") return <Badge variant="success">Imported</Badge>;
  return <Badge variant="danger">Skipped</Badge>;
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const items = [
    { n: 1, label: "Upload CSV" },
    { n: 2, label: "Preview" },
    { n: 3, label: "Commit" },
  ] as const;

  return (
    <ol className="flex flex-wrap gap-2 sm:gap-4">
      {items.map((item) => {
        const done = step > item.n;
        const active = step === item.n;
        return (
          <li
            key={item.n}
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-brand-900 text-white"
                : done
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              {done ? "✓" : item.n}
            </span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

export function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [committed, setCommitted] = useState<CommitState | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<PreviewTab>("all");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const currentStep: 1 | 2 | 3 = committed ? 3 : preview ? 2 : 1;

  const remainingToImport =
    committed?.remainingValid ??
    Math.max(0, (preview?.summary.willImport ?? 0) - (committed?.importedTotal ?? 0));

  const importIncomplete = Boolean(
    committed && (!committed.fullyComplete || remainingToImport > 0)
  );

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    if (tab === "will_import") return preview.rows.filter((r) => r.rowStatus === "valid");
    if (tab === "skipped") return preview.rows.filter((r) => r.rowStatus !== "valid");
    return preview.rows;
  }, [preview, tab]);

  const reasonEntries = useMemo(() => {
    if (!preview) return [];
    return Object.entries(preview.summary.reasonBreakdown).sort((a, b) => b[1] - a[1]);
  }, [preview]);

  const resetForNewFile = () => {
    setPreview(null);
    setCommitted(null);
    setError("");
    setInfo("");
    setTab("all");
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setInfo("");
    setCommitted(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await invokeFunction<Record<string, unknown>>("import-preview", formData);
      const normalized = normalizePreviewResponse(data);
      setPreview(normalized);
      setInfo(
        `Preview complete — ${normalized.summary.willImport.toLocaleString()} records ready to import.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.batchId) return;
    const confirmed = window.confirm(
      `Import ${preview.summary.willImport.toLocaleString()} alumni records into the directory?\n\nThis cannot be undone from this screen.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");
    try {
      const data = await invokeFunction<Record<string, unknown>>("import-commit", {
        batch_id: preview.batchId,
      });
      const committedResult = normalizeCommitResponse(data, preview.summary.willImport);
      setCommitted(committedResult);
      setInfo(committedResult.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNotImported = async () => {
    if (!preview?.batchId) return;

    if (preview.notImportedCsv) {
      const name = file
        ? file.name.replace(/\.csv$/i, "") + "-not-imported.csv"
        : "not-imported.csv";
      downloadCsv(name, preview.notImportedCsv);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await invokeFunction<{ file_name: string; csv: string }>(
        "import-export-not-imported",
        { batch_id: preview.batchId }
      );
      downloadCsv(data.file_name, data.csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-900">Alumni CSV Import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Upload your member export, preview every row, then commit valid records. Skipped rows
            can be downloaded with a reason for cleanup.
          </p>
        </div>
        <StepIndicator step={currentStep} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-brand-900">1. Choose file</h3>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-border bg-warm-white px-6 py-10 transition-colors hover:border-gold-400 hover:bg-gold-50/30">
            <Upload className="mb-3 h-8 w-8 text-brand-600" />
            <span className="text-sm font-medium text-brand-800">
              {file ? file.name : "Click to select CSV"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              {file
                ? `${(file.size / 1024).toFixed(0)} KB — headers must match AAA export`
                : "Latest Members export from your alumni platform"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                resetForNewFile();
              }}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handlePreview} disabled={!file || loading || Boolean(committed)}>
              {loading && !preview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Preview import
                </>
              )}
            </Button>
            {file && !committed && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  resetForNewFile();
                }}
              >
                Clear file
              </Button>
            )}
          </div>
        </Card>

        <Card className="space-y-3 bg-brand-50/50">
          <h3 className="text-sm font-semibold text-brand-900">Import rules</h3>
          <ul className="space-y-2 text-xs text-brand-800">
            {IMPORT_RULES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span className="text-gold-600">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {error && (
        <Alert variant="error">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </Alert>
      )}
      {info && !error && (
        <Alert variant={committed ? "success" : "info"}>
          <div className="flex gap-2">
            {committed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{info}</span>
          </div>
        </Alert>
      )}

      {preview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total rows</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">
                {preview.summary.total.toLocaleString()}
              </p>
            </Card>
            <Card className="!p-4 border-green-200 bg-green-50/50">
              <p className="text-xs font-medium uppercase tracking-wide text-green-700">
                Will import
              </p>
              <p className="mt-1 text-2xl font-bold text-green-900">
                {preview.summary.willImport.toLocaleString()}
              </p>
            </Card>
            <Card className="!p-4 border-amber-200 bg-amber-50/50">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                Not imported
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-900">
                {preview.summary.notImported.toLocaleString()}
              </p>
            </Card>
            <Card className="!p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Batch ID
              </p>
              <p className="mt-1 truncate font-mono text-xs text-slate-600">{preview.batchId}</p>
            </Card>
          </div>

          {reasonEntries.length > 0 && (
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-brand-900">Why rows were skipped</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {reasonEntries.map(([code, count]) => (
                  <div
                    key={code}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">{REASON_LABELS[code] ?? code}</span>
                    <Badge variant="warning">{count}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Invalid: {preview.summary.invalid} · Duplicates: {preview.summary.duplicates}
              </p>
            </Card>
          )}

          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-brand-900">2. Review sample rows</h3>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All (first 50)"],
                    ["will_import", "Will import"],
                    ["skipped", "Skipped"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      tab === key
                        ? "bg-brand-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Line</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Roll</th>
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        No rows in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.sourceLine} className="border-t border-slate-100">
                        <td className="p-3 font-mono text-slate-600">{row.sourceLine}</td>
                        <td className="p-3">{statusBadge(row.rowStatus)}</td>
                        <td className="p-3 font-medium text-brand-900">{row.rollNumber || "—"}</td>
                        <td className="p-3 text-slate-700">{row.name || "—"}</td>
                        <td className="p-3 text-slate-600">
                          {row.skipReason ? (
                            <span title={row.skipReasonDetail}>
                              <span className="font-medium text-red-700">{row.skipReason}</span>
                              {row.skipReasonDetail && (
                                <span className="mt-0.5 block text-slate-500">
                                  {row.skipReasonDetail}
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500">
              Showing up to 50 rows from the preview response. Download the full not-imported CSV
              for all skipped records.
            </p>
          </Card>

          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-brand-900">3. Export or commit</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={handleDownloadNotImported}
                disabled={preview.summary.notImported === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Download not-imported CSV ({preview.summary.notImported})
              </Button>
              <Button
                variant="accent"
                onClick={handleCommit}
                disabled={
                  loading ||
                  preview.summary.willImport === 0 ||
                  (Boolean(committed?.fullyComplete) && !importIncomplete)
                }
              >
                {loading && preview ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : committed?.fullyComplete && !importIncomplete ? (
                  "Import complete"
                ) : importIncomplete && remainingToImport > 0 ? (
                  `Import remaining ${remainingToImport.toLocaleString()} records`
                ) : (
                  `Commit ${preview.summary.willImport.toLocaleString()} records`
                )}
              </Button>
            </div>

            {committed && (
              <div
                className={`rounded-xl border p-4 text-sm ${
                  committed.fullyComplete
                    ? "border-green-200 bg-green-50 text-green-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="font-semibold">
                  {committed.fullyComplete ? "Import finished" : "Import partially complete"}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>{committed.importedTotal.toLocaleString()} alumni records imported in total</li>
                  {committed.imported > 0 && !committed.fullyComplete && (
                    <li>{committed.imported.toLocaleString()} imported in the last run</li>
                  )}
                  {committed.commitFailed > 0 && (
                    <li>{committed.commitFailed} failed at commit — check not-imported export</li>
                  )}
                  {remainingToImport > 0 && (
                    <li>
                      <strong>{remainingToImport.toLocaleString()}</strong> records still waiting
                      — click <strong>Import remaining</strong> (after redeploying import-commit in
                      Supabase)
                    </li>
                  )}
                  <li>{committed.notImported.toLocaleString()} rows not imported (see CSV)</li>
                </ul>
                <p className="mt-3 text-xs opacity-80">
                  Members are <strong>imported_unclaimed</strong> until they use Claim My Ajeet ID.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
