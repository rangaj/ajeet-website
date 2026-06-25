import { useMemo } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { MENTOR_BOOKING_UNSUPPORTED_MESSAGE } from "@/constants/mentor-booking-domains";
import {
  MENTORSHIP_BLURB_MAX_LENGTH,
  PAID_SESSION_LINK_MAX_COUNT,
  parsePaidSessionLinks,
  validatePaidSessionLinks,
} from "@/lib/mentorship-links";
import type { AlumniMember } from "@/types/database";

export type MentorshipFormState = {
  openToMentorship: boolean;
  mentorshipBlurb: string;
  paidSessionsEnabled: boolean;
  paidSessionUrls: string[];
};

export function mentorshipFormFromMember(member: AlumniMember): MentorshipFormState {
  const links = parsePaidSessionLinks(member.paid_session_links);
  const urls = links.map((link) => link.url);
  return {
    openToMentorship: member.open_to_mentorship,
    mentorshipBlurb: member.mentorship_blurb ?? "",
    paidSessionsEnabled: urls.length > 0,
    paidSessionUrls:
      urls.length > 0
        ? [...urls, ...Array(Math.max(0, PAID_SESSION_LINK_MAX_COUNT - urls.length)).fill("")].slice(
            0,
            PAID_SESSION_LINK_MAX_COUNT
          )
        : [""],
  };
}

export function validateMentorshipForm(
  form: MentorshipFormState,
  isDirectoryVisible: boolean
): string | null {
  if (form.openToMentorship && !isDirectoryVisible) {
    return "Enable directory visibility before offering mentorship.";
  }
  if (form.openToMentorship) {
    const blurb = form.mentorshipBlurb.trim();
    if (!blurb) {
      return "Describe your mentorship expertise and how fellow Ajeets can reach you.";
    }
    if (blurb.length > MENTORSHIP_BLURB_MAX_LENGTH) {
      return `Mentorship description must be ${MENTORSHIP_BLURB_MAX_LENGTH} characters or less.`;
    }
  }
  if (form.paidSessionsEnabled) {
    const paid = validatePaidSessionLinks(form.paidSessionUrls);
    if (!paid.ok) return paid.message;
  }
  return null;
}

export function mentorshipPayloadFromForm(form: MentorshipFormState): {
  open_to_mentorship: boolean;
  mentorship_blurb?: string | null;
  paid_session_links?: { url: string }[];
} {
  if (!form.openToMentorship) {
    return { open_to_mentorship: false };
  }

  const blurb = form.mentorshipBlurb.trim();
  let paidLinks: { url: string }[] = [];
  if (form.paidSessionsEnabled) {
    const paid = validatePaidSessionLinks(form.paidSessionUrls);
    if (paid.ok) paidLinks = paid.links;
  }

  return {
    open_to_mentorship: true,
    mentorship_blurb: blurb,
    paid_session_links: paidLinks,
  };
}

interface ProfileMentorshipSectionProps {
  isDirectoryVisible: boolean;
  form: MentorshipFormState;
  onChange: (form: MentorshipFormState) => void;
}

export function ProfileMentorshipSection({
  isDirectoryVisible,
  form,
  onChange,
}: ProfileMentorshipSectionProps) {
  const blurbCount = form.mentorshipBlurb.length;
  const visiblePaidSlots = useMemo(() => {
    if (!form.paidSessionsEnabled) return 0;
    const filled = form.paidSessionUrls.filter((url) => url.trim()).length;
    return Math.min(PAID_SESSION_LINK_MAX_COUNT, Math.max(1, filled + 1));
  }, [form.paidSessionsEnabled, form.paidSessionUrls]);

  const update = (patch: Partial<MentorshipFormState>) => {
    onChange({ ...form, ...patch });
  };

  const updatePaidUrl = (index: number, value: string) => {
    const next = [...form.paidSessionUrls];
    next[index] = value;
    update({ paidSessionUrls: next });
  };

  return (
    <div className="space-y-4">
      {!isDirectoryVisible && (
        <p className="text-sm text-amber-800">
          Turn on directory visibility in Privacy settings before listing yourself as a mentor.
        </p>
      )}

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1 rounded border-slate-300"
          checked={form.openToMentorship}
          disabled={!isDirectoryVisible}
          onChange={(e) => update({ openToMentorship: e.target.checked })}
        />
        <span>
          <span className="font-medium text-slate-900">Open to mentoring fellow Ajeets</span>
          <span className="mt-0.5 block text-slate-600">
            Listed in the directory for registered Ajeets. Describe your expertise and how to reach you.
          </span>
        </span>
      </label>

      {form.openToMentorship && (
        <>
          <Textarea
            label="Mentorship expertise"
            value={form.mentorshipBlurb}
            onChange={(e) => update({ mentorshipBlurb: e.target.value })}
            rows={4}
            maxLength={MENTORSHIP_BLURB_MAX_LENGTH}
            placeholder="e.g. Product management, defence transitions, startups — plus how fellow Ajeets can reach you."
          />
          <p className="text-xs text-slate-500">
            {blurbCount}/{MENTORSHIP_BLURB_MAX_LENGTH} characters. Mention how fellow Ajeets can reach you.
          </p>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-300"
              checked={form.paidSessionsEnabled}
              onChange={(e) =>
                update({
                  paidSessionsEnabled: e.target.checked,
                  paidSessionUrls: e.target.checked ? [""] : [""],
                })
              }
            />
            <span>
              <span className="font-medium text-slate-900">Offer paid sessions on an external platform</span>
              <span className="mt-0.5 block text-slate-600">
                Booking and payment happen on the external site — not on ajeets.org.
              </span>
            </span>
          </label>

          {form.paidSessionsEnabled && (
            <div className="space-y-3 rounded-xl border border-surface-border bg-warm-white p-4">
              <p className="text-xs text-slate-600">{MENTOR_BOOKING_UNSUPPORTED_MESSAGE}</p>
              {Array.from({ length: visiblePaidSlots }, (_, index) => (
                <Input
                  key={index}
                  label={index === 0 ? "Booking URL" : `Booking URL ${index + 1}`}
                  type="url"
                  inputMode="url"
                  placeholder="https://topmate.io/…"
                  value={form.paidSessionUrls[index] ?? ""}
                  onChange={(e) => updatePaidUrl(index, e.target.value)}
                />
              ))}
              {visiblePaidSlots < PAID_SESSION_LINK_MAX_COUNT &&
                form.paidSessionUrls.filter((u) => u.trim()).length > 0 && (
                  <button
                    type="button"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    onClick={() =>
                      update({
                        paidSessionUrls: [
                          ...form.paidSessionUrls,
                          "",
                        ].slice(0, PAID_SESSION_LINK_MAX_COUNT),
                      })
                    }
                  >
                    Add another platform
                  </button>
                )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
