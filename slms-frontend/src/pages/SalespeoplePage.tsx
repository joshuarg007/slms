import { useEffect, useState } from "react";
import { getApiBase } from "@/utils/api";

interface StatRow {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
}

interface StatsResponse {
  days: number;
  results: StatRow[];
}

export default function SalespeoplePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatRow[]>([]);

  async function loadStats() {
    setLoading(true);
    setError(null);

    try {
      const base = getApiBase();
      const url = `${base}/salespeople/stats?days=7`;

      const token = typeof window !== "undefined"
        ? window.localStorage.getItem("access_token")
        : null;

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        let detail = text;

        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed.detail === "string") {
            detail = parsed.detail;
          }
        } catch {
          // not json
        }

        if (r.status === 401) {
          throw new Error("Not authenticated. Please sign in again.");
        }

        throw new Error(detail || `Request failed with status ${r.status}`);
      }

      const data: StatsResponse = await r.json();
      setStats(data.results || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load salespeople statistics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Salespeople</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Loading salespeople statistics...
        </div>
      )}

      {!loading && !error && stats.length === 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          No data available for this time window.
        </div>
      )}

      {!loading && !error && stats.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-left text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Emails</th>
                <th className="px-4 py-3">Calls</th>
                <th className="px-4 py-3">Meetings</th>
                <th className="px-4 py-3">New deals</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr
                  key={row.owner_id}
                  className="border-t border-gray-200 dark:border-gray-800 odd:bg-gray-50 dark:odd:bg-gray-950"
                >
                  <td className="px-4 py-3">{row.owner_name || "Unknown"}</td>
                  <td className="px-4 py-3">{row.owner_email || "Unknown"}</td>
                  <td className="px-4 py-3">{row.emails_last_n_days}</td>
                  <td className="px-4 py-3">{row.calls_last_n_days}</td>
                  <td className="px-4 py-3">{row.meetings_last_n_days}</td>
                  <td className="px-4 py-3">{row.new_deals_last_n_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
