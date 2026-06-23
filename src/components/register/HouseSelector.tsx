import { HOUSES } from "@/constants/houses";
import { cn } from "@/lib/utils";

interface HouseSelectorProps {
  value: string[];
  onChange: (houses: string[]) => void;
  error?: string;
}

export function HouseSelector({ value, onChange, error }: HouseSelectorProps) {
  const toggle = (house: string) => {
    if (value.includes(house)) {
      onChange(value.filter((h) => h !== house));
    } else {
      onChange([...value, house]);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-brand-800">
          House(s) <span className="text-red-600">*</span>
        </p>
        <p className="mt-0.5 text-xs text-brand-600">
          Select every house you were part of during your time at SSBJ.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {HOUSES.map((house) => {
          const selected = value.includes(house);
          return (
            <button
              key={house}
              type="button"
              onClick={() => toggle(house)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-surface-border bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50"
              )}
              aria-pressed={selected}
            >
              {house}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-slate-500">Selected: {value.join(", ")}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
