// src/pages/SalespeoplePage.tsx
import { useEffect, useState } from "react";
import StatsCards from "@/components/StatsCards";
import OwnersSelect from "@/components/OwnersSelect";

type Row = {
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
};

function apiBase() {
  const ls = typeof window !== "undefined" ? localStorage.getItem("slms.apiBase") : null;
  const env = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
  return (ls || env).replace(/\/$/, "");
}

export default function SalespeoplePage() {
  const [days, setDays] = useState(7);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const base = `${apiBase()}/integrations/hubspot/salespeople/stats`;
    const url = `${base}?days=${days}${ownerId ? `&owner_id=${encodeURIComponent(ownerId)}` : ""}`;

    setLoading(true);
    setErr(null);
    fetch(url, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${r.statusText} – ${txt}`);
        }
        return r.json();
      })
      .then((d) => setRows(d?.results || []))
      .catch((e) => setErr(e?.message || "Failed to load sales stats"))
      .finally(() => setLoading(false));
  }, [days, ownerId]);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Salespeople</h1>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="days" className="text-sm text-gray-600 dark:text-gray-300">
              Window
            </label>
            <select
              id="days"
              value={String(days)}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          {/* Owner picker */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Owner</span>
            <OwnersSelect
              value={ownerId}
              onChange={(val) => setOwnerId(val)}
              allowAll
              className="min-w-[220px]"
            />
          </div>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </div>
      )}

      {!loading && rows.length > 0 && <StatsCards rows={rows} days={days} />}

      {/* Simple table inline for consistency */}
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-800 text-left text-sm text-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Emails</th>
              <th className="px-4 py-3">Calls</th>
              <th className="px-4 py-3">Meetings</th>
              <th className="px-4 py-3">New Deals</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No data for this window.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.owner_id} className="border-t border-gray-200 dark:border-gray-800 odd:bg-gray-50 dark:odd:bg-gray-950">
                  <td className="px-4 py-3">{r.owner_name || "—"}</td>
                  <td className="px-4 py-3">{r.owner_email || "—"}</td>
                  <td className="px-4 py-3">{r.emails_last_n_days}</td>
                  <td className="px-4 py-3">{r.calls_last_n_days}</td>
                  <td className="px-4 py-3">{r.meetings_last_n_days}</td>
                  <td className="px-4 py-3">{r.new_deals_last_n_days}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
