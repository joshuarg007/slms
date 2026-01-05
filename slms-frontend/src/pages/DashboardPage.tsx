// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { api, type DashboardMetrics } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import AIInsightWidget from "@/components/AIInsightWidget";
import { AIPrediction, AIRecommendationCard } from "@/components/AIBadge";
import ViewModeSelector, { ViewModeInsight } from "@/components/ViewModeSelector";
import { RotatingWisdom } from "@/components/WisdomTooltip";

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await api.getDashboardMetrics();
      setData(d);
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading dashboard...
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Leads */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
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

        {/* Unique Sources */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-lg">
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

        {/* Last Updated */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
      </div>

      {/* AI Intelligence Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insights */}
        <div className="lg:col-span-2">
          <AIInsightWidget
            title="AI Analysis Summary"
            insights={[
              { icon: "trending", text: `Your lead volume is up 18% this week. Momentum is building from organic search.` },
              { icon: "bulb", text: "High-intent signals detected: 4 leads viewed pricing page 3+ times in 24 hours." },
              { icon: "star", text: "Best performing day: Tuesday leads convert 31% higher than average." },
              { icon: "alert", text: "Action needed: 7 leads inactive >5 days are at churn risk." },
            ]}
            ctaText="Deep Dive Analysis"
          />
        </div>

        {/* AI Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Predictions
            </h4>
            <div className="space-y-2">
              <AIPrediction label="Win Rate" value="34%" confidence={89} trend="up" />
              <AIPrediction label="Avg Close Time" value="12 days" confidence={92} trend="down" />
              <AIPrediction label="Pipeline Health" value="Strong" confidence={87} trend="stable" />
            </div>
          </div>

          <AIRecommendationCard
            title="Optimize Lead Response"
            description="AI detected that leads contacted within 5 minutes have 4x higher conversion. Enable auto-assignment to improve response time."
            impact="+28% Conv"
            actionLabel="Enable"
          />
        </div>
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
    </div>
  );
}
