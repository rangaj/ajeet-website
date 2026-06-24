import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { DirectoryDiscoveryPanel } from "@/components/directory/DirectoryDiscoveryPanel";
import { DirectoryMemberCard } from "@/components/directory/DirectoryMemberCard";
import { DirectoryMemberDetail } from "@/components/directory/DirectoryMemberDetail";
import {
  describeActiveBrowse,
  EMPTY_DIRECTORY_FILTERS,
  hasDirectoryFilters,
  type DirectoryFilters,
} from "@/constants/directory-browse";
import { useAuth } from "@/hooks/useAuth";
import { adminMayViewDirectory } from "@/lib/admin-navigation";
import { searchAlumni } from "@/lib/data-access";
import type { SearchResult } from "@/types/database";

const PAGE_SIZE = 24;

function shouldSearch(query: string, filters: DirectoryFilters): boolean {
  return query.length >= 2 || hasDirectoryFilters(filters);
}

export function DirectoryPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<DirectoryFilters>(EMPTY_DIRECTORY_FILTERS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    if (!adminMayViewDirectory()) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const search = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcError } = await searchAlumni({
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
    if (shouldSearch(debouncedQuery, filters)) {
      search(1, false);
    } else {
      setResults([]);
      setHasMore(false);
    }
  }, [debouncedQuery, filters, search]);

  const handleBrowse = (nextFilters: DirectoryFilters) => {
    setQuery("");
    setFilters(nextFilters);
  };

  const clearFilters = () => {
    setFilters(EMPTY_DIRECTORY_FILTERS);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    search(next, true);
  };

  const activeBrowse = describeActiveBrowse(filters);
  const showResults = shouldSearch(debouncedQuery, filters);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Discover Ajeets
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Reconnect with batchmates, housemates, and fellow alumni.
        </p>
      </header>

      <DirectoryDiscoveryPanel
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onBrowse={handleBrowse}
        onFiltersChange={setFilters}
        compact={showResults}
      />

      {showResults && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {activeBrowse ? `Ajeets — ${activeBrowse}` : debouncedQuery ? "Search results" : "Results"}
            </h2>
            {hasDirectoryFilters(filters) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-brand-600 hover:text-brand-700"
              >
                Clear filters
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && results.length === 0 && (
            <p className="text-sm text-slate-500">Finding Ajeets…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="text-sm text-slate-500">
              No Ajeets match your search. Try another hint or browse option above.
            </p>
          )}

          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((member) => (
              <DirectoryMemberCard
                key={member.id}
                member={member}
                onClick={() => setSelected(member)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="pt-2 text-center">
              <Button variant="secondary" onClick={loadMore} disabled={loading}>
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </section>
      )}

      {selected && (
        <DirectoryMemberDetail member={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
