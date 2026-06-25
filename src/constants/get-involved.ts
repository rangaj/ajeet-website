export const GET_INVOLVED_INTRO = [
  "The Ajeet community thrives because alumni contribute their time, expertise, and experience to support fellow Ajeets and strengthen the Association.",
  "Whether you would like to support technology initiatives, events, communications, student outreach, regional activities, or other community efforts, we would love to hear from you.",
  "There is no minimum commitment. Every contribution, big or small, helps strengthen the Ajeet fraternity.",
] as const;

export const GET_INVOLVED_INTEREST_OPTIONS = [
  { value: "technology_platform", label: "Technology & Platform" },
  { value: "events_reunions", label: "Events & Reunions" },
  { value: "communications_content", label: "Communications & Content" },
  { value: "student_outreach", label: "Student Outreach" },
  { value: "fundraising_sponsorship", label: "Fundraising & Sponsorship" },
  { value: "regional_chapters", label: "Regional Chapters & Activities" },
  { value: "alumni_data_directory", label: "Alumni Data & Directory" },
  { value: "podcast_media", label: "Podcast & Media Initiatives" },
  { value: "administrative_support", label: "Administrative Support" },
  { value: "other", label: "Other" },
] as const;

export type GetInvolvedInterestValue =
  (typeof GET_INVOLVED_INTEREST_OPTIONS)[number]["value"];

export const GET_INVOLVED_GEOGRAPHY_OPTIONS = [
  { value: "local_city", label: "Local City Only" },
  { value: "state_region", label: "State / Region" },
  { value: "india", label: "Anywhere in India" },
  { value: "global_remote", label: "Global / Remote" },
] as const;

export type GetInvolvedGeographyValue =
  (typeof GET_INVOLVED_GEOGRAPHY_OPTIONS)[number]["value"];

export const GET_INVOLVED_TIME_OPTIONS = [
  { value: "occasionally", label: "Occasionally, as needed" },
  { value: "quarterly", label: "A few hours per quarter" },
  { value: "monthly", label: "A few hours per month" },
  { value: "discuss", label: "Happy to discuss" },
] as const;

export type GetInvolvedTimeValue = (typeof GET_INVOLVED_TIME_OPTIONS)[number]["value"];

export const GET_INVOLVED_PROFILE_HASH = "get-involved";
export const GET_INVOLVED_PROFILE_PATH = `/profile#${GET_INVOLVED_PROFILE_HASH}`;

export const GET_INVOLVED_COMMENTS_MAX_LENGTH = 2000;

/** Share card headline — two lines avoids clipping at 360px export width. */
export const GET_INVOLVED_CARD_HEADLINE = {
  line1: "Getting involved",
  line2: "with AAA initiatives",
} as const;

export const GET_INVOLVED_CARD_INTEREST_LABEL = "Contributing to";

export const GET_INVOLVED_CARD_SUBLINE = "Ajeet alumnus · Sainik School Bijapur";

export const GET_INVOLVED_CARD_WIDTH_PX = 360;

export const GET_INVOLVED_SHARE_TEXT = `I have opted in to get involved with the Ajeet Alumni Association and contribute to AAA initiatives.

Ajeet Hain. Abheet Hain.

Join the Ajeet network:
https://new.ajeets.org`;

export function getInvolvedInterestLabel(value: string): string {
  return (
    GET_INVOLVED_INTEREST_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function getInvolvedGeographyLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (
    GET_INVOLVED_GEOGRAPHY_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function getInvolvedTimeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return GET_INVOLVED_TIME_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatGetInvolvedInterestLabels(areas: string[] | null | undefined): string {
  if (!areas?.length) return "—";
  return areas.map(getInvolvedInterestLabel).join("; ");
}

export function formatGetInvolvedAreasForCard(areas: string[]): {
  shown: string[];
  extraCount: number;
} {
  const labels = areas.map(getInvolvedInterestLabel);
  if (labels.length <= 3) {
    return { shown: labels, extraCount: 0 };
  }
  return { shown: labels.slice(0, 3), extraCount: labels.length - 3 };
}
