import { HOUSES } from "@/constants/houses";

export type DirectoryFilters = {
  course: string;
  stream: string;
  year_from: string;
  year_to: string;
  location: string;
  company: string;
  industry: string;
  skills: string;
  house: string;
};

export const EMPTY_DIRECTORY_FILTERS: DirectoryFilters = {
  course: "",
  stream: "",
  year_from: "",
  year_to: "",
  location: "",
  company: "",
  industry: "",
  skills: "",
  house: "",
};

export type BatchPreset = {
  label: string;
  yearFrom: number;
  yearTo: number;
};

export const BATCH_PRESETS: BatchPreset[] = [
  { label: "1963", yearFrom: 1963, yearTo: 1963 },
  { label: "1970", yearFrom: 1970, yearTo: 1979 },
  { label: "1980", yearFrom: 1980, yearTo: 1989 },
  { label: "1990", yearFrom: 1990, yearTo: 1999 },
  { label: "2000", yearFrom: 2000, yearTo: 2009 },
  { label: "2010", yearFrom: 2010, yearTo: 2019 },
];

export const LOCATION_PRESETS = [
  "Bengaluru",
  "Pune",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
] as const;

export const PROFESSION_PRESETS = [
  "Armed Forces",
  "Technology",
  "Healthcare",
  "Entrepreneurship",
  "Public Service",
] as const;

export const HOUSE_PRESETS = [...HOUSES];

export function filtersFromBatch(preset: BatchPreset): DirectoryFilters {
  return {
    ...EMPTY_DIRECTORY_FILTERS,
    year_from: String(preset.yearFrom),
    year_to: String(preset.yearTo),
  };
}

export function filtersFromHouse(house: string): DirectoryFilters {
  return {
    ...EMPTY_DIRECTORY_FILTERS,
    house,
  };
}

export function filtersFromLocation(location: string): DirectoryFilters {
  return {
    ...EMPTY_DIRECTORY_FILTERS,
    location,
  };
}

export function filtersFromProfession(profession: string): DirectoryFilters {
  return {
    ...EMPTY_DIRECTORY_FILTERS,
    industry: profession,
  };
}

export function hasDirectoryFilters(filters: DirectoryFilters): boolean {
  return Object.values(filters).some(Boolean);
}

export function describeActiveBrowse(
  filters: DirectoryFilters
): string | null {
  const batch = BATCH_PRESETS.find(
    (preset) =>
      filters.year_from === String(preset.yearFrom) &&
      filters.year_to === String(preset.yearTo) &&
      !filters.house &&
      !filters.location &&
      !filters.industry
  );
  if (batch) return `Batch ${batch.label}`;

  if (filters.house && !filters.location && !filters.industry && !filters.year_from) {
    return filters.house;
  }

  if (filters.location && !filters.house && !filters.industry && !filters.year_from) {
    return filters.location;
  }

  if (filters.industry && !filters.house && !filters.location && !filters.year_from) {
    return filters.industry;
  }

  return null;
}

export type DiscoveryHint = {
  id: string;
  label: string;
  filters: DirectoryFilters;
  kind: "batch" | "house" | "location";
};

/** Compact quick-start hints shown inside the discovery panel. */
export const DISCOVERY_HINTS: DiscoveryHint[] = [
  {
    id: "batch-2000",
    label: "Batch 2000",
    filters: filtersFromBatch(BATCH_PRESETS[4]),
    kind: "batch",
  },
  {
    id: "batch-1990",
    label: "1990s",
    filters: filtersFromBatch(BATCH_PRESETS[3]),
    kind: "batch",
  },
  {
    id: "house-hoysala",
    label: "Hoysala",
    filters: filtersFromHouse("Hoysala"),
    kind: "house",
  },
  {
    id: "house-adilshahi",
    label: "Adilshahi",
    filters: filtersFromHouse("Adilshahi"),
    kind: "house",
  },
  {
    id: "loc-bengaluru",
    label: "Bengaluru",
    filters: filtersFromLocation("Bengaluru"),
    kind: "location",
  },
  {
    id: "loc-mumbai",
    label: "Mumbai",
    filters: filtersFromLocation("Mumbai"),
    kind: "location",
  },
];

export function filtersMatchHint(
  filters: DirectoryFilters,
  hint: DiscoveryHint
): boolean {
  return Object.entries(hint.filters).every(
    ([key, value]) => filters[key as keyof DirectoryFilters] === value
  );
}

export type ActiveFilterPill = {
  key: keyof DirectoryFilters;
  label: string;
};

/** Removable pills for active directory filters (results mode). */
export function activeFilterPills(filters: DirectoryFilters): ActiveFilterPill[] {
  const pills: ActiveFilterPill[] = [];

  if (filters.house) pills.push({ key: "house", label: filters.house });
  if (filters.location) pills.push({ key: "location", label: filters.location });
  if (filters.industry) pills.push({ key: "industry", label: filters.industry });
  if (filters.company) pills.push({ key: "company", label: filters.company });
  if (filters.skills) pills.push({ key: "skills", label: filters.skills });
  if (filters.course) pills.push({ key: "course", label: filters.course });
  if (filters.stream) pills.push({ key: "stream", label: filters.stream });

  if (filters.year_from || filters.year_to) {
    const from = filters.year_from || "…";
    const to = filters.year_to || "…";
    pills.push({
      key: "year_from",
      label: from === to ? `Batch ${from}` : `${from}–${to}`,
    });
  }

  return pills;
}

export function clearFilterKey(
  filters: DirectoryFilters,
  key: keyof DirectoryFilters
): DirectoryFilters {
  if (key === "year_from" || key === "year_to") {
    return { ...filters, year_from: "", year_to: "" };
  }
  return { ...filters, [key]: "" };
}
