import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchAlumniMemberByUserId, updateAlumniMember } from "@/lib/data-access";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

export function ProfilePage() {
  const { user, isAdmin } = useAuth();
  const [member, setMember] = useState<AlumniMember | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAlumniMemberByUserId(user.id).then(({ data }) => setMember(data));
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
      });
    setSaving(false);
    if (err) setError(err.message);
    else setMessage("Profile updated.");
  };

  const handlePhotoUpload = async () => {
    if (!member || !photoFile) return;
    setSaving(true);
    const path = `${member.id}/avatar.webp`;
    const { error: uploadErr } = await supabase.storage
      .from("profile-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });
    if (uploadErr) {
      setError(uploadErr.message);
      setSaving(false);
      return;
    }
    const { error: updateErr } = await updateAlumniMember(member.id, {
      profile_photo_path: path,
    });
    setSaving(false);
    if (updateErr) setError(updateErr.message);
    else {
      setMessage("Photo uploaded.");
      setMember({ ...member, profile_photo_path: path });
    }
  };

  const handleRemovePhoto = async () => {
    if (!member?.profile_photo_path) return;
    await supabase.storage.from("profile-photos").remove([member.profile_photo_path]);
    await updateAlumniMember(member.id, { profile_photo_path: null });
    setMember({ ...member, profile_photo_path: null });
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
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Profile Photo</h2>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
        <div className="flex gap-2">
          <Button onClick={handlePhotoUpload} disabled={!photoFile || saving}>Upload</Button>
          {member.profile_photo_path && (
            <Button variant="danger" onClick={handleRemovePhoto}>Remove Photo</Button>
          )}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Professional & Contact</h2>
        <Input label="Company" value={member.company ?? ""} onChange={(e) => updateField("company", e.target.value)} />
        <Input label="Position" value={member.job_position ?? ""} onChange={(e) => updateField("job_position", e.target.value)} />
        <Input label="Location" value={member.current_location ?? ""} onChange={(e) => updateField("current_location", e.target.value)} />
        <Input label="Mobile" value={member.mobile_phone ?? ""} onChange={(e) => updateField("mobile_phone", e.target.value)} />
        <Textarea label="Skills" value={member.professional_skills ?? ""} onChange={(e) => updateField("professional_skills", e.target.value)} />
        <Input label="LinkedIn" value={member.linkedin_link ?? ""} onChange={(e) => updateField("linkedin_link", e.target.value)} />
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
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
