// src/pages/SalespeoplePage.tsx
import { useEffect, useState } from "react";
import StatsCards, { Row } from "@/components/StatsCards";
import { getApiBase } from "@/utils/api";

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

export default function SalespeoplePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salespeople</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track salesperson activity and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">Time period:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </header>

      {/* Error/Warning */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-4 text-sm">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium text-amber-800 dark:text-amber-200">CRM data unavailable</div>
            <p className="mt-1 text-amber-700 dark:text-amber-300">{error}</p>
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

      {/* Empty State */}
      {!loading && !error && rows.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No salesperson data</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Connect your CRM to see salesperson activity and performance metrics here.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && rows.length > 0 && (
        <StatsCards rows={rows} days={days} />
      )}
    </div>
  );
}
