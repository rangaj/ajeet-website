/** Sainik School Bijapur houses — canonical display order across the platform. */
export const HOUSE_DEFINITIONS = [
  {
    canonical: "Adilshahi",
    color: "#16A34A",
    abbrev: "ADL",
    aliases: ["Adil Shahi", "AdilShahi", "Adilshahi House", "ADI"],
  },
  {
    canonical: "Chalukya",
    color: "#991B1B",
    abbrev: "CHA",
    aliases: ["Chalukya House", "CHL", "CHU"],
  },
  {
    canonical: "Hoysala",
    color: "#1E3A8A",
    abbrev: "HOY",
    aliases: ["Hoysala House", "Hoy"],
  },
  {
    canonical: "Rashtrakoota",
    color: "#2563EB",
    abbrev: "RAS",
    aliases: ["Rashtrakuta", "Rashtrakoota House", "Rashtra"],
  },
  {
    canonical: "Vijayanagar",
    color: "#DC2626",
    abbrev: "VIJ",
    aliases: ["Vijaynagar", "Vijayanagar House", "Vijay"],
  },
  {
    canonical: "Wodeyar",
    color: "#EAB308",
    abbrev: "WOD",
    aliases: ["Wodeyar House", "Wod"],
  },
  {
    canonical: "Rani Channamma",
    color: "#BF712B",
    abbrev: "RAN",
    aliases: [
      "Rani Chenamma",
      "Rani Channamma House",
      "Rani Chenamma House",
      "Chenamma",
      "Channamma",
      "RCM",
    ],
  },
] as const;

export const HOUSES = HOUSE_DEFINITIONS.map((d) => d.canonical) as readonly [
  "Adilshahi",
  "Chalukya",
  "Hoysala",
  "Rashtrakoota",
  "Vijayanagar",
  "Wodeyar",
  "Rani Channamma",
];

export type HouseName = (typeof HOUSES)[number];

const HOUSE_BY_CANONICAL = new Map(
  HOUSE_DEFINITIONS.map((d) => [d.canonical, d] as const)
);

const ALIAS_LOOKUP = new Map<string, HouseName>();
for (const def of HOUSE_DEFINITIONS) {
  ALIAS_LOOKUP.set(def.canonical.toLowerCase(), def.canonical);
  ALIAS_LOOKUP.set(def.abbrev.toLowerCase(), def.canonical);
  ALIAS_LOOKUP.set(def.canonical.slice(0, 3).toLowerCase(), def.canonical);
  for (const alias of def.aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase(), def.canonical);
  }
}

function tokenizeHouseField(value: string): string[] {
  return value
    .split(/[,|]/)
    .flatMap((part) => part.split(/\s*-\s*/))
    .map((part) => part.replace(/\s+house$/i, "").trim())
    .filter(Boolean);
}

export function resolveHouseToken(token: string): HouseName | null {
  const cleaned = token.replace(/\s+house$/i, "").trim();
  if (!cleaned) return null;

  const direct = ALIAS_LOOKUP.get(cleaned.toLowerCase());
  if (direct) return direct;

  if (cleaned.length >= 3) {
    for (const def of HOUSE_DEFINITIONS) {
      if (def.canonical.toLowerCase().startsWith(cleaned.toLowerCase())) {
        return def.canonical;
      }
      if (cleaned.toLowerCase().includes(def.canonical.toLowerCase())) {
        return def.canonical;
      }
      for (const alias of def.aliases) {
        if (alias.toLowerCase().startsWith(cleaned.toLowerCase())) {
          return def.canonical;
        }
      }
    }
  }

  return null;
}

export function resolveHousesFromValue(value: string | null | undefined): HouseName[] {
  if (!value?.trim()) return [];
  const resolved = tokenizeHouseField(value)
    .map(resolveHouseToken)
    .filter((house): house is HouseName => house !== null);
  return sortHousesForDisplay([...new Set(resolved)]) as HouseName[];
}

export function normalizeHousesString(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const houses = resolveHousesFromValue(value);
  return houses.length > 0 ? formatHouses(houses) : value.trim();
}

export function getHouseColor(house: string): string | undefined {
  const resolved = resolveHouseToken(house) ?? (house as HouseName);
  return HOUSE_BY_CANONICAL.get(resolved as HouseName)?.color;
}

export function getHouseAbbrev(house: HouseName): string {
  return HOUSE_BY_CANONICAL.get(house)?.abbrev ?? house.slice(0, 3).toUpperCase();
}

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

export function parseHouses(value: string | null | undefined): HouseName[] {
  return resolveHousesFromValue(value);
}

export function formatHousesDisplay(value: string | null | undefined): string {
  if (!value) return "";
  return formatHouses(parseHouses(value));
}

export function matchHouseQuery(query: string): HouseName | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  return resolveHouseToken(trimmed);
}
