import { formatHouses, parseHouses } from "@/constants/houses";

export function formatBatch(courseEndYear: number | null | undefined): string | null {
  if (!courseEndYear) return null;
  return `Batch ${courseEndYear}`;
}

export function formatRollNumber(rollNumber: string): string {
  return `Roll No. ${rollNumber}`;
}

export function formatIdentityLine(
  courseEndYear: number | null | undefined,
  rollNumber: string
): string {
  const batch = formatBatch(courseEndYear);
  const parts: string[] = [];
  if (batch) parts.push(batch);
  parts.push(formatRollNumber(rollNumber));
  return parts.join(" • ");
}

export function formatHouseLabel(house: string): string {
  return house.includes("House") ? house : `${house} House`;
}

export function formatHousesWithLabel(value: string | null | undefined): string {
  if (!value) return "";
  return formatHouses(parseHouses(value))
    .split(", ")
    .map((house) => formatHouseLabel(house))
    .join(", ");
}
