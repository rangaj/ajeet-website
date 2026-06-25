import { BadgeCheck, Linkedin, Mail, MapPin, Phone, X } from "lucide-react";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
  formatSchoolYears,
  getEarlierEmployers,
  getLatestEmployer,
} from "@/lib/alumni-display";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { MemberAvatar } from "@/components/member/MemberAvatar";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import {
  formatDisplayJobPosition,
  formatDisplayLocation,
  formatDisplayMemberName,
} from "@/lib/display-text";
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
    <section className={cn("px-5 sm:px-6", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="mt-2.5 text-sm text-slate-800">{children}</div>
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
  const schoolYears = formatSchoolYears(member.course_start_year, member.course_end_year);
  const house = formatHousesWithLabel(member.house);
  const houses = parseHouses(member.house);
  const accentColor = houses.length === 1 ? getHouseColor(houses[0]) : "#1e3a5f";
  const courseLine = [member.course, member.stream].filter(Boolean).join(" · ");
  const latestEmployer = getLatestEmployer(member.company);
  const earlierEmployers = getEarlierEmployers(member.company);
  const displayName = formatDisplayMemberName({
    name: member.name,
    salutation: member.salutation,
  });
  const displayJob = formatDisplayJobPosition(member.job_position);
  const displayLocation = formatDisplayLocation(member.current_location);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-2 w-full"
          style={{
            background:
              houses.length > 1
                ? `linear-gradient(90deg, ${houses.map((h) => getHouseColor(h)).join(", ")})`
                : accentColor,
          }}
          aria-hidden
        />

        <header
          className="relative overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pt-5"
          style={{
            background: `linear-gradient(165deg, ${accentColor}18 0%, transparent 55%), linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)`,
          }}
        >
          <BrandLogo
            size="sm"
            className="pointer-events-none absolute right-4 top-4 opacity-[0.07]"
          />

          <div className="flex items-start gap-4">
            <MemberAvatar
              name={member.name}
              profilePhotoPath={member.profile_photo_path}
              houseValue={member.house}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      {displayName}
                    </h2>
                    <HouseColorDots houseValue={member.house} size="md" />
                  </div>
                  <p className="mt-1.5 text-sm text-gold-700">
                    {[batch, formatRollNumber(member.roll_number), house]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {schoolYears && (
                    <p className="mt-1 text-sm text-slate-600">{schoolYears}</p>
                  )}
                  {displayLocation && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {displayLocation}
                    </p>
                  )}
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                    <BadgeCheck className="h-3.5 w-3.5 text-gold-600" aria-hidden />
                    Verified Ajeet
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/80 hover:text-slate-600"
                  onClick={onClose}
                  aria-label="Close profile"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-5 py-5">
          {(member.job_position || latestEmployer) && (
            <DetailSection title="Career">
              <div className="rounded-xl border border-surface-border bg-warm-white p-4 space-y-2">
                {displayJob && (
                  <p className="text-base font-semibold text-slate-900">{displayJob}</p>
                )}
                {latestEmployer && (
                  <div>
                    <p className="font-medium text-slate-800">{latestEmployer}</p>
                    {earlierEmployers.length > 0 && (
                      <div className="mt-2 border-t border-surface-border/80 pt-2">
                        <p className="text-xs font-medium text-slate-400">Earlier</p>
                        <ul className="mt-1 space-y-0.5 text-slate-600">
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
              <div className="flex flex-wrap gap-2">
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:border-brand-200 hover:bg-brand-50"
                  >
                    <Mail className="mr-1.5 h-4 w-4" />
                    Email
                  </a>
                )}
                {member.mobile_phone && (
                  <a
                    href={`tel:${member.mobile_phone}`}
                    className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:border-brand-200 hover:bg-brand-50"
                  >
                    <Phone className="mr-1.5 h-4 w-4" />
                    Call
                  </a>
                )}
                {member.linkedin_link && (
                  <a
                    href={member.linkedin_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:border-brand-200 hover:bg-brand-50"
                  >
                    <Linkedin className="mr-1.5 h-4 w-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}
