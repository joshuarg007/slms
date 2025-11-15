// src/pages/SalespeoplePage.tsx
import { useEffect, useState } from "react";
import StatsCards, { Row } from "@/components/StatsCards";
import CRMSelect from "@/components/CRMSelect";
import { getApiBase } from "@/utils/api";

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell";

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
  } catch {}

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
  const [activeCRM, setActiveCRM] = useState<CRM>("hubspot");

  useEffect(() => {
    let cancelled = false;
    const base = getApiBase();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1. Load active CRM
        const crmRes = await authFetch(`${base}/integrations/crm/active`);
        if (crmRes.status === 401) {
          if (!cancelled) {
            setError("You are not logged in.");
            setLoading(false);
          }
          return;
        }
        if (!crmRes.ok) throw new Error("Failed to load active CRM");
        const crmJson = await crmRes.json();
        setActiveCRM(crmJson.provider);

        // 2. Load stats
        const statsRes = await authFetch(
          `${base}/salespeople/stats?days=${days}`
        );

        const text = await statsRes.text();

        if (!statsRes.ok) {
          // Pass backend warning cleanly to UI
          try {
            const maybeJson = JSON.parse(text);
            if (maybeJson.detail) {
              if (!cancelled) setError(maybeJson.detail);
              setRows([]);
              setLoading(false);
              return;
            }
          } catch {}

          if (!cancelled) {
            setError("Failed to load salesperson statistics.");
          }
          setRows([]);
          setLoading(false);
          return;
        }

        const data = JSON.parse(text);

        // Handle HubSpot soft-warning rows
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
      } catch (e: any) {
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
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Salesperson Analytics</h1>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="font-medium">CRM data unavailable</div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">
          No statistics available.
        </div>
      ) : (
        <StatsCards rows={rows} days={days} />
      )}
    </div>
  );
}
