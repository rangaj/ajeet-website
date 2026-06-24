import { useState } from "react";
import {
  formatBatch,
  formatRollNumber,
  getEarlierEmployers,
  getLatestEmployer,
  parseEmployers,
} from "@/lib/alumni-display";
import { parseHouses } from "@/constants/houses";
import { HouseColorDots, HouseColorStrip } from "@/components/house/HouseColorDots";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberCardProps {
  member: SearchResult;
  onClick: () => void;
}

export function DirectoryMemberCard({ member, onClick }: DirectoryMemberCardProps) {
  const [employersExpanded, setEmployersExpanded] = useState(false);
  const batch = formatBatch(member.course_end_year);
  const houses = parseHouses(member.house);
  const employers = parseEmployers(member.company);
  const latestEmployer = getLatestEmployer(member.company);
  const earlierEmployers = getEarlierEmployers(member.company);
  const hasMultipleEmployers = employers.length > 1;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-surface-border bg-white py-4 pl-5 pr-4 text-left transition hover:border-brand-200 hover:shadow-card sm:py-5 sm:pl-6 sm:pr-5"
    >
      <HouseColorStrip houses={houses} />
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-display text-base font-semibold tracking-tight text-slate-900 group-hover:text-brand-700 sm:text-lg">
            {member.name}
          </h3>
          <HouseColorDots houseValue={member.house} className="mt-1.5" />
        </div>

        <p className="text-sm text-gold-700">
          {[batch, formatRollNumber(member.roll_number)].filter(Boolean).join(" • ")}
        </p>

        {member.job_position && (
          <p className="line-clamp-1 text-sm font-medium text-slate-800">{member.job_position}</p>
        )}

        {latestEmployer && (
          <div className="text-sm text-slate-600">
            {employersExpanded && hasMultipleEmployers ? (
              <ul className="space-y-1">
                {employers.map((employer) => (
                  <li key={employer} className="line-clamp-1">
                    {employer}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="line-clamp-1">{latestEmployer}</p>
            )}
            {hasMultipleEmployers && (
              <button
                type="button"
                className="mt-0.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                onClick={(event) => {
                  event.stopPropagation();
                  setEmployersExpanded((open) => !open);
                }}
              >
                {employersExpanded
                  ? "Show less"
                  : `+${earlierEmployers.length} earlier employer${earlierEmployers.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto space-y-1 pt-1">
          {member.current_location && (
            <p className="line-clamp-1 text-sm text-slate-500">{member.current_location}</p>
          )}
        </div>
      </div>
    </div>
  );
}
