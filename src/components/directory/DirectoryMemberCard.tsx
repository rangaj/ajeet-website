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
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberCardProps {
  member: SearchResult;
  onClick: () => void;
  compact?: boolean;
}

export function DirectoryMemberCard({
  member,
  onClick,
  compact = false,
}: DirectoryMemberCardProps) {
  const [employersExpanded, setEmployersExpanded] = useState(false);
  const batch = formatBatch(member.course_end_year);
  const houses = parseHouses(member.house);
  const latestEmployer = getLatestEmployer(member.company);
  const earlierEmployers = getEarlierEmployers(member.company);
  const employers = parseEmployers(member.company);
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
      className={cn(
        "group relative flex h-full w-full cursor-pointer overflow-hidden rounded-xl border border-surface-border bg-white text-left transition hover:border-brand-200 hover:shadow-card",
        compact ? "flex-row items-center gap-3 p-3" : "flex-col sm:flex-row sm:items-stretch sm:gap-4 sm:p-4 sm:pl-5"
      )}
    >
      <HouseColorStrip houses={houses} className={compact ? "bottom-2 top-2" : undefined} />

      <div
        className={cn(
          "flex shrink-0",
          compact ? "pl-3" : "flex-col items-center px-4 pt-4 sm:items-start sm:px-0 sm:pt-0"
        )}
      >
        <MemberAvatar
          name={member.name}
          profilePhotoPath={member.profile_photo_path}
          houseValue={member.house}
          size={compact ? "sm" : "lg"}
        />
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1.5",
          compact ? "py-0.5 pr-2" : "px-4 pb-4 sm:py-1 sm:pr-2"
        )}
      >
        <div className="flex items-start gap-2">
          <h3
            className={cn(
              "min-w-0 flex-1 font-display font-semibold tracking-tight text-slate-900 group-hover:text-brand-700",
              compact ? "text-sm" : "text-base sm:text-lg"
            )}
          >
            {member.name}
          </h3>
          <HouseColorDots houseValue={member.house} className="mt-1" />
        </div>

        <p className={cn("text-gold-700", compact ? "text-xs" : "text-sm")}>
          {[batch, formatRollNumber(member.roll_number)].filter(Boolean).join(" • ")}
        </p>

        {!compact && member.job_position && (
          <p className="line-clamp-1 text-sm font-medium text-slate-800">{member.job_position}</p>
        )}

        {!compact && latestEmployer && (
          <div className="text-sm text-slate-600">
            {employersExpanded && hasMultipleEmployers ? (
              <ul className="space-y-0.5">
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
                  : `+${earlierEmployers.length} earlier`}
              </button>
            )}
          </div>
        )}

        <div className="mt-auto">
          {member.current_location && (
            <p className={cn("line-clamp-1 text-slate-500", compact ? "text-xs" : "text-sm")}>
              {member.current_location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
