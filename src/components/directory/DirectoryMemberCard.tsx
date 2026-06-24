import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
} from "@/lib/alumni-display";
import { parseHouses } from "@/constants/houses";
import { HouseColorDots, HouseColorStrip } from "@/components/house/HouseColorDots";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberCardProps {
  member: SearchResult;
  onClick: () => void;
}

export function DirectoryMemberCard({ member, onClick }: DirectoryMemberCardProps) {
  const batch = formatBatch(member.course_end_year);
  const house = formatHousesWithLabel(member.house);
  const houses = parseHouses(member.house);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl border border-surface-border bg-white py-4 pl-5 pr-4 text-left transition hover:border-brand-200 hover:shadow-card sm:py-5 sm:pl-6 sm:pr-5"
    >
      <HouseColorStrip houses={houses} />
      <div className="space-y-2">
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
