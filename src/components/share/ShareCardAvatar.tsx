import { initialsFromName } from "@/lib/image";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";

const sizePx = {
  sm: 40,
  md: 56,
  lg: 72,
  xl: 80,
} as const;

const ringWidth = 2;

/** Flat avatar for share-card PNG export (Safari-safe — no box-shadow). */
export function ShareCardAvatar({
  name,
  houseValue,
  photoDataUrl,
  size = "xl",
  className,
}: {
  name: string;
  houseValue?: string | null;
  photoDataUrl?: string | null;
  size?: keyof typeof sizePx;
  className?: string;
}) {
  const px = sizePx[size];
  const innerPx = px - ringWidth * 2;
  const houses = parseHouses(houseValue);
  const ringColor = houses.length === 1 ? getHouseColor(houses[0]) : "#c9a227";
  const initials = initialsFromName(name);

  return (
    <div
      className={cn("shrink-0 rounded-full", className)}
      style={{
        width: px,
        height: px,
        padding: ringWidth,
        backgroundColor: ringColor,
        boxSizing: "border-box",
      }}
    >
      <div
        className="overflow-hidden rounded-full bg-brand-50"
        style={{ width: innerPx, height: innerPx }}
      >
        {photoDataUrl ? (
          <img
            src={photoDataUrl}
            alt=""
            width={innerPx}
            height={innerPx}
            decoding="sync"
            style={{
              display: "block",
              width: innerPx,
              height: innerPx,
              objectFit: "cover",
            }}
          />
        ) : (
          <span
            className="flex items-center justify-center font-bold text-brand-700"
            style={{ width: innerPx, height: innerPx, fontSize: size === "xl" ? 18 : 14 }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
