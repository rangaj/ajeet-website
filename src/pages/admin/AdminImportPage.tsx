import { useState } from "react";
import { invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Alert, Badge } from "@/components/ui/Card";

interface PreviewSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  headers: string[];
}

interface PreviewResponse {
  batch_id: string;
  summary: PreviewSummary;
  preview: Array<Record<string, unknown>>;
}

export function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await invokeFunction<PreviewResponse>("import-preview", formData);
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.batch_id) return;
    setLoading(true);
    setError("");
    try {
      const data = await invokeFunction<{ imported: number; message: string }>("import-commit", {
        batch_id: preview.batch_id,
      });
      setMessage(data.message);
      setPreview(null);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Admin Data Import</h2>
        <p className="text-sm text-slate-600">
          Upload CSV with headers matching the spec field list. Preview validates before commit.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
          }}
        />
        <Button onClick={handlePreview} disabled={!file || loading}>
          {loading ? "Processing..." : "Preview Import"}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge>Total: {preview.summary.total}</Badge>
            <Badge variant="success">Valid: {preview.summary.valid}</Badge>
            <Badge variant="danger">Invalid: {preview.summary.invalid}</Badge>
            <Badge variant="warning">Duplicates: {preview.summary.duplicates}</Badge>
          </div>

          <div className="max-h-64 overflow-auto rounded border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2">Status</th>
                  <th className="p-2">Roll</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="p-2">{String(row.__status)}</td>
                    <td className="p-2">{String(row.roll_number ?? "")}</td>
                    <td className="p-2">{String(row.name ?? "")}</td>
                    <td className="p-2 text-red-600">{Array.isArray(row.__errors) ? (row.__errors as string[]).join(", ") : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={handleCommit} disabled={loading || preview.summary.valid === 0}>
            Commit {preview.summary.valid} Valid Records
          </Button>
        </div>
      )}
    </div>
  );
}
