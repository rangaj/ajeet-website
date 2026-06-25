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
import { searchAlumni, listRecentAlumni } from "@/lib/data-access";
import { formatDirectoryResultCount } from "@/lib/profile-display";
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
  const [recent, setRecent] = useState<SearchResult[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
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
        p_open_to_mentorship: filters.open_to_mentorship || null,
        p_page: pageNum,
        p_page_size: PAGE_SIZE,
        p_admin_mode: false,
      });

      if (rpcError) throw rpcError;
      const rows = (data ?? []) as SearchResult[];
      const more = rows.length > 0 && rows[0].has_more === true;
      const total = rows[0]?.total_count != null ? Number(rows[0].total_count) : null;
      setHasMore(more);
      setTotalCount(total);
      setResults(append ? (prev) => [...prev, ...rows] : rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      if (!append) {
        setResults([]);
        setTotalCount(null);
      }
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
      setTotalCount(null);
    }
  }, [debouncedQuery, filters, search]);

  useEffect(() => {
    const active = shouldSearch(debouncedQuery, filters);
    if (active) return;
    setRecentLoading(true);
    void listRecentAlumni(10).then(({ data, error: recentError }) => {
      setRecentLoading(false);
      if (!recentError && data) setRecent((data as SearchResult[]) ?? []);
    });
  }, [debouncedQuery, filters]);

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
          Alumni Directory
        </h1>
        <p className="text-sm text-slate-600 sm:text-base">
          Search and discover verified members of the Ajeet community. Use the filters below to find
          batchmates, fellow alumni, professionals, and Ajeets across locations, industries, and
          generations.
        </p>
      </header>

      <DirectoryDiscoveryPanel
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onBrowse={handleBrowse}
        onFiltersChange={setFilters}
        resultsMode={showResults}
      />

      {!showResults && (
        <section className="space-y-3">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900">Recently joined</h2>
            <p className="text-sm text-slate-600">
              Welcome fellow Ajeets who&apos;ve recently connected on the network.
            </p>
          </div>
          {recentLoading && (
            <p className="text-sm text-slate-500">Loading recent members…</p>
          )}
          {!recentLoading && recent.length === 0 && (
            <p className="text-sm text-slate-500">No recent members to show yet.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.map((member) => (
              <DirectoryMemberCard
                key={member.id}
                member={member}
                compact
                onClick={() => setSelected(member)}
              />
            ))}
          </div>
        </section>
      )}

      {showResults && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {activeBrowse ? `Ajeets — ${activeBrowse}` : debouncedQuery ? "Search results" : "Results"}
              </h2>
              {!loading && results.length > 0 && (
                <p className="mt-0.5 text-sm text-slate-600">
                  {formatDirectoryResultCount(results.length, totalCount)}
                </p>
              )}
            </div>
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
            <div className="rounded-xl border border-surface-border bg-white p-5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                No matching results
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                No Ajeets were found matching your current search criteria.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-700">Try:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                <li>Removing some filters</li>
                <li>Searching by roll number</li>
                <li>Searching by batch year</li>
                <li>Searching by surname</li>
                <li>Using broader search terms</li>
              </ul>
            </div>
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
