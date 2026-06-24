import {
  formatBatch,
  formatHousesWithLabel,
  formatRollNumber,
  getLatestEmployer,
} from "@/lib/alumni-display";
import { ShareCardAvatar } from "@/components/share/ShareCardAvatar";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { BrandLogo, BrandMotto } from "@/components/brand/BrandLogo";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";
import type { ShareLinkType } from "@/lib/data-access";

export type ShareCardVisualData = {
  linkType: ShareLinkType;
  name: string;
  rollNumber: string;
  house: string | null;
  courseEndYear: number | null;
  jobPosition?: string | null;
  company?: string | null;
  currentLocation?: string | null;
  photoDataUrl?: string | null;
};

export function ShareCardVisual({
  data,
  className,
}: {
  data: ShareCardVisualData;
  className?: string;
}) {
  const batch = formatBatch(data.courseEndYear);
  const house = formatHousesWithLabel(data.house);
  const houses = parseHouses(data.house);
  const accent = houses.length === 1 ? getHouseColor(houses[0]) : "#1e3a5f";
  const latestEmployer = getLatestEmployer(data.company);
  const isNetwork = data.linkType === "network";
  const identityLine = [formatRollNumber(data.rollNumber), house].filter(Boolean).join(" · ");

  return (
    <div
      className={cn("w-[360px] max-w-full overflow-hidden rounded-2xl bg-white shadow-xl", className)}
      style={{ borderTop: `4px solid ${accent}` }}
    >
      {isNetwork ? (
        <div className="bg-brand-900 px-6 py-7 text-center text-white">
          <BrandLogo size="sm" className="mx-auto mb-3" />
          <p className="font-display text-lg font-semibold">Ajeet Alumni Network</p>
          <BrandMotto variant="subtle" className="mt-1 text-gold-300" />
          <div className="mt-5 rounded-xl bg-white/15 px-4 py-5">
            <ShareCardAvatar
              name={data.name}
              houseValue={data.house}
              photoDataUrl={data.photoDataUrl}
              size="xl"
              className="mx-auto"
            />
            <p className="mt-4 font-display text-xl font-bold">{data.name}</p>
            {identityLine && <p className="mt-1 text-sm text-gold-200">{identityLine}</p>}
            <p className="mt-4 text-sm leading-relaxed text-brand-100">
              I&apos;m on the Ajeet Alumni Network. Claim or join to connect with fellow Sainik
              School Bijapur Ajeets.
            </p>
          </div>
          <p className="mt-5 text-xs text-brand-200">Sainik School Bijapur · Ajeet Alumni Association</p>
        </div>
      ) : (
        <>
          <div className="px-6 py-7">
            <div className="flex items-start gap-4">
              <ShareCardAvatar
                name={data.name}
                houseValue={data.house}
                photoDataUrl={data.photoDataUrl}
                size="xl"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-xl font-bold text-slate-900">{data.name}</p>
                  <HouseColorDots houseValue={data.house} size="md" />
                </div>
                <p className="mt-1 text-sm font-medium text-gold-700">
                  {[batch, formatRollNumber(data.rollNumber), house].filter(Boolean).join(" · ")}
                </p>
                {data.jobPosition && (
                  <p className="mt-3 text-base font-semibold text-slate-900">{data.jobPosition}</p>
                )}
                {latestEmployer && <p className="text-sm text-slate-700">{latestEmployer}</p>}
                {data.currentLocation && (
                  <p className="mt-1 text-sm text-slate-500">{data.currentLocation}</p>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-surface-border bg-warm-white px-6 py-4">
            <div className="flex flex-col items-center gap-2.5">
              <BrandLogo size="sm" />
              <div className="text-center">
                <p
                  className="font-display text-sm font-bold text-brand-900"
                  style={{ display: "block", lineHeight: "1.4", margin: 0 }}
                >
                  Ajeet Alumni Association
                </p>
                <p
                  className="text-xs text-brand-600"
                  style={{ display: "block", lineHeight: "1.4", marginTop: 4 }}
                >
                  Sainik School Bijapur
                </p>
              </div>
            </div>
            <p
              className="mt-3 text-center text-[11px] text-slate-400"
              style={{ display: "block", lineHeight: "1.4" }}
            >
              Verified alumni network · ajeetalumni.org
            </p>
          </div>
        </>
      )}
    </div>
  );
}
