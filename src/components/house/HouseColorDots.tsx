import { cn } from "@/lib/utils";
import {
  formatHouses,
  getHouseColor,
  parseHouses,
  type HouseName,
} from "@/constants/houses";

interface HouseColorDotsProps {
  houseValue: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function HouseColorDots({
  houseValue,
  size = "sm",
  className,
}: HouseColorDotsProps) {
  const houses = parseHouses(houseValue);
  if (houses.length === 0) return null;

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1", className)}
      aria-label={formatHouses(houses)}
    >
      {houses.map((house) => (
        <span
          key={house}
          className={cn("rounded-full", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5")}
          style={{ backgroundColor: getHouseColor(house) }}
          title={house}
        />
      ))}
    </span>
  );
}

interface HouseColorStripProps {
  houses: HouseName[];
  className?: string;
}

export function HouseColorStrip({ houses, className }: HouseColorStripProps) {
  if (houses.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-0 top-4 w-1 overflow-hidden rounded-full",
        className
      )}
      aria-hidden
    >
      {houses.map((house) => (
        <div
          key={house}
          className="w-full flex-1"
          style={{ backgroundColor: getHouseColor(house), flex: "1 1 0" }}
        />
      ))}
    </div>
  );
}
