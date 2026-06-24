import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
} from "@/lib/alumni-display";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberCardProps {
  member: SearchResult;
  onClick: () => void;
}

export function DirectoryMemberCard({ member, onClick }: DirectoryMemberCardProps) {
  const batch = formatBatch(member.course_end_year);
  const house = formatHousesWithLabel(member.house);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-xl border border-surface-border bg-white px-4 py-4 text-left transition hover:border-brand-200 hover:shadow-card sm:px-5 sm:py-5"
    >
      <div className="space-y-2">
        <h3 className="font-display text-base font-semibold tracking-tight text-slate-900 group-hover:text-brand-700 sm:text-lg">
          {member.name}
        </h3>

        <p className="text-sm text-slate-600">
          {[batch, formatRollNumber(member.roll_number)].filter(Boolean).join(" • ")}
        </p>

        {member.job_position && (
          <p className="text-sm font-medium text-slate-800">{member.job_position}</p>
        )}

        {member.company && (
          <p className="text-sm text-slate-600">{member.company}</p>
        )}

        {member.current_location && (
          <p className="text-sm text-slate-500">{member.current_location}</p>
        )}

        {house && <p className="text-sm text-slate-500">{house}</p>}
      </div>
    </button>
  );
}
