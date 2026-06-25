import { useEffect, useState } from "react";
import {
  GET_INVOLVED_COMMENTS_MAX_LENGTH,
  GET_INVOLVED_GEOGRAPHY_OPTIONS,
  GET_INVOLVED_INTRO,
  GET_INVOLVED_INTEREST_OPTIONS,
  GET_INVOLVED_TIME_OPTIONS,
  type GetInvolvedGeographyValue,
  type GetInvolvedInterestValue,
  type GetInvolvedTimeValue,
} from "@/constants/get-involved";
import { updateGetInvolvedPreferences } from "@/lib/data-access";
import { GetInvolvedShareBlock } from "@/components/profile/GetInvolvedShareBlock";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import type { AlumniMember } from "@/types/database";

export type GetInvolvedFormState = {
  wantsToParticipate: boolean | null;
  interestAreas: GetInvolvedInterestValue[];
  geography: GetInvolvedGeographyValue | "";
  timeCommitment: GetInvolvedTimeValue | "";
  comments: string;
};

export function getInvolvedFormFromMember(member: AlumniMember): GetInvolvedFormState {
  const areas = (member.get_involved_interest_areas ?? []).filter(
    (value): value is GetInvolvedInterestValue =>
      GET_INVOLVED_INTEREST_OPTIONS.some((option) => option.value === value)
  );

  return {
    wantsToParticipate: member.get_involved_wants_to_participate,
    interestAreas: areas,
    geography: (member.get_involved_geography as GetInvolvedGeographyValue) ?? "",
    timeCommitment: (member.get_involved_time_commitment as GetInvolvedTimeValue) ?? "",
    comments: member.get_involved_comments ?? "",
  };
}

export function validateGetInvolvedForm(form: GetInvolvedFormState): string | null {
  if (form.wantsToParticipate === null) {
    return "Please indicate whether you would like to get involved.";
  }
  if (!form.wantsToParticipate) return null;

  if (form.interestAreas.length === 0) {
    return "Select at least one area of interest.";
  }
  if (!form.geography) {
    return "Select a preferred geography.";
  }
  if (!form.timeCommitment) {
    return "Select a time commitment.";
  }
  if (form.comments.length > GET_INVOLVED_COMMENTS_MAX_LENGTH) {
    return `Comments must be ${GET_INVOLVED_COMMENTS_MAX_LENGTH} characters or less.`;
  }
  return null;
}

interface ProfileGetInvolvedSectionProps {
  member: AlumniMember;
  onMemberUpdate: (member: AlumniMember) => void;
}

export function ProfileGetInvolvedSection({
  member,
  onMemberUpdate,
}: ProfileGetInvolvedSectionProps) {
  const [form, setForm] = useState<GetInvolvedFormState>(() => getInvolvedFormFromMember(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(getInvolvedFormFromMember(member));
  }, [member.get_involved_updated_at, member.id]);

  const showDetails = form.wantsToParticipate === true;
  const hasSavedPreferences = Boolean(member.get_involved_updated_at);
  const showShareCard =
    hasSavedPreferences && member.get_involved_wants_to_participate === true;

  const toggleInterest = (value: GetInvolvedInterestValue) => {
    setForm((current) => {
      const exists = current.interestAreas.includes(value);
      return {
        ...current,
        interestAreas: exists
          ? current.interestAreas.filter((area) => area !== value)
          : [...current.interestAreas, value],
      };
    });
  };

  const handleSave = async () => {
    const validationError = validateGetInvolvedForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (form.wantsToParticipate === null) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: saveError } = await updateGetInvolvedPreferences({
      wants_to_participate: form.wantsToParticipate,
      interest_areas: form.wantsToParticipate ? form.interestAreas : [],
      geography: form.wantsToParticipate ? form.geography || null : null,
      time_commitment: form.wantsToParticipate ? form.timeCommitment || null : null,
      comments: form.wantsToParticipate ? form.comments.trim() || null : null,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    const now = new Date().toISOString();
    const updatedMember: AlumniMember = {
      ...member,
      updated_at: now,
      get_involved_wants_to_participate: form.wantsToParticipate,
      get_involved_interest_areas: form.wantsToParticipate ? form.interestAreas : [],
      get_involved_geography: form.wantsToParticipate ? form.geography || null : null,
      get_involved_time_commitment: form.wantsToParticipate ? form.timeCommitment || null : null,
      get_involved_comments: form.wantsToParticipate ? form.comments.trim() || null : null,
      get_involved_updated_at: now,
    };
    onMemberUpdate(updatedMember);

    setMessage(
      form.wantsToParticipate
        ? "Thank you for your interest in supporting AAA. Your preferences have been saved and can be updated at any time from your profile."
        : "Your Get Involved preferences have been updated. You can choose to get involved again at any time."
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        {GET_INVOLVED_INTRO.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-900">
          Would you like to get involved with AAA initiatives?
        </legend>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="radio"
            name="get-involved-status"
            className="mt-1"
            checked={form.wantsToParticipate === true}
            onChange={() => setForm((current) => ({ ...current, wantsToParticipate: true }))}
          />
          <span>Yes, I would like to get involved</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            type="radio"
            name="get-involved-status"
            className="mt-1"
            checked={form.wantsToParticipate === false}
            onChange={() =>
              setForm((current) => ({
                ...current,
                wantsToParticipate: false,
              }))
            }
          />
          <span>Not at this time</span>
        </label>
      </fieldset>

      {showDetails && (
        <div className="space-y-5 border-t border-surface-border pt-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-900">Areas of interest</legend>
            <p className="text-xs text-slate-500">Select all that apply.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {GET_INVOLVED_INTEREST_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300"
                    checked={form.interestAreas.includes(option.value)}
                    onChange={() => toggleInterest(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-900">Preferred geography</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {GET_INVOLVED_GEOGRAPHY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="get-involved-geography"
                    checked={form.geography === option.value}
                    onChange={() =>
                      setForm((current) => ({ ...current, geography: option.value }))
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-900">Time commitment</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {GET_INVOLVED_TIME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm text-slate-700"
                >
                  <input
                    type="radio"
                    name="get-involved-time"
                    checked={form.timeCommitment === option.value}
                    onChange={() =>
                      setForm((current) => ({ ...current, timeCommitment: option.value }))
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Textarea
            label="Additional comments (optional)"
            value={form.comments}
            onChange={(e) => setForm((current) => ({ ...current, comments: e.target.value }))}
            rows={4}
            maxLength={GET_INVOLVED_COMMENTS_MAX_LENGTH}
            placeholder="Tell us a little about how you would like to contribute or any specific skills, experience, or interests you would like to share."
          />
          <p className="text-xs text-slate-500">
            {form.comments.length}/{GET_INVOLVED_COMMENTS_MAX_LENGTH} characters
          </p>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <Button type="button" onClick={() => void handleSave()} disabled={saving}>
        {saving ? "Saving…" : "Save Get Involved Preferences"}
      </Button>

      {showShareCard && <GetInvolvedShareBlock member={member} />}
    </div>
  );
}
