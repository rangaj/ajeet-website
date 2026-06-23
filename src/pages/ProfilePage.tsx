import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAlumniMemberByUserId, updateAlumniMember } from "@/lib/data-access";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { parseStorageRef, profilePhotoPath as buildProfilePhotoPath } from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

export function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [member, setMember] = useState<AlumniMember | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAlumniMemberByUserId(user.id).then(async ({ data }) => {
      setMember(data);
      if (data?.profile_photo_path) {
        const ref = parseStorageRef(data.profile_photo_path);
        if (ref) {
          const { data: signed } = await supabase.storage
            .from(ref.bucket)
            .createSignedUrl(ref.path, 3600);
          if (signed?.signedUrl) setPhotoPreview(signed.signedUrl);
        }
      }
    });
  }, [user]);

  const updateField = (key: keyof AlumniMember, value: string | boolean) => {
    if (!member) return;
    setMember({ ...member, [key]: value });
  };

  const updateVisibility = (key: string, value: boolean) => {
    if (!member) return;
    setMember({
      ...member,
      visibility_settings: { ...member.visibility_settings, [key]: value },
    });
  };

  const handleSave = async () => {
    if (!member || !user) return;
    setSaving(true);
    setError("");

    let nextPhotoPath = member.profile_photo_path;

    if (photoBlob) {
      const storagePath = buildProfilePhotoPath(member.id);
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(storagePath, photoBlob, { upsert: true, contentType: "image/webp" });
      if (uploadErr) {
        setError(uploadErr.message);
        setSaving(false);
        return;
      }
      nextPhotoPath = storagePath;
    }

    const { error: err } = await updateAlumniMember(member.id, {
      company: member.company,
      job_position: member.job_position,
      current_location: member.current_location,
      mobile_phone: member.mobile_phone,
      secondary_email: member.secondary_email,
      professional_skills: member.professional_skills,
      industries_worked_in: member.industries_worked_in,
      linkedin_link: member.linkedin_link,
      facebook_link: member.facebook_link,
      twitter_link: member.twitter_link,
      website_link: member.website_link,
      is_directory_visible: member.is_directory_visible,
      visibility_settings: member.visibility_settings,
      ...(photoBlob ? { profile_photo_path: nextPhotoPath } : {}),
    });

    setSaving(false);
    if (err) setError(err.message);
    else {
      setMessage("Profile updated.");
      setPhotoBlob(null);
      if (nextPhotoPath) setMember({ ...member, profile_photo_path: nextPhotoPath });
    }
  };

  const handleRemovePhoto = async () => {
    if (!member?.profile_photo_path) return;
    const ref = parseStorageRef(member.profile_photo_path);
    if (ref) {
      await supabase.storage.from(ref.bucket).remove([ref.path]);
    }
    await updateAlumniMember(member.id, { profile_photo_path: null });
    setMember({ ...member, profile_photo_path: null });
    setPhotoPreview(null);
    setPhotoBlob(null);
    setMessage("Photo removed.");
  };

  if (!member) {
    return (
      <Card>
        <p className="text-slate-600">
          {isAdmin ? "No alumni profile linked to this account." : "Complete registration and approval to manage your profile."}
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card className="space-y-4">
        <h2 className="font-semibold">Identity (read-only)</h2>
        <p className="text-sm text-slate-600">Roll number: <strong>{member.roll_number}</strong></p>
        <p className="text-sm text-slate-600">Name: {member.name}</p>
        {member.house && (
          <p className="text-sm text-slate-600">House(s): {member.house}</p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Profile Photo</h2>
        <AvatarUpload
          name={member.name}
          previewUrl={photoPreview}
          onPreviewChange={setPhotoPreview}
          onBlobReady={setPhotoBlob}
          onRemove={() => void handleRemovePhoto()}
          hint="JPG, PNG, or WebP · max 2 MB. Shown in the directory when visible."
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Professional & Contact</h2>
        <Input label="Company" value={member.company ?? ""} onChange={(e) => updateField("company", e.target.value)} />
        <Input label="Position" value={member.job_position ?? ""} onChange={(e) => updateField("job_position", e.target.value)} />
        <Input label="Location" value={member.current_location ?? ""} onChange={(e) => updateField("current_location", e.target.value)} />
        <Input label="Mobile" value={member.mobile_phone ?? ""} onChange={(e) => updateField("mobile_phone", e.target.value)} />
        <Textarea label="Skills" value={member.professional_skills ?? ""} onChange={(e) => updateField("professional_skills", e.target.value)} />
        <Input label="LinkedIn" value={member.linkedin_link ?? ""} onChange={(e) => updateField("linkedin_link", e.target.value)} />
        <Input label="Website" value={member.website_link ?? ""} onChange={(e) => updateField("website_link", e.target.value)} />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Privacy</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={member.is_directory_visible}
            onChange={(e) => updateField("is_directory_visible", e.target.checked)}
          />
          Show me in directory search
        </label>
        {(["show_email", "show_phone", "show_social_links"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={member.visibility_settings?.[key] ?? false}
              onChange={(e) => updateVisibility(key, e.target.checked)}
            />
            Show {key.replace("show_", "").replace("_", " ")} to other alumni
          </label>
        ))}
      </Card>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
