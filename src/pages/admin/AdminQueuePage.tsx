import { useEffect, useState } from "react";
import { supabase, invokeFunction } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge, Alert } from "@/components/ui/Card";
import type { ApprovalRequest, ApprovalType, ApprovalStatus } from "@/types/database";

const TABS: { key: ApprovalType | "all" | "approved" | "rejected"; label: string }[] = [
  { key: "all", label: "All Pending" },
  { key: "claim", label: "Claims" },
  { key: "new_registration", label: "New Registrations" },
  { key: "conflict", label: "Conflicts" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export function AdminQueuePage() {
  const [tab, setTab] = useState<string>("all");
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    let query = supabase.from("approval_requests").select("*").order("created_at", { ascending: false });
    if (tab === "all") query = query.in("status", ["pending_review", "more_info_required"]);
    else if (tab === "approved" || tab === "rejected") query = query.eq("status", tab as ApprovalStatus);
    else query = query.eq("type", tab as ApprovalType).in("status", ["pending_review", "more_info_required"]);
    const { data } = await query;
    setRequests(data ?? []);
  };

  useEffect(() => { load(); }, [tab]);

  const handleApprove = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.rpc("approve_registration", {
      p_request_id: id,
      p_note: note[id] ?? null,
    });
    if (!error) {
      await invokeFunction("notify-registrant", { request_id: id, event: "approved", note: note[id] }).catch(() => {});
      setMessage("Approved.");
      load();
    }
    setLoading(false);
  };

  const handleReject = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.rpc("reject_registration", {
      p_request_id: id,
      p_note: note[id] ?? null,
    });
    if (!error) {
      await invokeFunction("notify-registrant", { request_id: id, event: "rejected", note: note[id] }).catch(() => {});
      setMessage("Rejected.");
      load();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Review Queue</h2>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === t.key ? "bg-brand-100 text-brand-800 font-medium" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {message && <Alert variant="success">{message}</Alert>}
      <ul className="space-y-4">
        {requests.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-100 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{r.type.replace("_", " ")}</Badge>
              <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                {r.status.replace("_", " ")}
              </Badge>
              <span className="text-sm text-slate-500">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 font-medium">{r.submitted_name ?? "—"} · Roll {r.roll_number}</p>
            <p className="text-sm text-slate-600">{r.submitted_email}</p>
            {r.submitted_payload && (
              <pre className="mt-2 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs">
                {JSON.stringify(r.submitted_payload, null, 2)}
              </pre>
            )}
            {(r.status === "pending_review" || r.status === "more_info_required") && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Reviewer note (optional)"
                  value={note[r.id] ?? ""}
                  onChange={(e) => setNote((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(r.id)} disabled={loading}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(r.id)} disabled={loading}>Reject</Button>
                </div>
              </div>
            )}
            {r.reviewer_note && <p className="mt-2 text-sm text-slate-500">Note: {r.reviewer_note}</p>}
          </li>
        ))}
        {requests.length === 0 && <p className="text-slate-500">No requests in this tab.</p>}
      </ul>
    </div>
  );
}
