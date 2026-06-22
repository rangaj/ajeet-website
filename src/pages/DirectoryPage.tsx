import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, Badge } from "@/components/ui/Card";
import type { SearchResult } from "@/types/database";

const PAGE_SIZE = 24;

export function DirectoryPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({
    course: "",
    stream: "",
    year_from: "",
    year_to: "",
    location: "",
    company: "",
    industry: "",
    skills: "",
    house: "",
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const search = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("search_alumni", {
        p_query: debouncedQuery || null,
        p_course: filters.course || null,
        p_stream: filters.stream || null,
        p_year_from: filters.year_from ? Number(filters.year_from) : null,
        p_year_to: filters.year_to ? Number(filters.year_to) : null,
        p_location: filters.location || null,
        p_company: filters.company || null,
        p_industry: filters.industry || null,
        p_skills: filters.skills || null,
        p_house: filters.house || null,
        p_page: pageNum,
        p_page_size: PAGE_SIZE,
        p_admin_mode: false,
      });

      if (rpcError) throw rpcError;
      const rows = (data ?? []) as SearchResult[];
      const more = rows.length > 0 && rows[0].has_more === true;
      setHasMore(more);
      setResults(append ? (prev) => [...prev, ...rows] : rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      if (!append) setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters]);

  useEffect(() => {
    setPage(1);
    if (debouncedQuery.length >= 2 || Object.values(filters).some(Boolean)) {
      search(1, false);
    } else {
      setResults([]);
      setHasMore(false);
    }
  }, [debouncedQuery, filters, search]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    search(next, true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Alumni Directory</h1>
        <p className="text-sm text-slate-600">Search approved alumni. Sensitive fields are hidden by default.</p>
      </div>

      <Card className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            placeholder="Search name, roll number, company, skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Course" value={filters.course} onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))} />
          <Input placeholder="Stream" value={filters.stream} onChange={(e) => setFilters((f) => ({ ...f, stream: e.target.value }))} />
          <Input placeholder="From year" type="number" value={filters.year_from} onChange={(e) => setFilters((f) => ({ ...f, year_from: e.target.value }))} />
          <Input placeholder="To year" type="number" value={filters.year_to} onChange={(e) => setFilters((f) => ({ ...f, year_to: e.target.value }))} />
          <Input placeholder="Location" value={filters.location} onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))} />
          <Input placeholder="Company" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
          <Input placeholder="Industry" value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))} />
          <Input placeholder="House" value={filters.house} onChange={(e) => setFilters((f) => ({ ...f, house: e.target.value }))} />
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && results.length === 0 && <p className="text-slate-500">Searching...</p>}
      {!loading && results.length === 0 && (debouncedQuery.length >= 2 || Object.values(filters).some(Boolean)) && (
        <p className="text-slate-500">No alumni found.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelected(m)}
            className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-200 hover:shadow"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold">
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 truncate">{m.name}</p>
                <p className="text-xs text-slate-500">{m.roll_number}</p>
                <p className="mt-1 text-sm text-slate-600 truncate">
                  {[m.course, m.stream, m.course_end_year].filter(Boolean).join(" · ")}
                </p>
                {m.company && <p className="text-sm text-slate-500 truncate">{m.company}</p>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setSelected(null)}>
          <Card className="max-h-[80vh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.roll_number}</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setSelected(null)}>✕</button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              {selected.course && <div><dt className="text-slate-500">Course</dt><dd>{selected.course} {selected.stream} ({selected.course_end_year})</dd></div>}
              {selected.company && <div><dt className="text-slate-500">Company</dt><dd>{selected.company} — {selected.job_position}</dd></div>}
              {selected.current_location && <div><dt className="text-slate-500">Location</dt><dd>{selected.current_location}</dd></div>}
              {selected.professional_skills && <div><dt className="text-slate-500">Skills</dt><dd>{selected.professional_skills}</dd></div>}
              {selected.house && <div><dt className="text-slate-500">House</dt><dd><Badge>{selected.house}</Badge></dd></div>}
              {selected.email && <div><dt className="text-slate-500">Email</dt><dd>{selected.email}</dd></div>}
              {selected.linkedin_link && <div><dt className="text-slate-500">LinkedIn</dt><dd><a href={selected.linkedin_link} className="text-brand-600" target="_blank" rel="noreferrer">Profile</a></dd></div>}
            </dl>
          </Card>
        </div>
      )}
    </div>
  );
}
