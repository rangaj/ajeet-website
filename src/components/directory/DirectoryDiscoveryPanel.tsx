import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DirectoryAdvancedFilters } from "@/components/directory/DirectoryAdvancedFilters";
import { DirectoryExplore } from "@/components/directory/DirectoryExplore";
import {
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
  compact?: boolean;
}

function HintChip({
  label,
  active,
  onClick,
  accentColor,
  muted = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accentColor?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-colors",
        muted ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs sm:text-sm",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : muted
            ? "border-surface-border/80 bg-white/80 text-slate-500 hover:border-brand-200 hover:bg-brand-50/80 hover:text-slate-700"
            : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
      )}
      style={
        !active && accentColor
          ? muted
            ? { borderColor: `${accentColor}33`, backgroundColor: `${accentColor}08` }
            : { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}10` }
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

export function DirectoryDiscoveryPanel({
  query,
  onQueryChange,
  filters,
  onBrowse,
  onFiltersChange,
  compact = false,
}: DirectoryDiscoveryPanelProps) {
  const [refineOpen, setRefineOpen] = useState(false);
  const filtersActive = hasDirectoryFilters(filters);

  return (
    <Card className={cn("space-y-0", compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3.5 text-slate-400",
            compact ? "top-2.5 h-3.5 w-3.5" : "top-3 h-4 w-4"
          )}
          aria-hidden
        />
        <input
          className={cn(
            "w-full rounded-xl border border-surface-border bg-warm-white pl-10 pr-4 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
            compact ? "py-2 text-sm" : "py-2.5 text-sm sm:text-base"
          )}
          placeholder="Search Ajeets — name, roll number, batch, house, company…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search Ajeets"
        />
      </div>

      <div className={cn(compact ? "mt-2.5 space-y-1.5" : "mt-3 space-y-2")}>
        {!compact && (
          <p className="text-xs text-slate-500">
            Try a batch, house, or city — or type a name, roll number, or abbreviation like{" "}
            <span className="font-medium text-slate-600">HOY</span> or{" "}
            <span className="font-medium text-slate-600">ADL</span>.
          </p>
        )}
        {compact && (
          <p className="text-[11px] text-slate-400">Quick browse</p>
        )}
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {DISCOVERY_HINTS.map((hint) => (
            <HintChip
              key={hint.id}
              label={hint.label}
              active={filtersMatchHint(filters, hint)}
              muted={compact}
              accentColor={
                hint.kind === "house" ? getHouseColor(hint.filters.house) : undefined
              }
              onClick={() => onBrowse(hint.filters)}
            />
          ))}
        </div>
      </div>

      <div className={cn("border-t border-surface-border", compact ? "mt-3 pt-2.5" : "mt-4 pt-3")}>
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
          <div className="mt-4 space-y-5 border-t border-surface-border pt-4">
            <DirectoryExplore embedded filters={filters} onBrowse={onBrowse} />
            <DirectoryAdvancedFilters embedded filters={filters} onChange={onFiltersChange} />
          </div>
        )}
      </div>
    </Card>
  );
}
