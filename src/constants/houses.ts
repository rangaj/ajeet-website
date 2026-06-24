/** Sainik School Bijapur houses — canonical display order across the platform. */
export const HOUSES = [
  "Adilshahi",
  "Chalukya",
  "Hoysala",
  "Rashtrakoota",
  "Vijayanagar",
  "Wodeyar",
] as const;

export type HouseName = (typeof HOUSES)[number];

export function sortHousesForDisplay(houses: string[]): string[] {
  return [...houses].sort((a, b) => {
    const ia = HOUSES.indexOf(a as HouseName);
    const ib = HOUSES.indexOf(b as HouseName);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function formatHouses(houses: string[]): string {
  return sortHousesForDisplay(houses).join(", ");
}

export function parseHouses(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
}

export function formatHousesDisplay(value: string | null | undefined): string {
  if (!value) return "";
  return formatHouses(parseHouses(value));
}
