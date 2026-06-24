import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DirectoryAdvancedFilters } from "@/components/directory/DirectoryAdvancedFilters";
import { DirectoryExplore } from "@/components/directory/DirectoryExplore";
import {
  DISCOVERY_HINTS,
  filtersMatchHint,
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
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors sm:text-sm",
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

export function DirectoryDiscoveryPanel({
  query,
  onQueryChange,
  filters,
  onBrowse,
  onFiltersChange,
  compact = false,
}: DirectoryDiscoveryPanelProps) {
  const [moreBrowseOpen, setMoreBrowseOpen] = useState(false);

  return (
    <Card className="space-y-0 p-4 sm:p-5">
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" aria-hidden />
        <input
          className="w-full rounded-xl border border-surface-border bg-warm-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:text-base"
          placeholder="Search Ajeets — name, roll number, batch, house, company…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search Ajeets"
        />
      </div>

      {!compact && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-500">
            Try a batch, house, or city — or type a name, roll number, or abbreviation like{" "}
            <span className="font-medium text-slate-600">HOY</span> or{" "}
            <span className="font-medium text-slate-600">ADL</span>.
          </p>
          <div className="flex flex-wrap gap-2">
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
      )}

      <div className={cn("border-t border-surface-border", compact ? "mt-3 pt-3" : "mt-4 pt-3")}>
        <button
          type="button"
          onClick={() => setMoreBrowseOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-brand-800"
          aria-expanded={moreBrowseOpen}
        >
          <span>More browse options</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-500 transition-transform",
              moreBrowseOpen && "rotate-180"
            )}
          />
        </button>

        {moreBrowseOpen && (
          <div className="mt-4 border-t border-surface-border pt-4">
            <DirectoryExplore embedded filters={filters} onBrowse={onBrowse} />
          </div>
        )}

        <DirectoryAdvancedFilters filters={filters} onChange={onFiltersChange} />
      </div>
    </Card>
  );
}
