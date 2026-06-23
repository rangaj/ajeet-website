import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invokeFunction, supabase } from "@/lib/supabase";
import { dataUrlToBlob, takePendingAvatar } from "@/lib/image";
import { registrationAssetPath } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { Card, Alert, Badge } from "@/components/ui/Card";
import { PageHeader } from "@/components/brand/BrandLogo";
import type { ApprovalRequest } from "@/types/database";

async function linkPendingRegistration(userId: string, email: string) {
  await supabase
    .from("approval_requests")
    .update({ user_id: userId })
    .is("user_id", null)
    .eq("type", "new_registration")
    .ilike("submitted_email", email);
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

  useEffect(() => {
    if (!user?.email) return;

    const userId = user.id;
    const email = user.email;

    async function load() {
      await linkPendingRegistration(userId, email);
      await uploadPendingRegistrationPhoto(userId);

      await refreshProfile();

      const { data } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setRequests(data ?? []);
      setReady(true);
    }

    void load();
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
          Check your email to verify, and then await approval. A super admin is reviewing your
          request.
        </p>
      </Card>

      {ready && requests.length > 0 && (
        <Card>
          <h2 className="font-semibold">Your Requests</h2>
          <ul className="mt-4 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{r.type.replace(/_/g, " ")}</span>
                  <Badge
                    variant={
                      r.status === "approved" ? "success" :
                      r.status === "rejected" ? "danger" : "warning"
                    }
                  >
                    {r.status.replace(/_/g, " ")}
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
