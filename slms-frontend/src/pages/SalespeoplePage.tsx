// src/pages/SalespeoplePage.tsx
import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import StatsCards, { Row } from "@/components/StatsCards";
import SalesScoreboard from "@/components/SalesScoreboard";
import { getApiBase } from "@/utils/api";
import { useGamification } from "@/contexts/GamificationContext";
import { DemoTeamToggle } from "@/components/DemoSalespersonCard";
import { RotatingWisdom } from "@/components/WisdomTooltip";
import { DEMO_SALESPEOPLE } from "@/data/demoSalespeople";

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
    // ignore
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

type ViewMode = "cards" | "scoreboard";

export default function SalespeoplePage() {
  useDocumentTitle("Salespeople");
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("scoreboard");

  // Gamification
  const { showDemoTeam, setShowDemoTeam, canMuteDemoTeam, getDemoPerformance } = useGamification();

  // Merge real rows with demo salespeople
  const mergedRows = useMemo(() => {
    if (!showDemoTeam) return rows;

    const demoPerformance = getDemoPerformance();
    const demoRows: Row[] = DEMO_SALESPEOPLE.map((person) => {
      const perf = demoPerformance.find(p => p.user_id === person.id);
      return {
        owner_id: String(person.id),
        owner_name: person.display_name,
        owner_email: person.email,
        emails_last_n_days: perf?.emails_count || Math.floor((perf?.total_activities || 50) * 0.3),
        calls_last_n_days: perf?.calls_count || Math.floor((perf?.total_activities || 50) * 0.25),
        meetings_last_n_days: perf?.meetings_count || Math.floor((perf?.total_activities || 50) * 0.2),
        new_deals_last_n_days: perf?.won_leads || 2,
      };
    });

    return [...rows, ...demoRows];
  }, [rows, showDemoTeam, getDemoPerformance]);

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const crmRes = await authFetch(`${base}/integrations/crm/active`);
        if (crmRes.status === 401) {
          if (!cancelled) {
            setError("You are not logged in.");
            setLoading(false);
          }
          return;
        }
        if (!crmRes.ok) throw new Error("Failed to load active CRM");

        const statsRes = await authFetch(`${base}/salespeople/stats?days=${days}`);
        const text = await statsRes.text();

        if (!statsRes.ok) {
          try {
            const maybeJson = JSON.parse(text);
            if (maybeJson.detail) {
              if (!cancelled) setError(maybeJson.detail);
              setRows([]);
              setLoading(false);
              return;
            }
          } catch {
            // not json
          }

          if (!cancelled) {
            setError("Failed to load salesperson statistics.");
          }
          setRows([]);
          setLoading(false);
          return;
        }

        const data = JSON.parse(text);

        if (
          Array.isArray(data.results) &&
          data.results.length === 1 &&
          data.results[0].warning
        ) {
          if (!cancelled) {
            setError(data.results[0].warning);
            setRows([]);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setRows(data.results || []);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Unexpected error loading stats.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salespeople</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track salesperson activity and performance metrics
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode("scoreboard")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "scoreboard"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Scoreboard
                </span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "cards"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Cards
                </span>
              </button>
            </div>

            <DemoTeamToggle
              showDemoTeam={showDemoTeam}
              onToggle={() => setShowDemoTeam(!showDemoTeam)}
              canMute={canMuteDemoTeam}
              variant="minimal"
            />
            <label className="text-sm text-gray-600 dark:text-gray-400">Time period:</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 6 months</option>
              <option value={365}>Last 1 year</option>
              <option value={730}>Last 2 years</option>
              <option value={1825}>Last 5 years</option>
              <option value={0}>All time</option>
            </select>
          </div>
        </div>
        <RotatingWisdom />
      </header>

      {/* Only show error for auth issues */}
      {error && error.toLowerCase().includes("not logged in") && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-sm">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <div className="font-medium text-red-800 dark:text-red-200">Authentication required</div>
            <p className="mt-1 text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading salesperson data...
          </div>
        </div>
      )}

      {/* Empty State - show when no data OR non-auth errors */}
      {!loading && (mergedRows.length === 0 || (error && !error.toLowerCase().includes("not logged in"))) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No salesperson data yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Connect your CRM to see salesperson activity and performance metrics here.
          </p>
          <a
            href="/app/integrations"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect CRM
          </a>
        </div>
      )}

      {/* Content - show when we have data and no errors */}
      {!loading && mergedRows.length > 0 && !error && (
        <>
          {viewMode === "scoreboard" ? (
            <SalesScoreboard data={mergedRows} days={days} />
          ) : (
            <StatsCards rows={mergedRows} days={days} />
          )}
        </>
      )}
    </div>
  );
}
