import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { DirectoryAdvancedFilters } from "@/components/directory/DirectoryAdvancedFilters";
import { DirectoryExplore } from "@/components/directory/DirectoryExplore";
import {
  activeFilterPills,
  clearFilterKey,
  DISCOVERY_HINTS,
  filtersMatchHint,
  hasDirectoryFilters,
  type DirectoryFilters,
} from "@/constants/directory-browse";
import { getHouseColor } from "@/constants/houses";
import { cn } from "@/lib/utils";

interface DirectoryDiscoveryPanelProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: DirectoryFilters;
  onBrowse: (filters: DirectoryFilters) => void;
  onFiltersChange: (filters: DirectoryFilters) => void;
  /** Results visible — slim strip only. */
  resultsMode?: boolean;
}

function HintChip({
  label,
  active,
  onClick,
  accentColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
      )}
      style={
        !active && accentColor
          ? { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}10` }
          : active && accentColor
            ? { backgroundColor: accentColor, borderColor: accentColor }
            : undefined
      }
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-brand-100"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function DirectoryDiscoveryPanel({
  query,
  onQueryChange,
  filters,
  onBrowse,
  onFiltersChange,
  resultsMode = false,
}: DirectoryDiscoveryPanelProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const filtersActive = hasDirectoryFilters(filters);
  const pills = activeFilterPills(filters);

  const searchInput = (
    <div className="relative flex-1">
      <Search
        className={cn(
          "absolute left-3 text-slate-400",
          resultsMode ? "top-2.5 h-3.5 w-3.5" : "top-3 h-4 w-4"
        )}
        aria-hidden
      />
      <input
        className={cn(
          "w-full rounded-xl border border-surface-border bg-warm-white pl-9 pr-4 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
          resultsMode ? "py-2 text-sm" : "py-2.5 text-sm sm:text-base"
        )}
        placeholder="Search Ajeets — name, roll, batch, house, company…"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        aria-label="Search Ajeets"
      />
    </div>
  );

  if (resultsMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {searchInput}
          <button
            type="button"
            onClick={() => setRefineOpen((open) => !open)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              refineOpen || filtersActive
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-surface-border bg-white text-slate-600 hover:bg-brand-50"
            )}
            aria-expanded={refineOpen}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Refine</span>
          </button>
        </div>

        {pills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pills.map((pill) => (
              <FilterPill
                key={`${pill.key}-${pill.label}`}
                label={pill.label}
                onRemove={() => onFiltersChange(clearFilterKey(filters, pill.key))}
              />
            ))}
          </div>
        )}

        {refineOpen && (
          <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
            <DirectoryExplore embedded filters={filters} onBrowse={onBrowse} />
            <DirectoryAdvancedFilters embedded filters={filters} onChange={onFiltersChange} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-surface-border bg-white p-3 sm:p-4">{searchInput}</div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Quick browse</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {DISCOVERY_HINTS.map((hint) => (
            <HintChip
              key={hint.id}
              label={hint.label}
              active={filtersMatchHint(filters, hint)}
              accentColor={
                hint.kind === "house" ? getHouseColor(hint.filters.house) : undefined
              }
              onClick={() => onBrowse(hint.filters)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-white px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => setRefineOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-brand-800"
          aria-expanded={refineOpen}
        >
          <span>
            Refine search
            {filtersActive && !refineOpen && (
              <span className="ml-2 text-xs font-normal text-slate-500">(filters active)</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-500 transition-transform",
              refineOpen && "rotate-180"
            )}
          />
        </button>

        {refineOpen && (
          <div className="mt-3 space-y-5 border-t border-surface-border pt-4">
            <DirectoryExplore embedded filters={filters} onBrowse={onBrowse} />
            <DirectoryAdvancedFilters embedded filters={filters} onChange={onFiltersChange} />
          </div>
        )}
      </div>
    </div>
  );
}
