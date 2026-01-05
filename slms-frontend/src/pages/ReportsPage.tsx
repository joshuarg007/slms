// src/pages/ReportsPage.tsx
import { useEffect, useState, useMemo } from "react";
import { getDashboardMetrics } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getApiBase } from "@/utils/api";
import StatsCards, { Row as SalesRow } from "@/components/StatsCards";
import ExportCsvButton from "@/components/ExportCsvButton";
import { AnimatedBarChart, CHART_COLORS } from "@/components/charts";

type Tab = "leads" | "salespeople";

type LeadsMetrics = {
  total: number;
  by_source: Record<string, number>;
};

type SalespeopleResponse = {
  days: number;
  results: SalesRow[];
};

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    const tok =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {
    // ignore localStorage errors
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

export default function ReportsPage() {
  useDocumentTitle("Reports");
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const [leadsMetrics, setLeadsMetrics] = useState<LeadsMetrics | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [salesDays, setSalesDays] = useState(7);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesWarning, setSalesWarning] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
    loadSalespeople(7);
  }, []);

  async function loadLeads() {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const data = await getDashboardMetrics();
      setLeadsMetrics({
        total: data.total,
        by_source: data.by_source || {},
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not load lead metrics.";
      setLeadsError(message);
    } finally {
      setLeadsLoading(false);
    }
  }

  async function loadSalespeople(days: number) {
    setSalesLoading(true);
    setSalesError(null);
    setSalesWarning(null);
    try {
      const base = getApiBase();
      const res = await authFetch(`${base}/salespeople/stats?days=${days}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Salespeople stats failed: ${res.status} ${res.statusText} – ${text}`);
      }
      const json = (await res.json()) as SalespeopleResponse;

      const warningRow = json.results.find(
        (r: SalesRow & { warning?: string }) => typeof r.warning === "string"
      ) as SalesRow & { warning?: string } | undefined;

      if (warningRow && warningRow.warning) {
        setSalesWarning(warningRow.warning);
        setSalesRows([]);
      } else {
        setSalesRows(json.results || []);
      }

      setSalesDays(json.days);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not load salesperson stats.";
      setSalesError(message);
    } finally {
      setSalesLoading(false);
    }
  }

  const leadsSources = leadsMetrics?.by_source || {};
  const leadsSourceEntries = Object.entries(leadsSources).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
  );

  // Export data helpers
  const leadsExportData = useMemo(() => {
    return leadsSourceEntries.map(([source, count]) => ({
      source: source || "unknown",
      leads: count,
      percentage: leadsMetrics?.total ? Math.round((count / leadsMetrics.total) * 100) : 0,
    }));
  }, [leadsSourceEntries, leadsMetrics]);

  const salesExportData = useMemo(() => {
    return salesRows.map((r) => ({
      name: r.owner_name || r.owner_email || r.owner_id || "Unknown",
      email: r.owner_email || "",
      emails: r.emails_last_n_days,
      calls: r.calls_last_n_days,
      meetings: r.meetings_last_n_days,
      new_deals: r.new_deals_last_n_days,
    }));
  }, [salesRows]);

  // Chart data for leads by source
  const sourceChartData = useMemo(() => {
    return leadsSourceEntries.slice(0, 8).map(([source, count]) => ({
      name: source || "Unknown",
      value: count,
    }));
  }, [leadsSourceEntries]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze lead performance and salesperson activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Switcher */}
          <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("leads")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === "leads"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Lead Reports
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("salespeople")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === "salespeople"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Salespeople
            </button>
          </div>

          {/* Export Button */}
          <ExportCsvButton
            rows={activeTab === "leads" ? leadsExportData : salesExportData}
            filename={`${activeTab}-report-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
      </header>

      {/* Report Summary */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Executive Summary</h3>
              <p className="text-white/80 text-sm">Key insights from your data</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">Updated just now</span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm">Lead Quality Trend</p>
            <p className="text-xl font-bold mt-1">Improving +12%</p>
            <p className="text-white/60 text-xs mt-1">Higher engagement scores this quarter</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm">Revenue Forecast</p>
            <p className="text-xl font-bold mt-1">$847K (Q4)</p>
            <p className="text-white/60 text-xs mt-1">Based on current pipeline</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm">Key Insight</p>
            <p className="text-xl font-bold mt-1">LinkedIn ROI 3.2x</p>
            <p className="text-white/60 text-xs mt-1">Best performing channel this month</p>
          </div>
        </div>
      </div>

      {/* Leads Tab */}
      {activeTab === "leads" && (
        <div className="space-y-6">

          {/* Error */}
          {leadsError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {leadsError}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="text-sm font-medium text-white/80 mb-1">Total Leads</div>
                <div className="text-3xl font-bold">
                  {leadsLoading ? "—" : leadsMetrics?.total.toLocaleString() ?? "0"}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Top Source</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {leadsSourceEntries.length
                  ? `${leadsSourceEntries[0][0]} (${leadsSourceEntries[0][1]})`
                  : "No data yet"}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Active Sources</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {leadsSourceEntries.length}
              </div>
            </div>
          </div>

          {/* Source Chart Visualization */}
          {sourceChartData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Sources Chart</h3>
                </div>
              </div>
              <div className="p-6">
                <AnimatedBarChart
                  data={sourceChartData}
                  height={280}
                  horizontal
                  colors={CHART_COLORS.gradient}
                  barRadius={6}
                />
              </div>
            </div>
          )}

          {/* Source Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads by Source</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sorted by volume</p>
              </div>
              <button
                type="button"
                onClick={loadLeads}
                disabled={leadsLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {leadsLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Refreshing
                  </>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            <div className="p-6">
              {leadsSourceEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No lead activity yet. Start capturing leads to see breakdown by source.
                </div>
              ) : (
                <div className="space-y-4">
                  {leadsSourceEntries.map(([source, count]) => {
                    const total = leadsMetrics?.total || 0;
                    const pct = total > 0 ? Math.round(((count ?? 0) / total) * 100) : 0;
                    return (
                      <div key={source} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {source || "unknown"}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {count.toLocaleString()} leads ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salespeople Tab */}
      {activeTab === "salespeople" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Salesperson Performance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Activity metrics from your connected CRM
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={salesDays}
                onChange={(e) => {
                  const d = Number(e.target.value) || 7;
                  setSalesDays(d);
                  loadSalespeople(d);
                }}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <button
                type="button"
                onClick={() => loadSalespeople(salesDays)}
                disabled={salesLoading}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {salesLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Warning */}
          {salesWarning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-sm">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-medium text-amber-800 dark:text-amber-200">Limited CRM access</div>
                <p className="mt-1 text-amber-700 dark:text-amber-300">{salesWarning}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {salesError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {salesError}
            </div>
          )}

          {/* Stats */}
          {!salesWarning && !salesError && (
            <>
              <StatsCards rows={salesRows} days={salesDays} />

              {/* Table */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Salesperson
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Emails
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Calls
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Meetings
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          New Deals
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {salesRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No salesperson activity found for this period.
                          </td>
                        </tr>
                      ) : (
                        salesRows.map((r) => (
                          <tr key={r.owner_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    {(r.owner_name || r.owner_email || "?").charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {r.owner_name || r.owner_email || r.owner_id || "Unknown"}
                                  </div>
                                  {r.owner_email && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{r.owner_email}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                              {r.emails_last_n_days.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                              {r.calls_last_n_days.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                              {r.meetings_last_n_days.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white tabular-nums">
                              {r.new_deals_last_n_days.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
