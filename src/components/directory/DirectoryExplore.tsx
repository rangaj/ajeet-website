import { cn } from "@/lib/utils";
import {
  BATCH_PRESETS,
  filtersFromBatch,
  filtersFromHouse,
  filtersFromLocation,
  filtersFromProfession,
  HOUSE_PRESETS,
  LOCATION_PRESETS,
  PROFESSION_PRESETS,
  type DirectoryFilters,
} from "@/constants/directory-browse";

interface DirectoryExploreProps {
  filters: DirectoryFilters;
  onBrowse: (filters: DirectoryFilters) => void;
}

function ExploreChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-surface-border bg-white text-brand-800 hover:border-brand-300 hover:bg-brand-50"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ExploreGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function DirectoryExplore({ filters, onBrowse }: DirectoryExploreProps) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-slate-900">
          Explore
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Browse by shared school identity — batch, house, location, or profession.
        </p>
      </div>

      <ExploreGroup title="Browse by Batch">
        {BATCH_PRESETS.map((preset) => (
          <ExploreChip
            key={preset.label}
            label={preset.label}
            active={
              filters.year_from === String(preset.yearFrom) &&
              filters.year_to === String(preset.yearTo)
            }
            onClick={() => onBrowse(filtersFromBatch(preset))}
          />
        ))}
      </ExploreGroup>

      <ExploreGroup title="Browse by House">
        {HOUSE_PRESETS.map((house) => (
          <ExploreChip
            key={house}
            label={house}
            active={filters.house === house}
            onClick={() => onBrowse(filtersFromHouse(house))}
          />
        ))}
      </ExploreGroup>

      <ExploreGroup title="Browse by Location">
        {LOCATION_PRESETS.map((location) => (
          <ExploreChip
            key={location}
            label={location}
            active={filters.location === location}
            onClick={() => onBrowse(filtersFromLocation(location))}
          />
        ))}
      </ExploreGroup>

      <ExploreGroup title="Browse by Profession">
        {PROFESSION_PRESETS.map((profession) => (
          <ExploreChip
            key={profession}
            label={profession}
            active={filters.industry === profession}
            onClick={() => onBrowse(filtersFromProfession(profession))}
          />
        ))}
      </ExploreGroup>
    </section>
  );
}
