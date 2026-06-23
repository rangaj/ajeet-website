import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction, supabase } from "@/lib/supabase";
import { dataUrlToBlob, takePendingAvatar } from "@/lib/image";
import { registrationAssetPath } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { Card, Alert, Badge } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";
import type { ApprovalRequest } from "@/types/database";

const ACTIVE_STATUSES = ["pending_review", "more_info_required"] as const;

async function linkPendingRequests(userId: string, email: string) {
  await supabase
    .from("approval_requests")
    .update({ user_id: userId })
    .is("user_id", null)
    .ilike("submitted_email", email)
    .in("status", [...ACTIVE_STATUSES]);
}

async function uploadPendingRegistrationPhoto(userId: string) {
  const dataUrl = takePendingAvatar();
  if (!dataUrl) return;

  const blob = await dataUrlToBlob(dataUrl);
  const storagePath = `${userId}/avatar.webp`;
  const fullPath = registrationAssetPath(userId);

  const { error: uploadError } = await supabase.storage
    .from("registration-assets")
    .upload(storagePath, blob, { upsert: true, contentType: "image/webp" });

  if (uploadError) return;

  await invokeFunction("attach-registration-photo", {
    profile_photo_path: fullPath,
  }).catch(() => {});
}

export function PendingPage() {
  const { user, profile, canAccessDirectory, refreshProfile } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [ready, setReady] = useState(false);

  const activeRequests = useMemo(
    () => requests.filter((r) => ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number])),
    [requests]
  );

  useEffect(() => {
    if (!user?.email) return;

    const userId = user.id;
    const email = user.email;

    async function load() {
      await linkPendingRequests(userId, email);
      await uploadPendingRegistrationPhoto(userId);
      await refreshProfile();

      const { data: byUser } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setRequests(byUser ?? []);
      setReady(true);
    }

    void load();
  }, [user, refreshProfile]);

  if (ready && canAccessDirectory && activeRequests.length === 0) {
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
          Check your email to verify, and then await approval. A super admin is reviewing your
          request.
        </p>
        {canAccessDirectory && activeRequests.length > 0 && (
          <p className="mt-3 text-sm text-brand-600">
            You are signed in as an admin. The claim below must still be approved in{" "}
            <Link to="/admin" className="font-semibold underline">Admin → Review Queue</Link>{" "}
            (use another admin account, or approve as yourself for testing).
          </p>
        )}
      </Card>

      {ready && activeRequests.length > 0 && (
        <Card>
          <h2 className="font-semibold">Your active requests</h2>
          <ul className="mt-4 space-y-3">
            {activeRequests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{r.type.replace(/_/g, " ")}</span>
                  <Badge variant="warning">{r.status.replace(/_/g, " ")}</Badge>
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

      {ready && requests.length > activeRequests.length && (
        <Card>
          <h2 className="font-semibold text-sm text-slate-500">Earlier requests</h2>
          <ul className="mt-3 space-y-2">
            {requests
              .filter((r) => !ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number]))
              .map((r) => (
                <li key={r.id} className="text-sm text-slate-600">
                  {r.type.replace(/_/g, " ")} · Roll {r.roll_number} · {r.status.replace(/_/g, " ")}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
