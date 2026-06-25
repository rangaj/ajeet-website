import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  formatGetInvolvedInterestLabels,
  GET_INVOLVED_INTEREST_OPTIONS,
  getInvolvedGeographyLabel,
  getInvolvedInterestLabel,
  getInvolvedTimeLabel,
} from "@/constants/get-involved";
import { formatBatch, formatHousesWithLabel, formatRollNumber } from "@/lib/alumni-display";
import {
  fetchGetInvolvedAdminMembers,
  type GetInvolvedAdminFilter,
  type GetInvolvedAdminMember,
} from "@/lib/data-access";
import { HouseColorDots } from "@/components/house/HouseColorDots";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, Badge, Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const FILTER_TABS: { key: GetInvolvedAdminFilter; label: string }[] = [
  { key: "opted_in", label: "Opted in" },
  { key: "opted_out", label: "Not at this time" },
  { key: "all", label: "All responses" },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function membersToCsv(rows: GetInvolvedAdminMember[]): string {
  const header = [
    "Name",
    "Roll number",
    "Email",
    "Batch",
    "House",
    "Status",
    "Interest areas",
    "Geography",
    "Time commitment",
    "Comments",
    "Last updated",
  ];
  const lines = rows.map((row) =>
    [
      row.name,
      row.roll_number,
      row.email ?? "",
      formatBatch(row.course_end_year) ?? "",
      formatHousesWithLabel(row.house) ?? "",
      row.get_involved_wants_to_participate ? "Opted in" : "Not at this time",
      formatGetInvolvedInterestLabels(row.get_involved_interest_areas),
      getInvolvedGeographyLabel(row.get_involved_geography),
      getInvolvedTimeLabel(row.get_involved_time_commitment),
      row.get_involved_comments ?? "",
      row.get_involved_updated_at ?? "",
    ]
      .map((cell) => csvEscape(String(cell)))
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdminGetInvolvedPage() {
  const [filter, setFilter] = useState<GetInvolvedAdminFilter>("opted_in");
  const [areaFilter, setAreaFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<GetInvolvedAdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void fetchGetInvolvedAdminMembers(filter).then(({ data, error: fetchError }) => {
      if (cancelled) return;
      setLoading(false);
      if (fetchError) {
        setError(fetchError.message);
        setMembers([]);
        return;
      }
      setMembers(data);
    });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (areaFilter && !member.get_involved_interest_areas?.includes(areaFilter)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        member.name,
        member.roll_number,
        member.email,
        formatHousesWithLabel(member.house),
        formatGetInvolvedInterestLabels(member.get_involved_interest_areas),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query, areaFilter]);

  const optedInCount = useMemo(
    () => members.filter((m) => m.get_involved_wants_to_participate).length,
    [members]
  );

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`aaa-get-involved-${filter}-${stamp}.csv`, membersToCsv(filtered));
  };

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">Get Involved</h2>
            <p className="mt-1 text-sm text-slate-600">
              Alumni who have saved Get Involved preferences on their profile.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loading || filtered.length === 0}
            onClick={handleExport}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV ({filtered.length})
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === tab.key
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-surface-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Search"
            placeholder="Name, roll, email, house, or interest…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Filter by interest area</span>
            <select
              className="w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-sm text-slate-900"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="">All areas</option>
              {GET_INVOLVED_INTEREST_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!loading && filter === "all" && (
          <p className="text-sm text-slate-600">
            {optedInCount} opted in · {members.length - optedInCount} not at this time
          </p>
        )}
      </Card>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border bg-white px-4 py-10 text-center text-sm text-slate-500">
          No members match this view.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((member) => (
            <li key={member.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-slate-900">
                        {member.name}
                      </h3>
                      <HouseColorDots houseValue={member.house} size="sm" />
                      <Badge variant={member.get_involved_wants_to_participate ? "success" : "default"}>
                        {member.get_involved_wants_to_participate ? "Opted in" : "Not at this time"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gold-700">
                      {[formatBatch(member.course_end_year), formatRollNumber(member.roll_number), formatHousesWithLabel(member.house)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {member.email && (
                      <p className="text-sm text-slate-600">
                        <a href={`mailto:${member.email}`} className="text-brand-600 hover:text-brand-700">
                          {member.email}
                        </a>
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Updated {formatDate(member.get_involved_updated_at)}</p>
                </div>

                {member.get_involved_wants_to_participate ? (
                  <dl className="mt-4 grid gap-3 border-t border-surface-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Interest areas
                      </dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {(member.get_involved_interest_areas ?? []).map((area) => (
                          <span
                            key={area}
                            className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800"
                          >
                            {getInvolvedInterestLabel(area)}
                          </span>
                        ))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Geography
                      </dt>
                      <dd className="mt-1 text-sm text-slate-800">
                        {getInvolvedGeographyLabel(member.get_involved_geography)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Time commitment
                      </dt>
                      <dd className="mt-1 text-sm text-slate-800">
                        {getInvolvedTimeLabel(member.get_involved_time_commitment)}
                      </dd>
                    </div>
                    {member.get_involved_comments && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Comments
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {member.get_involved_comments}
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="mt-4 border-t border-surface-border pt-4 text-sm text-slate-500">
                    Member chose not to participate at this time. Preferences were last saved on{" "}
                    {formatDate(member.get_involved_updated_at)}.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
