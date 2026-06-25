import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { appSiteHostname } from "@/lib/site-url";
import { formatDisplayShareName } from "@/lib/display-text";
import { cn } from "@/lib/utils";

export type GetInvolvedShareCardData = {
  name: string;
  batch: string | null;
  rollNumber: string;
  house: string | null;
  interestAreas: string[];
  extraAreaCount: number;
};

export function GetInvolvedShareCardVisual({
  data,
  className,
}: {
  data: GetInvolvedShareCardData;
  className?: string;
}) {
  const displayName = formatDisplayShareName(data.name);
  const identityLine = [data.batch, data.rollNumber, data.house].filter(Boolean).join(" · ");

  return (
    <div
      className={cn("w-[360px] max-w-full overflow-hidden rounded-2xl bg-white shadow-xl", className)}
      style={{ borderTop: "4px solid #c9a227" }}
    >
      <div className="bg-brand-900 px-6 py-5 text-center text-white">
        <BrandLogo size="sm" className="mx-auto" />
        <p className="mt-3 font-display text-sm font-semibold tracking-wide text-gold-200">
          Ajeet Alumni Association
        </p>
      </div>

      <div className="px-6 py-6 text-center">
        <p className="font-display text-xl font-bold text-brand-900">
          I am getting involved with AAA
        </p>
        <p className="mt-4 font-display text-lg font-semibold text-slate-900">{displayName}</p>
        {identityLine && <p className="mt-1 text-sm text-gold-700">{identityLine}</p>}

        {data.interestAreas.length > 0 && (
          <div className="mt-6 rounded-xl border border-surface-border bg-warm-white px-4 py-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Interested in contributing to
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-800">
              {data.interestAreas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
            {data.extraAreaCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                + {data.extraAreaCount} more area{data.extraAreaCount === 1 ? "" : "s"} selected
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border bg-warm-white px-6 py-4 text-center">
        <BrandMotto variant="default" className="font-display text-sm font-semibold text-brand-900" />
        <p className="mt-2 text-xs text-slate-500">{appSiteHostname()}</p>
      </div>
    </div>
  );
}
