// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { api, type DashboardMetrics, type UTMBreakdown } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import ViewModeSelector, { ViewModeInsight } from "@/components/ViewModeSelector";
import { RotatingWisdom } from "@/components/WisdomTooltip";
import { SkeletonDashboard } from "@/components/Skeleton";
import { StatTooltip, InfoTooltip } from "@/components/ui/Tooltip";

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [utmData, setUtmData] = useState<UTMBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [d, utm] = await Promise.all([
        api.getDashboardMetrics(),
        api.getUTMBreakdown(90).catch(() => null), // Don't fail if UTM endpoint errors
      ]);
      setData(d);
      setUtmData(utm);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load dashboard metrics";
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-2 sm:px-0" role="status" aria-label="Loading dashboard">
        <SkeletonDashboard />
        <span className="sr-only">Loading dashboard data...</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800/50 shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{err}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const bySource = data?.by_source ?? {};
  const sourceCount = Object.keys(bySource).length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0" data-tutorial="dashboard">
      {/* Header */}
      <header className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Overview of your lead capture performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <ViewModeSelector variant="tabs" data-tutorial="view-mode" />
            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
        {/* View Mode Insight Banner */}
        <ViewModeInsight />
        {/* Wisdom */}
        <RotatingWisdom />
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="region" aria-label="Key metrics">
        {/* Total Leads */}
        <StatTooltip
          title="Total Leads"
          description="The total number of leads captured across all sources since your account was created. This includes form submissions, imports, and CRM syncs."
          position="bottom"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg cursor-help" tabIndex={0} role="article" aria-label={`Total leads: ${total.toLocaleString()}`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Total Leads</span>
              </div>
              <div className="text-4xl font-bold">{total.toLocaleString()}</div>
              <div className="mt-2 text-sm text-white/70">All time captured leads</div>
            </div>
          </div>
        </StatTooltip>

        {/* Unique Sources */}
        <StatTooltip
          title="Unique Sources"
          description="Different channels where your leads come from, such as website forms, landing pages, campaigns, or CRM integrations. More sources = wider reach."
          position="bottom"
        >
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg cursor-help" tabIndex={0} role="article" aria-label={`Unique sources: ${sourceCount}`}>
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-lg" aria-hidden="true">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-white/80">Unique Sources</span>
              </div>
              <div className="text-4xl font-bold">{sourceCount}</div>
              <div className="mt-2 text-sm text-white/70">Active lead channels</div>
            </div>
          </div>
        </StatTooltip>

        {/* Last Updated */}
        <StatTooltip
          title="Last Updated"
          description="When this dashboard data was last refreshed. Click the Refresh button to get the latest numbers from your CRM and lead sources."
          position="bottom"
        >
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 cursor-help" tabIndex={0} role="article" aria-label="Dashboard last updated">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg" aria-hidden="true">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</span>
            </div>
            <div className="text-xl font-semibold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </StatTooltip>
      </div>


      {/* Sources Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads by Source</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Breakdown of where your leads are coming from
            </p>
          </div>
          <Link
            to="/app/leads"
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            View all leads →
          </Link>
        </div>

        {total === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No leads yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
              Start capturing leads by embedding a form on your website or importing existing contacts.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/app/forms/embed"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Get embed code
              </Link>
              <Link
                to="/app/leads"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Import leads
              </Link>
            </div>
          </div>
        ) : sourceCount === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No source data available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(bySource)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([src, count]) => {
                    const percentage = total > 0 ? ((count as number) / total) * 100 : 0;
                    return (
                      <tr key={src} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                                {src.charAt(0)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {src === "unknown" ? <span className="italic text-gray-500">Unknown</span> : src}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {(count as number).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 w-48">
                          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UTM Source Tracking */}
      {utmData && (utmData.utm_sources.length > 0 || utmData.utm_mediums.length > 0 || utmData.utm_campaigns.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Source Tracking</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  UTM parameter breakdown (last 90 days)
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {utmData.total_with_utm.toLocaleString()} of {utmData.total_leads.toLocaleString()} leads with tracking data
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {utmData.total_leads > 0 ? Math.round((utmData.total_with_utm / utmData.total_leads) * 100) : 0}% tracked
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* UTM Source */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                By Source
              </h3>
              {utmData.utm_sources.length > 0 ? (
                <div className="space-y-2">
                  {utmData.utm_sources.slice(0, 5).map((item) => {
                    const maxCount = utmData.utm_sources[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name} className="group">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No source data yet</p>
              )}
            </div>

            {/* UTM Medium */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                By Medium
              </h3>
              {utmData.utm_mediums.length > 0 ? (
                <div className="space-y-2">
                  {utmData.utm_mediums.slice(0, 5).map((item) => {
                    const maxCount = utmData.utm_mediums[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name} className="group">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No medium data yet</p>
              )}
            </div>

            {/* UTM Campaign */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                By Campaign
              </h3>
              {utmData.utm_campaigns.length > 0 ? (
                <div className="space-y-2">
                  {utmData.utm_campaigns.slice(0, 5).map((item) => {
                    const maxCount = utmData.utm_campaigns[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name} className="group">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400 truncate max-w-[120px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No campaign data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
