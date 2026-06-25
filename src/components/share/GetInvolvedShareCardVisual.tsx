import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { ShareCardAvatar } from "@/components/share/ShareCardAvatar";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import {
  GET_INVOLVED_CARD_HEADLINE,
  GET_INVOLVED_CARD_INTEREST_LABEL,
  GET_INVOLVED_CARD_SUBLINE,
  GET_INVOLVED_CARD_WIDTH_PX,
} from "@/constants/get-involved";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { appSiteHostname } from "@/lib/site-url";
import { formatDisplayShareName } from "@/lib/display-text";
import { cn } from "@/lib/utils";

export type GetInvolvedShareCardData = {
  name: string;
  batch: string | null;
  rollNumber: string;
  house: string | null;
  houseValue?: string | null;
  photoDataUrl?: string | null;
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
  const houses = parseHouses(data.houseValue ?? data.house);
  const accent = houses.length === 1 ? getHouseColor(houses[0]) : "#c9a227";

  return (
    <div
      className={cn("max-w-full overflow-hidden rounded-2xl bg-white shadow-xl", className)}
      style={{ width: GET_INVOLVED_CARD_WIDTH_PX, borderTop: `4px solid ${accent}` }}
    >
      <div className="bg-brand-900 px-5 py-4 text-center text-white">
        <BrandLogo size="sm" className="mx-auto" />
        <p className="mt-2 font-display text-xs font-semibold tracking-wide text-gold-200">
          Ajeet Alumni Association
        </p>
      </div>

      <div className="px-5 py-5">
        <p className="text-center font-display text-lg font-bold leading-tight text-brand-900">
          {GET_INVOLVED_CARD_HEADLINE.line1}
          <br />
          <span className="text-gold-700">{GET_INVOLVED_CARD_HEADLINE.line2}</span>
        </p>

        <div className="mt-5 rounded-xl border border-surface-border bg-warm-white px-4 py-4 text-center">
          <ShareCardAvatar
            name={data.name}
            houseValue={data.houseValue ?? data.house}
            photoDataUrl={data.photoDataUrl}
            size="xl"
            className="mx-auto"
          />

          <div className="mt-3 flex items-center justify-center gap-2">
            <p className="font-display text-lg font-semibold leading-snug text-slate-900">
              {displayName}
            </p>
            <HouseColorDots houseValue={data.houseValue ?? data.house} size="sm" />
          </div>

          <p className="mt-1 text-xs text-slate-500">{GET_INVOLVED_CARD_SUBLINE}</p>

          <dl className="mt-2 space-y-0.5 text-sm leading-snug text-gold-800">
            {data.batch && (
              <div>
                <dt className="sr-only">Batch</dt>
                <dd>{data.batch}</dd>
              </div>
            )}
            {data.rollNumber && (
              <div>
                <dt className="sr-only">Roll number</dt>
                <dd>{data.rollNumber}</dd>
              </div>
            )}
            {data.house && (
              <div>
                <dt className="sr-only">House</dt>
                <dd className="text-pretty">{data.house}</dd>
              </div>
            )}
          </dl>
        </div>

        {data.interestAreas.length > 0 && (
          <div className="mt-4 rounded-xl border border-surface-border bg-white px-4 py-3 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {GET_INVOLVED_CARD_INTEREST_LABEL}
            </p>
            <ul className="mt-2 space-y-1 text-sm leading-snug text-slate-800">
              {data.interestAreas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
            {data.extraAreaCount > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                + {data.extraAreaCount} more area{data.extraAreaCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-surface-border bg-warm-white px-5 py-4 text-center">
        <BrandMotto variant="default" className="font-display text-sm font-semibold text-brand-900" />
        <p className="mt-2 text-xs text-slate-500">{appSiteHostname()}</p>
      </div>
    </div>
  );
}
