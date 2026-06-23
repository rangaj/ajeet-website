/** Sainik School Bijapur houses — alumni may belong to more than one over their tenure. */
export const HOUSES = [
  "Adilshahi",
  "Chalukya",
  "Hoysala",
  "Wodeyar",
  "Rashtrakoota",
  "Vijayanagar",
] as const;

export type HouseName = (typeof HOUSES)[number];

export function formatHouses(houses: string[]): string {
  return houses.join(", ");
}

export function parseHouses(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}
