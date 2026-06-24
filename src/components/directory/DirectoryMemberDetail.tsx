import { Linkedin, Mail, Phone, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
} from "@/lib/alumni-display";
import type { SearchResult } from "@/types/database";

interface DirectoryMemberDetailProps {
  member: SearchResult;
  onClose: () => void;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <section className="border-t border-surface-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-2 text-sm text-slate-800">{children}</div>
    </section>
  );
}

export function DirectoryMemberDetail({ member, onClose }: DirectoryMemberDetailProps) {
  const batch = formatBatch(member.course_end_year);
  const house = formatHousesWithLabel(member.house);
  const courseLine = [member.course, member.stream, member.course_end_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <Card
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-b-none rounded-t-2xl p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {member.name}
            </h2>
            {batch && <p className="text-sm text-slate-600">{batch}</p>}
            <p className="text-sm text-slate-600">{formatRollNumber(member.roll_number)}</p>
            {house && <p className="text-sm text-slate-600">{house}</p>}
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

        <div className="mt-4 space-y-1">
          {member.job_position && (
            <p className="text-base font-medium text-slate-900">{member.job_position}</p>
          )}
          {member.company && (
            <p className="text-sm text-slate-700">{member.company}</p>
          )}
          {member.current_location && (
            <p className="text-sm text-slate-500">{member.current_location}</p>
          )}
        </div>

        {courseLine && (
          <DetailSection title="Academic">
            <p>{courseLine}</p>
          </DetailSection>
        )}

        {member.professional_skills && (
          <DetailSection title="Skills">
            <p className="leading-relaxed">{member.professional_skills}</p>
          </DetailSection>
        )}

        {(member.email || member.mobile_phone || member.linkedin_link) && (
          <DetailSection title="Contact">
            <div className="space-y-2">
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
