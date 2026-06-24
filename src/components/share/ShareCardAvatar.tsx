import { initialsFromName } from "@/lib/image";
import { parseHouses, getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";

const sizePx = {
  sm: 40,
  md: 56,
  lg: 72,
  xl: 80,
} as const;

/** Flat avatar for share-card PNG export (Safari-safe). */
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
  const houses = parseHouses(houseValue);
  const ringColor = houses.length === 1 ? getHouseColor(houses[0]) : "#c9a227";
  const initials = initialsFromName(name);

  return (
    <div
      className={cn("shrink-0 rounded-full bg-brand-50", className)}
      style={{
        width: px,
        height: px,
        boxShadow: `0 0 0 2px ${ringColor}`,
        overflow: "hidden",
      }}
    >
      {photoDataUrl ? (
        <img
          src={photoDataUrl}
          alt=""
          width={px}
          height={px}
          decoding="sync"
          style={{
            display: "block",
            width: px,
            height: px,
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          className="flex items-center justify-center font-bold text-brand-700"
          style={{ width: px, height: px, fontSize: size === "xl" ? 18 : 14 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
