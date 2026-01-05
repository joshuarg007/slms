// src/pages/LeadsPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { SkeletonTable } from "@/components/Skeleton";
import ExportCsvButton from "@/components/ExportCsvButton";

type Lead = {
  id: number | string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  notes?: string | null;
  created_at?: string | null;
  crm_source?: string | null;  // "local", "hubspot", etc.
  is_crm_only?: boolean;       // true if only exists in CRM
};

type Duplicate = {
  email: string;
  crm: string;
  recommendation: string;
};

type ApiResult = {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
  sort: string;
  dir: "asc" | "desc";
  q: string;
  crm_synced?: string | null;    // Which CRM was synced
  crm_error?: string | null;     // Error fetching from CRM
  duplicates?: Duplicate[] | null;
};

const DEFAULT_SORT = "created_at" as const;
const DEFAULT_DIR = "desc" as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;

const LeadsPage: React.FC = () => {
  useDocumentTitle("Leads");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [dir, setDir] = useState<"asc" | "desc">(DEFAULT_DIR);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullName = (l: Lead) =>
    (l.name ||
      [l.first_name, l.last_name].filter(Boolean).join(" ").trim() ||
      "").trim();

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const json = await api.getLeads({
        q: q.trim(),
        sort,
        dir,
        page,
        page_size: pageSize,
      });
      setData(json as unknown as ApiResult);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load leads";
      if (/401|unauth/i.test(msg)) setErr("Not authenticated. Please sign in again.");
      else setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchData, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, dir, page, pageSize]);

  useEffect(() => setPage(1), [q, sort, dir]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const setSortKey = (key: string) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  };

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <button
      onClick={() => setSortKey(sortKey)}
      className="group flex items-center gap-1.5 text-left font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      title={`Sort by ${label}`}
      type="button"
    >
      {label}
      <span className={`transition-opacity ${sort === sortKey ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
        {sort === sortKey ? (
          dir === "asc" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        )}
      </span>
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and search through all your captured leads
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loading ? (
            <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400" role="status">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" aria-hidden="true" />
              <span className="sr-only">Loading lead count...</span>
            </span>
          ) : (
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              {total.toLocaleString()} {total === 1 ? "lead" : "leads"}
            </span>
          )}
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, company, source..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">Show:</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} rows
              </option>
            ))}
          </select>

          {/* Export CSV */}
          {items.length > 0 && (
            <ExportCsvButton
              rows={items.map(lead => ({
                Name: fullName(lead) || "",
                Email: lead.email || "",
                Phone: lead.phone || "",
                Company: lead.company || "",
                Source: lead.source || "",
                "CRM Source": lead.crm_source || "",
                Notes: lead.notes || "",
                "Created At": lead.created_at || "",
              }))}
              filename={`leads-export-${new Date().toISOString().split("T")[0]}.csv`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            />
          )}
        </div>
      </div>


      {/* CRM Sync Status */}
      {data?.crm_synced && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Synced with {data.crm_synced.charAt(0).toUpperCase() + data.crm_synced.slice(1)}
        </div>
      )}

      {/* CRM Error Warning */}
      {data?.crm_error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {data.crm_error}
        </div>
      )}

      {/* Duplicates Warning */}
      {data?.duplicates && data.duplicates.length > 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {data.duplicates.length} duplicate{data.duplicates.length > 1 ? 's' : ''} found
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                These leads exist in both Site2CRM and your CRM. Consider deduping in your CRM (we never delete from CRM, only add).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {err}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Name" sortKey="name" />
                </th>
                <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Email" sortKey="email" />
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Phone" sortKey="phone" />
                </th>
                <th className="hidden md:table-cell px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Company" sortKey="company" />
                </th>
                <th className="px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Source" sortKey="source" />
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Created" sortKey="created_at" />
                </th>
                <th className="hidden xl:table-cell px-3 sm:px-5 py-3 sm:py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortHeader label="Notes" sortKey="notes" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <div role="status" aria-label="Loading leads">
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="px-5 py-4 flex gap-4 items-center animate-pulse">
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
                            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded hidden sm:block" />
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded hidden md:block" />
                            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded hidden lg:block" />
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded hidden xl:block" />
                          </div>
                        ))}
                      </div>
                      <span className="sr-only">Loading leads data...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center" colSpan={7}>
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-gray-500 dark:text-gray-400">No leads found</span>
                      {q && <span className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search</span>}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <span className="font-medium text-gray-900 dark:text-white truncate block">
                        {fullName(l) || <span className="text-gray-400">—</span>}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4 text-gray-600 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">{l.email || "—"}</td>
                    <td className="hidden sm:table-cell px-3 sm:px-5 py-3 sm:py-4 text-gray-600 dark:text-gray-300">{formatPhone(l.phone)}</td>
                    <td className="hidden md:table-cell px-3 sm:px-5 py-3 sm:py-4 text-gray-600 dark:text-gray-300">{l.company || "—"}</td>
                    <td className="px-3 sm:px-5 py-3 sm:py-4">
                      <div className="flex flex-col gap-1">
                        {/* Original source (e.g., website, campaign) */}
                        {l.source && l.source !== l.crm_source && (
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                            {l.source}
                          </span>
                        )}
                        {/* CRM source badge */}
                        {l.crm_source && (
                          <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            l.is_crm_only
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                              : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          }`}>
                            {l.is_crm_only ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {l.crm_source === "local" ? "Site2CRM" : l.crm_source}
                          </span>
                        )}
                        {/* Fallback if no source */}
                        {!l.source && !l.crm_source && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-3 sm:px-5 py-3 sm:py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {l.created_at ? formatDate(l.created_at) : "—"}
                    </td>
                    <td className="hidden xl:table-cell px-3 sm:px-5 py-3 sm:py-4 text-gray-600 dark:text-gray-300 max-w-[10rem] sm:max-w-xs truncate">
                      {l.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
            Page <span className="font-medium text-gray-900 dark:text-white">{data?.page ?? 1}</span> of{" "}
            <span className="font-medium text-gray-900 dark:text-white">{totalPages}</span>
          </div>
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data?.has_prev || loading}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.has_next || loading}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              type="button"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatPhone(p?: string | null) {
  if (!p) return "—";
  const digits = String(p).replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

export default LeadsPage;
