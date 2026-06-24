import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { invokeFunction, supabase } from "@/lib/supabase";
import { dataUrlToBlob, takePendingAvatar } from "@/lib/image";
import { registrationAssetPath } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { Card, Alert, Badge } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";
import type { ApprovalRequest } from "@/types/database";

const ACTIVE_STATUSES = ["pending_review", "more_info_required"] as const;

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function badgeVariantForStatus(status: string): "warning" | "success" | "danger" | "default" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number])) return "warning";
  return "default";
}

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
  const { user, profile, isAdmin, canAccessDirectory, refreshProfile } = useAuth();
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
      await supabase.rpc("expire_stale_email_verifications");
      await linkPendingRequests(userId, email);

      const { data: promotedId } = await supabase.rpc("promote_email_verified_request");
      if (promotedId) {
        await invokeFunction("notify-admin-pending", { request_id: promotedId }).catch(() => {});
      }

      await supabase.rpc("link_approved_alumni_self");
      await uploadPendingRegistrationPhoto(userId);
      await refreshProfile();

      const { data: byUser } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: byEmail } = await supabase
        .from("approval_requests")
        .select("*")
        .is("user_id", null)
        .ilike("submitted_email", email)
        .in("status", [...ACTIVE_STATUSES])
        .order("created_at", { ascending: false });

      const merged = [...(byUser ?? []), ...(byEmail ?? [])];
      const unique = Array.from(new Map(merged.map((r) => [r.id, r])).values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRequests(unique);
      setReady(true);
    }

    void load();
  }, [user, refreshProfile]);

  if (ready && canAccessDirectory && activeRequests.length === 0) {
    return <Navigate to="/directory" replace />;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <PageHeader title="Approval pending" subtitle="We will notify you when access is granted" />
      <Card>
        {activeRequests.length > 0 ? (
          <>
            <p className="text-brand-700">
              Request status:{" "}
              <Badge variant={badgeVariantForStatus(activeRequests[0].status)}>
                {formatStatus(activeRequests[0].status)}
              </Badge>
            </p>
            {canAccessDirectory && (
              <p className="mt-3 text-sm text-brand-600">
                Your sign-in already has directory access
                {isAdmin ? " as an admin" : ""}. The{" "}
                {activeRequests[0].type.replace(/_/g, " ")} below is separate and still needs
                approval in{" "}
                <Link to="/admin" className="font-semibold underline">Admin → Review Queue</Link>
                {isAdmin ? " (you can approve it yourself for testing)." : "."}
              </p>
            )}
            {!canAccessDirectory && (
              <p className="mt-3 text-sm text-brand-600">
                Check your email to verify, then await approval. A super admin is reviewing your
                request.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-brand-700">
              Account status:{" "}
              <Badge variant={badgeVariantForStatus(profile?.member_status ?? "pending")}>
                {formatStatus(profile?.member_status ?? "pending")}
              </Badge>
            </p>
            <p className="mt-3 text-sm text-brand-600">
              Check your email to verify, and then await approval. A super admin is reviewing your
              request.
            </p>
          </>
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
                  <Badge variant={badgeVariantForStatus(r.status)}>{formatStatus(r.status)}</Badge>
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
                  {r.type.replace(/_/g, " ")} · Roll {r.roll_number} · {formatStatus(r.status)}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
