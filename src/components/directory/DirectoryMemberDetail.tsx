import { Linkedin, Mail, MapPin, Phone, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
  getEarlierEmployers,
  getLatestEmployer,
} from "@/lib/alumni-display";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberDetailProps {
  member: SearchResult;
  onClose: () => void;
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <section className={cn("border-t border-surface-border pt-5", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-3 text-sm text-slate-800">{children}</div>
    </section>
  );
}

function SkillChips({ value }: { value: string }) {
  const skills = value
    .split(/[,;]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (skills.length === 0) return <p className="leading-relaxed">{value}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className="rounded-full border border-surface-border bg-warm-white px-2.5 py-1 text-xs font-medium text-slate-700"
        >
          {skill}
        </span>
      ))}
    </div>
  );
}

export function DirectoryMemberDetail({ member, onClose }: DirectoryMemberDetailProps) {
  const batch = formatBatch(member.course_end_year);
  const house = formatHousesWithLabel(member.house);
  const houses = parseHouses(member.house);
  const accentColor = houses.length === 1 ? getHouseColor(houses[0]) : undefined;
  const courseLine = [member.course, member.stream, member.course_end_year]
    .filter(Boolean)
    .join(" · ");
  const latestEmployer = getLatestEmployer(member.company);
  const earlierEmployers = getEarlierEmployers(member.company);
  const identityParts = [
    batch,
    formatRollNumber(member.roll_number),
    house || null,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <Card
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-b-none rounded-t-2xl border-t-4 p-5 sm:rounded-2xl sm:p-6"
        style={accentColor ? { borderTopColor: accentColor } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {member.name}
              </h2>
              <HouseColorDots houseValue={member.house} size="md" />
            </div>
            {identityParts.length > 0 && (
              <p className="text-sm text-slate-600">{identityParts.join(" · ")}</p>
            )}
            {member.current_location && (
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {member.current_location}
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close profile"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {(member.job_position || latestEmployer) && (
          <DetailSection title="Career" className="mt-5 border-t-0 pt-0">
            <div className="space-y-3">
              {member.job_position && (
                <p className="text-base font-medium text-slate-900">{member.job_position}</p>
              )}
              {latestEmployer && (
                <div>
                  <p className="font-medium text-slate-800">{latestEmployer}</p>
                  {earlierEmployers.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-400">Earlier</p>
                      <ul className="mt-1.5 space-y-1 text-slate-600">
                        {[...earlierEmployers].reverse().map((employer) => (
                          <li key={employer}>{employer}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DetailSection>
        )}

        {courseLine && (
          <DetailSection title="Academic">
            <p>{courseLine}</p>
          </DetailSection>
        )}

        {member.professional_skills && (
          <DetailSection title="Skills">
            <SkillChips value={member.professional_skills} />
          </DetailSection>
        )}

        {(member.email || member.mobile_phone || member.linkedin_link) && (
          <DetailSection title="Contact">
            <div className="space-y-2.5 rounded-xl bg-warm-white p-3">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="flex items-center gap-2 text-brand-600 hover:text-brand-700"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {member.email}
                </a>
              )}
              {member.mobile_phone && (
                <a
                  href={`tel:${member.mobile_phone}`}
                  className="flex items-center gap-2 text-brand-600 hover:text-brand-700"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {member.mobile_phone}
                </a>
              )}
              {member.linkedin_link && (
                <a
                  href={member.linkedin_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-brand-600 hover:text-brand-700"
                >
                  <Linkedin className="h-4 w-4 shrink-0" />
                  LinkedIn
                </a>
              )}
            </div>
          </DetailSection>
        )}
      </Card>
    </div>
  );
}
