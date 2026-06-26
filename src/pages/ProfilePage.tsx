import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import {
  formatProfileUpdated,
  getProfileCompleteness,
} from "@/lib/profile-display";
import { supabase } from "@/lib/supabase";
import { fetchAlumniMemberByUserId, updateOwnAlumniProfile } from "@/lib/data-access";
import { useAuth } from "@/hooks/useAuth";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import {
  mentorshipFormFromMember,
  mentorshipPayloadFromForm,
  ProfileMentorshipSection,
  validateMentorshipForm,
  type MentorshipFormState,
} from "@/components/profile/ProfileMentorshipSection";
import { ProfileShareSection } from "@/components/profile/ProfileShareSection";
import { ProfileGetInvolvedSection } from "@/components/profile/ProfileGetInvolvedSection";
import { GET_INVOLVED_PROFILE_HASH } from "@/constants/get-involved";
import { invalidateProfilePhotoCache, primeProfilePhotoCache, resolveProfilePhotoUrl } from "@/lib/profile-photo";
import { parseStorageRef, profilePhotoPathForUser } from "@/lib/storage";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { parseHouses, getHouseColor } from "@/constants/houses";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
} from "@/lib/alumni-display";
import {
  formatDisplayJobPosition,
  formatDisplayLocation,
  formatDisplayMemberName,
} from "@/lib/display-text";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, Alert } from "@/components/ui/Card";
import type { AlumniMember } from "@/types/database";

function ProfileSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="space-y-4 p-5 sm:p-6 scroll-mt-24">
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mentorshipForm, setMentorshipForm] = useState<MentorshipFormState | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAlumniMemberByUserId(user.id).then(async ({ data }) => {
      setMember(data);
      if (data) setMentorshipForm(mentorshipFormFromMember(data));
      if (data?.profile_photo_path) {
        const preview = await resolveProfilePhotoUrl(data.profile_photo_path);
        if (preview) setPhotoPreview(preview);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!member) return;
    if (window.location.hash !== `#${GET_INVOLVED_PROFILE_HASH}`) return;
    const target = document.getElementById(GET_INVOLVED_PROFILE_HASH);
    if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
  }, [member]);

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

  const handleBlobReady = (blob: Blob | null) => {
    setPhotoBlob(blob);
    if (blob) {
      setPhotoMessage(null);
      setPhotoError(null);
    }
  };

  const handleDiscardPendingPhoto = async () => {
    if (!member) return;
    setPhotoBlob(null);
    setPhotoError(null);
    setPhotoMessage(null);
    if (member.profile_photo_path) {
      const preview = await resolveProfilePhotoUrl(member.profile_photo_path);
      setPhotoPreview(preview);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSavePhoto = async () => {
    if (!member || !user || !photoBlob) return;
    setPhotoUploading(true);
    setPhotoError(null);
    setPhotoMessage(null);

    const blobToSave = photoBlob;
    const oldPath = member.profile_photo_path;
    const storagePath = profilePhotoPathForUser(user.id);

    const { error: uploadErr } = await supabase.storage
      .from("profile-photos")
      .upload(storagePath, blobToSave, { contentType: "image/webp" });

    if (uploadErr) {
      setPhotoError(`Photo upload failed: ${uploadErr.message}`);
      setPhotoUploading(false);
      return;
    }

    const { error: err } = await updateOwnAlumniProfile({ profile_photo_path: storagePath });
    setPhotoUploading(false);

    if (err) {
      await supabase.storage.from("profile-photos").remove([storagePath]);
      setPhotoError(`Could not save photo: ${err.message}`);
      return;
    }

    if (oldPath && oldPath !== storagePath) {
      await supabase.storage.from("profile-photos").remove([oldPath]);
    }

    invalidateProfilePhotoCache(oldPath);
    const preview = primeProfilePhotoCache(storagePath, blobToSave);
    setPhotoBlob(null);
    setMember({
      ...member,
      profile_photo_path: storagePath,
      updated_at: new Date().toISOString(),
    });
    setPhotoPreview(preview);
    setPhotoMessage("Photo saved.");
  };

  const handleSave = async () => {
    if (!member || !user || !mentorshipForm) return;
    setSaving(true);
    setError("");

    const mentorshipError = validateMentorshipForm(
      mentorshipForm,
      member.is_directory_visible
    );
    if (mentorshipError) {
      setError(mentorshipError);
      setSaving(false);
      return;
    }

    const mentorshipPayload = mentorshipPayloadFromForm(mentorshipForm);

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
      ...mentorshipPayload,
    });

    setSaving(false);
    if (err) {
      setError(`Profile save failed: ${err.message}`);
    } else {
      setMessage("Profile updated.");
      const now = new Date().toISOString();
      const updatedMember: AlumniMember = {
        ...member,
        updated_at: now,
        open_to_mentorship: mentorshipPayload.open_to_mentorship ?? member.open_to_mentorship,
        mentorship_blurb:
          mentorshipPayload.mentorship_blurb !== undefined
            ? mentorshipPayload.mentorship_blurb
            : member.mentorship_blurb,
        paid_session_links:
          mentorshipPayload.paid_session_links !== undefined
            ? mentorshipPayload.paid_session_links
            : member.paid_session_links,
      };
      setMember(updatedMember);
      setMentorshipForm(mentorshipFormFromMember(updatedMember));
    }
  };

  const handleRemovePhoto = async () => {
    if (!member) return;
    setPhotoBlob(null);
    setPhotoError(null);
    setPhotoMessage(null);

    if (!member.profile_photo_path) {
      setPhotoPreview(null);
      return;
    }

    const ref = parseStorageRef(member.profile_photo_path);
    if (ref) {
      await supabase.storage.from(ref.bucket).remove([ref.path]);
    }
    await updateOwnAlumniProfile({ clear_profile_photo: true });
    invalidateProfilePhotoCache(member.profile_photo_path);
    setMember({ ...member, profile_photo_path: null });
    setPhotoPreview(null);
    setPhotoMessage("Photo removed.");
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
  const completeness = getProfileCompleteness(member);
  const displayName = formatDisplayMemberName({
    name: member.name,
    salutation: member.salutation,
  });
  const displayJob = formatDisplayJobPosition(member.job_position);
  const displayLocation = formatDisplayLocation(member.current_location);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32 sm:pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-surface-border bg-white px-4 py-3 text-sm">
        <div>
          <p className="font-medium text-slate-900">Profile last updated</p>
          <p className="text-slate-600">{formatProfileUpdated(member.updated_at)}</p>
        </div>
        <Link
          to="/contact?category=directory_correction"
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          Report a correction
        </Link>
      </div>

      {completeness.percent < 100 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-900">
              Profile completeness: {completeness.percent}%
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gold-500 transition-all"
              style={{ width: `${completeness.percent}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">
            Complete your profile to help fellow Ajeets reconnect with you.
          </p>
          <p className="text-xs text-slate-500">
            Missing:{" "}
            {completeness.fields
              .filter((f) => !f.complete)
              .map((f) => f.label)
              .join(", ")}
          </p>
        </Card>
      )}

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
                {displayName}
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
          {displayJob && (
            <p className="text-base font-medium text-slate-900">{displayJob}</p>
          )}
          {member.company && <p className="text-sm text-slate-700">{member.company}</p>}
          {displayLocation && (
            <p className="text-sm text-slate-500">{displayLocation}</p>
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
        <ProfileShareSection member={member} />
      </ProfileSection>

      <ProfileSection title="Profile Photo" description="Shown in the directory when your profile is visible.">
        <AvatarUpload
          name={member.name}
          previewUrl={photoPreview}
          onPreviewChange={setPhotoPreview}
          onBlobReady={handleBlobReady}
          onRemove={() => void handleRemovePhoto()}
          pendingPhoto={Boolean(photoBlob)}
          onSavePhoto={() => void handleSavePhoto()}
          onDiscardPending={() => void handleDiscardPendingPhoto()}
          savingPhoto={photoUploading}
          photoMessage={photoMessage}
          photoError={photoError}
          hint="Any gallery photo is fine — we resize it automatically. After cropping, tap ✓ Save photo."
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
          hint="To list more than one, separate them with “ | ” from oldest to newest — your most recent organisation last."
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
          label="X (Twitter)"
          value={member.twitter_link ?? ""}
          onChange={(e) => updateField("twitter_link", e.target.value)}
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

      <ProfileSection
        title="Mentorship"
        description="Help fellow Ajeets find you for guidance. Paid booking links open on external platforms."
      >
        {mentorshipForm && (
          <ProfileMentorshipSection
            isDirectoryVisible={member.is_directory_visible}
            form={mentorshipForm}
            onChange={setMentorshipForm}
          />
        )}
      </ProfileSection>

      <ProfileSection
        id={GET_INVOLVED_PROFILE_HASH}
        title="Get Involved"
        description="Express your interest in contributing to AAA initiatives. Update your preferences at any time."
      >
        <ProfileGetInvolvedSection
          member={member}
          onMemberUpdate={(updated) => setMember(updated)}
        />
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
      <Button onClick={() => void handleSave()} disabled={saving || photoUploading}>
        {saving ? "Saving…" : "Save profile details"}
      </Button>
    </div>
  );
}
