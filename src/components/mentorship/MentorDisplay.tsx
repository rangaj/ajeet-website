import { ExternalLink } from "lucide-react";
import {
  mentorBookingPlatformLabel,
  parsePaidSessionLinks,
} from "@/lib/mentorship-links";

const PAID_SESSIONS_DISCLAIMER =
  "Booking and payment happen on the external platform. AAA does not handle scheduling, fees, or disputes.";

interface MentorPaidSessionLinksProps {
  links: unknown;
  className?: string;
}

export function MentorPaidSessionLinks({ links, className }: MentorPaidSessionLinksProps) {
  const parsed = parsePaidSessionLinks(links);
  if (parsed.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs leading-relaxed text-slate-500">{PAID_SESSIONS_DISCLAIMER}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {parsed.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-surface-border bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:border-brand-200 hover:bg-brand-50"
          >
            {mentorBookingPlatformLabel(link.url)}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}

export function MentorOpenBadge({ className }: { className?: string }) {
  return (
    <span
      className={
        className ??
        "inline-flex shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 sm:text-xs"
      }
    >
      Open to mentor
    </span>
  );
}
