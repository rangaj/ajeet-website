import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { HOUSES } from "@/constants/houses";
import { cn } from "@/lib/utils";
import type { DirectoryFilters } from "@/constants/directory-browse";

interface DirectoryAdvancedFiltersProps {
  filters: DirectoryFilters;
  onChange: (filters: DirectoryFilters) => void;
  /** Render field grid only — for use inside Refine search drawer. */
  embedded?: boolean;
}

export function DirectoryAdvancedFilters({
  filters,
  onChange,
  embedded = false,
}: DirectoryAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const hasValues =
    filters.open_to_mentorship ||
    Object.entries(filters).some(([key, value]) => key !== "open_to_mentorship" && Boolean(value));

  const update = (key: keyof DirectoryFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const fields = (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", embedded && "mt-0")}>
          <Input
            placeholder="Course"
            value={filters.course}
            onChange={(e) => update("course", e.target.value)}
          />
          <Input
            placeholder="Stream"
            value={filters.stream}
            onChange={(e) => update("stream", e.target.value)}
          />
          <Input
            placeholder="From year"
            type="number"
            value={filters.year_from}
            onChange={(e) => update("year_from", e.target.value)}
          />
          <Input
            placeholder="To year"
            type="number"
            value={filters.year_to}
            onChange={(e) => update("year_to", e.target.value)}
          />
          <Input
            placeholder="Location"
            value={filters.location}
            onChange={(e) => update("location", e.target.value)}
          />
          <Input
            placeholder="Company"
            value={filters.company}
            onChange={(e) => update("company", e.target.value)}
          />
          <Input
            placeholder="Industry"
            value={filters.industry}
            onChange={(e) => update("industry", e.target.value)}
          />
          <Input
            placeholder="Skills"
            value={filters.skills}
            onChange={(e) => update("skills", e.target.value)}
          />
          <label className="block">
            <span className="sr-only">House</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              value={filters.house}
              onChange={(e) => update("house", e.target.value)}
            >
              <option value="">All houses</option>
              {HOUSES.map((house) => (
                <option key={house} value={house}>
                  {house}
                </option>
              ))}
        </select>
      </label>
      <label className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
        <input
          type="checkbox"
          className="rounded border-slate-300"
          checked={filters.open_to_mentorship}
          onChange={(e) =>
            onChange({ ...filters, open_to_mentorship: e.target.checked })
          }
        />
        <span className="text-sm text-slate-700">Open to mentorship</span>
      </label>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3 border-t border-surface-border pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Advanced filters
        </h3>
        {fields}
      </div>
    );
  }

  return (
    <div className="border-t border-surface-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-brand-800"
        aria-expanded={open}
      >
        <span>
          Advanced Filters
          {hasValues && !open && (
            <span className="ml-2 text-xs font-normal text-slate-500">(active)</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && <div className="mt-4">{fields}</div>}
    </div>
  );
}
