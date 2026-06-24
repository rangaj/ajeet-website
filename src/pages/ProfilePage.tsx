import { useEffect, useState } from "react";
import { Linkedin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchAlumniMemberByUserId, updateOwnAlumniProfile } from "@/lib/data-access";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ProfileShareSection } from "@/components/profile/ProfileShareSection";
import { parseStorageRef, profilePhotoPathForUser } from "@/lib/storage";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { parseHouses, getHouseColor } from "@/constants/houses";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
} from "@/lib/alumni-display";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

function ProfileSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

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
      const storagePath = profilePhotoPathForUser(user.id);
      await supabase.storage.from("profile-photos").remove([storagePath]);
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(storagePath, photoBlob, { upsert: false, contentType: "image/webp" });
      if (uploadErr) {
        setError(`Photo upload failed: ${uploadErr.message}`);
        setSaving(false);
        return;
      }
      nextPhotoPath = storagePath;
    }

    const { error: err } = await updateOwnAlumniProfile({
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
    if (err) {
      setError(`Profile save failed: ${err.message}`);
    } else {
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
    await updateOwnAlumniProfile({ clear_profile_photo: true });
    setMember({ ...member, profile_photo_path: null });
    setPhotoPreview(null);
    setPhotoBlob(null);
    setMessage("Photo removed.");
  };

  if (!member) {
    return (
      <Card>
        <p className="text-slate-600">
          {isAdmin
            ? "No alumni profile linked to this account."
            : "Complete registration and approval to manage your profile."}
        </p>
      </Card>
    );
  }

  const batch = formatBatch(member.course_end_year);
  const house = formatHousesWithLabel(member.house);
  const houses = parseHouses(member.house);
  const accentColor = houses.length === 1 ? getHouseColor(houses[0]) : undefined;
  const initial = member.name.trim().charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <header
        className="space-y-5 border-b border-surface-border pb-6"
        style={accentColor ? { borderBottomColor: `${accentColor}44` } : undefined}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-display text-xl font-semibold text-brand-700 ring-2 ring-offset-2 sm:h-20 sm:w-20 sm:text-2xl"
            style={accentColor ? { boxShadow: `0 0 0 2px ${accentColor}` } : undefined}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {member.name}
              </h1>
              <HouseColorDots houseValue={member.house} size="md" />
            </div>
            {batch && <p className="text-sm text-gold-700 sm:text-base">{batch}</p>}
            <p className="text-sm text-slate-600 sm:text-base">
              {formatRollNumber(member.roll_number)}
            </p>
            {house && <p className="text-sm text-slate-600 sm:text-base">{house}</p>}
          </div>
        </div>

        <div className="space-y-0.5">
          {member.job_position && (
            <p className="text-base font-medium text-slate-900">{member.job_position}</p>
          )}
          {member.company && <p className="text-sm text-slate-700">{member.company}</p>}
          {member.current_location && (
            <p className="text-sm text-slate-500">{member.current_location}</p>
          )}
        </div>

        {member.linkedin_link && (
          <a
            href={member.linkedin_link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </a>
        )}
      </header>

      <ProfileSection
        title="Share"
        description="Create a visual alumni card to post on WhatsApp, LinkedIn, or other social apps."
      >
        <ProfileShareSection member={member} photoUrl={photoPreview} />
      </ProfileSection>

      <ProfileSection title="Profile Photo" description="Shown in the directory when your profile is visible.">
        <AvatarUpload
          name={member.name}
          previewUrl={photoPreview}
          onPreviewChange={setPhotoPreview}
          onBlobReady={setPhotoBlob}
          onRemove={() => void handleRemovePhoto()}
          hint="JPG, PNG, or WebP · max 2 MB"
        />
      </ProfileSection>

      <ProfileSection
        title="Professional"
        description="How fellow Ajeets will find you after your school identity."
      >
        <Input
          label="Current role"
          value={member.job_position ?? ""}
          onChange={(e) => updateField("job_position", e.target.value)}
        />
        <Input
          label="Organisation"
          value={member.company ?? ""}
          onChange={(e) => updateField("company", e.target.value)}
        />
        <Input
          label="Location"
          value={member.current_location ?? ""}
          onChange={(e) => updateField("current_location", e.target.value)}
        />
        <Textarea
          label="Skills"
          value={member.professional_skills ?? ""}
          onChange={(e) => updateField("professional_skills", e.target.value)}
        />
        <Input
          label="LinkedIn"
          value={member.linkedin_link ?? ""}
          onChange={(e) => updateField("linkedin_link", e.target.value)}
        />
        <Input
          label="Website"
          value={member.website_link ?? ""}
          onChange={(e) => updateField("website_link", e.target.value)}
        />
      </ProfileSection>

      <ProfileSection title="Contact" description="Visible only when you allow it in privacy settings.">
        <Input
          label="Mobile"
          value={member.mobile_phone ?? ""}
          onChange={(e) => updateField("mobile_phone", e.target.value)}
        />
        <Input
          label="Secondary email"
          value={member.secondary_email ?? ""}
          onChange={(e) => updateField("secondary_email", e.target.value)}
        />
      </ProfileSection>

      <ProfileSection title="Mentorship" description="Mentorship matching will be available in a future release.">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" disabled className="rounded border-slate-300" />
          Open to mentoring fellow Ajeets
        </label>
      </ProfileSection>

      <ProfileSection title="Privacy">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={member.is_directory_visible}
            onChange={(e) => updateField("is_directory_visible", e.target.checked)}
          />
          Show me in the alumni directory
        </label>
        {(["show_email", "show_phone", "show_social_links"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={member.visibility_settings?.[key] ?? false}
              onChange={(e) => updateVisibility(key, e.target.checked)}
            />
            Show {key.replace("show_", "").replace("_", " ")} to other alumni
          </label>
        ))}
      </ProfileSection>

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
