import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import {
  formatProfileUpdated,
  getProfileCompleteness,
} from "@/lib/profile-display";
import { supabase } from "@/lib/supabase";
import { fetchAlumniMemberByUserId, updateOwnAlumniProfile, updateOwnJoinYear, updateOwnDob } from "@/lib/data-access";
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
import { Input, PhoneInput, Textarea } from "@/components/ui/Input";
import { validatePhoneNational, splitE164 } from "@/constants/country-codes";
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
  const [joinYear, setJoinYear] = useState("");
  const [dob, setDob] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAlumniMemberByUserId(user.id).then(async ({ data }) => {
      setMember(data);
      setJoinYear(data?.course_start_year ? String(data.course_start_year) : "");
      setDob(data?.date_of_birth ? String(data.date_of_birth).slice(0, 10) : "");
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

  const handleChangeEmail = async () => {
    const target = newEmail.trim().toLowerCase();
    setEmailNotice(null);
    setEmailError(null);
    if (!target) {
      setEmailError("Enter the new email address.");
      return;
    }
    if (target === (user?.email ?? "").toLowerCase()) {
      setEmailError("That is already your login email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailSaving(true);
    const { error: err } = await supabase.auth.updateUser(
      { email: target },
      { emailRedirectTo: `${window.location.origin}/profile` }
    );
    setEmailSaving(false);
    if (err) {
      setEmailError(err.message);
      return;
    }
    setEmailNotice(
      `We've sent a confirmation link to ${target}. Open it from that inbox to finish the change. ` +
        "Until you confirm, keep signing in with your current email."
    );
    setNewEmail("");
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

    const { iso, national } = splitE164(member.mobile_phone ?? "");
    const phoneError = validatePhoneNational(iso, national);
    if (phoneError) {
      setError(phoneError);
      setSaving(false);
      return;
    }

    const desiredJoinYear = joinYear.trim() ? Number(joinYear.trim()) : null;
    if (desiredJoinYear !== null) {
      const invalidRange =
        !Number.isFinite(desiredJoinYear) || desiredJoinYear < 1955 || desiredJoinYear > 2030;
      const afterBatch =
        member.course_end_year != null && desiredJoinYear > member.course_end_year;
      if (invalidRange || afterBatch) {
        setError("Enter a valid join year (not after your passing-out year).");
        setSaving(false);
        return;
      }
    }
    const joinYearChanged = desiredJoinYear !== (member.course_start_year ?? null);

    const desiredDob = dob.trim() || null;
    if (desiredDob) {
      const dobDate = new Date(desiredDob);
      const birthYear = dobDate.getFullYear();
      const effectiveStart = desiredJoinYear;
      const effectiveEnd = member.course_end_year ?? null;
      let dobError: string | null = null;
      if (Number.isNaN(dobDate.getTime()) || birthYear < 1930) {
        dobError = "Enter a valid date of birth.";
      } else if (dobDate > new Date()) {
        dobError = "Date of birth can't be in the future.";
      } else if (effectiveStart != null) {
        const joinAge = effectiveStart - birthYear;
        if (joinAge < 8 || joinAge > 15) {
          dobError =
            "Please check your date of birth — students usually join SSBJ around age 10–11, so this doesn't line up with your join year.";
        }
      } else if (effectiveEnd != null) {
        const passAge = effectiveEnd - birthYear;
        if (passAge < 14 || passAge > 22) {
          dobError =
            "Please check your date of birth — it doesn't line up with your batch (passing-out) year.";
        }
      }
      if (dobError) {
        setError(dobError);
        setSaving(false);
        return;
      }
    }
    const dobChanged = desiredDob !== ((member.date_of_birth ?? "") ? String(member.date_of_birth).slice(0, 10) : null);

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

    if (err) {
      setSaving(false);
      setError(`Profile save failed: ${err.message}`);
      return;
    }

    if (joinYearChanged) {
      const { error: yearErr } = await updateOwnJoinYear(desiredJoinYear);
      if (yearErr) {
        setSaving(false);
        setError(`Could not update join year: ${yearErr.message}`);
        return;
      }
    }

    if (dobChanged) {
      const { error: dobErr } = await updateOwnDob(desiredDob);
      if (dobErr) {
        setSaving(false);
        setError(`Could not update date of birth: ${dobErr.message}`);
        return;
      }
    }

    setSaving(false);
    {
      setMessage("Profile updated.");
      const now = new Date().toISOString();
      const updatedMember: AlumniMember = {
        ...member,
        course_start_year: desiredJoinYear,
        date_of_birth: desiredDob,
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
        title="School years"
        description="Your batch is fixed. Adjust your join year or date of birth if a detail was recorded incorrectly."
      >
        <div className="rounded-xl border border-surface-border bg-warm-white px-3 py-2.5 text-sm">
          <span className="text-slate-500">Batch (passing out)</span>
          <p className="font-medium text-brand-800">{member.course_end_year ?? "—"}</p>
        </div>
        <Input
          label="Join year"
          type="number"
          value={joinYear}
          onChange={(e) => setJoinYear(e.target.value)}
          placeholder="e.g. 1980"
          hint="Usually about 7 years before your passing-out year."
        />
        <Input
          label="Date of birth"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          min="1930-01-01"
          max={new Date().toISOString().split("T")[0]}
          hint="Optional. Should line up with joining SSBJ around age 10–11."
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
        <PhoneInput
          label="Mobile"
          value={member.mobile_phone ?? ""}
          onChange={(value) => updateField("mobile_phone", value)}
          hint="Pick your country code, then enter the number without it."
        />
        <Input
          label="Secondary email"
          value={member.secondary_email ?? ""}
          onChange={(e) => updateField("secondary_email", e.target.value)}
        />
      </ProfileSection>

      <ProfileSection
        title="Account"
        description="Your login email. Changing it requires confirming the new address."
      >
        <div className="rounded-xl border border-surface-border bg-warm-white px-3 py-2.5 text-sm">
          <span className="text-slate-500">Current login email</span>
          <p className="break-words font-medium text-brand-800">{user?.email ?? "—"}</p>
        </div>
        <Input
          label="New login email"
          type="email"
          value={newEmail}
          onChange={(e) => {
            setNewEmail(e.target.value);
            setEmailError(null);
            setEmailNotice(null);
          }}
          placeholder="you@example.com"
          error={emailError ?? undefined}
        />
        {emailNotice && <Alert variant="success">{emailNotice}</Alert>}
        <Button
          type="button"
          variant="secondary"
          onClick={() => void handleChangeEmail()}
          disabled={emailSaving || !newEmail.trim()}
        >
          {emailSaving ? "Sending confirmation…" : "Send confirmation link"}
        </Button>
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
