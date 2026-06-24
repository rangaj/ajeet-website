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

/** Split pipe-delimited employer strings from imports or profile edits. */
export function parseEmployers(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  if (!value.includes("|")) return [value.trim()];
  return value
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Most recent employer — last segment when pipe-delimited. */
export function getLatestEmployer(value: string | null | undefined): string | null {
  const employers = parseEmployers(value);
  if (employers.length === 0) return null;
  return employers[employers.length - 1];
}

export function getEarlierEmployers(value: string | null | undefined): string[] {
  const employers = parseEmployers(value);
  if (employers.length <= 1) return [];
  return employers.slice(0, -1);
}
