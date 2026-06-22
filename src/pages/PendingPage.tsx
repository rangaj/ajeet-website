import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, Alert, Badge } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";
import type { ApprovalRequest } from "@/types/database";

export function PendingPage() {
  const { user, profile, canAccessDirectory, refreshProfile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    refreshProfile();
    supabase
      .from("approval_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRequests(data ?? []));
  }, [user, refreshProfile]);

  if (canAccessDirectory) {
    return (
      <Card>
        <Alert variant="success">
          Your account is approved.{" "}
          <Link to="/directory" className="font-medium underline">Browse the directory</Link>
        </Alert>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Approval pending" subtitle="We will notify you when access is granted" />
      <Card>
        <p className="text-brand-700">
          Status:{" "}
          <Badge variant="warning">{profile?.member_status ?? "pending"}</Badge>
        </p>
        <p className="mt-3 text-sm text-brand-600">
          Check your email for verification. An admin is reviewing your request.
        </p>
      </Card>

      {requests.length > 0 && (
        <Card>
          <h2 className="font-semibold">Your Requests</h2>
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{r.type.replace("_", " ")}</span>
                  <Badge
                    variant={
                      r.status === "approved" ? "success" :
                      r.status === "rejected" ? "danger" : "warning"
                    }
                  >
                    {r.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-1 text-slate-600">Roll: {r.roll_number}</p>
                {r.reviewer_note && (
                  <p className="mt-1 text-slate-500">Note: {r.reviewer_note}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
