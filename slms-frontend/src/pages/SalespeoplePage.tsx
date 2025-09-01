// src/pages/SalespeoplePage.tsx
import { useEffect, useState } from "react";
import SalespersonStatsTable, {
  type Row as StatsRow,
} from "@/components/SalespersonStatsTable";
import StatsCards from "@/components/StatsCards";

function apiBase() {
  const ls =
    typeof window !== "undefined" ? localStorage.getItem("slms.apiBase") : null;
  const env = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
  return (ls || env).replace(/\/$/, "");
}

export default function SalespeoplePage() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<StatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${apiBase()}/integrations/hubspot/salespeople/stats?days=${days}`;
    setLoading(true);
    setErr(null);
    fetch(url, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const items: StatsRow[] = (d?.results || []).map((r: any) => ({
          owner_id: String(r.owner_id ?? ""),
          owner_name: String(r.owner_name ?? "(unknown)"),
          emails_last_n_days: Number(r.emails_last_n_days ?? 0),
          calls_last_n_days: Number(r.calls_last_n_days ?? 0),
          meetings_last_n_days: Number(r.meetings_last_n_days ?? 0),
          new_deals_last_n_days: Number(r.new_deals_last_n_days ?? 0),
        }));
        setRows(items);
      })
      .catch((e: any) => setErr(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [days]);

  const totals = rows.reduce(
    (a, r) => {
      a.emails += r.emails_last_n_days;
      a.calls += r.calls_last_n_days;
      a.meetings += r.meetings_last_n_days;
      a.newDeals += r.new_deals_last_n_days;
      return a;
    },
    { emails: 0, calls: 0, meetings: 0, newDeals: 0 }
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Salespeople
        </h1>
        <select
          value={String(days)}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-gray-700 dark:text-gray-200">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-6">
            <StatsCards
              emails={totals.emails}
              calls={totals.calls}
              meetings={totals.meetings}
              newDeals={totals.newDeals}
            />
          </div>

          <SalespersonStatsTable rows={rows} />
        </>
      )}
    </div>
  );
}
