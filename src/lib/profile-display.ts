export function formatProfileUpdated(updatedAt: string | null | undefined): string {
  if (!updatedAt) return "Not yet updated";

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Not yet updated";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "Updated today";
  if (diffDays === 1) return "Updated yesterday";
  if (diffDays < 30) return `Updated ${diffDays} days ago`;

  return `Updated ${date.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
}

export type ProfileCompletenessField = {
  key: string;
  label: string;
  complete: boolean;
};

export function getProfileCompleteness(member: {
  profile_photo_path?: string | null;
  current_location?: string | null;
  job_position?: string | null;
  company?: string | null;
  industries_worked_in?: string | null;
  linkedin_link?: string | null;
  professional_skills?: string | null;
}): { percent: number; fields: ProfileCompletenessField[] } {
  const fields: ProfileCompletenessField[] = [
    { key: "photo", label: "Profile Photo", complete: Boolean(member.profile_photo_path) },
    { key: "location", label: "Location", complete: Boolean(member.current_location?.trim()) },
    { key: "role", label: "Current Role", complete: Boolean(member.job_position?.trim()) },
    { key: "org", label: "Organisation", complete: Boolean(member.company?.trim()) },
    { key: "industry", label: "Industry", complete: Boolean(member.industries_worked_in?.trim()) },
    { key: "linkedin", label: "LinkedIn", complete: Boolean(member.linkedin_link?.trim()) },
    { key: "skills", label: "Skills", complete: Boolean(member.professional_skills?.trim()) },
  ];

  const complete = fields.filter((f) => f.complete).length;
  const percent = Math.round((complete / fields.length) * 100);

  return { percent, fields };
}

export function formatDirectoryResultCount(
  shown: number,
  total: number | null | undefined
): string {
  if (total == null || total === 0) {
    return shown === 0 ? "No matching results" : `${shown} Ajeet${shown === 1 ? "" : "s"} found`;
  }
  if (shown >= total) {
    return `${total} Ajeet${total === 1 ? "" : "s"} found`;
  }
  return `Showing ${shown} of ${total} results`;
}
