import { useEffect, useState } from "react";
import { api, type DashboardMetrics } from "@/utils/api";
import { Link } from "react-router-dom";
import SalespersonStatsTable from "@/components/SalespersonStatsTable";
import OwnersSelect from "@/components/OwnersSelect";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const d = await api.getDashboardMetrics();
      setData(d);
    } catch (e: any) {
      setErr(e?.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // filters for salesperson section
  const [days, setDays] = useState<number>(90);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center">
        <div className="text-gray-600">Loading dashboard…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="bg-white shadow rounded-2xl p-6 max-w-md">
        <div className="text-red-600 mb-3">{err}</div>
        <button onClick={load} className="rounded-md bg-blue-600 text-white px-4 py-2">
          Retry
        </button>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const bySource = data?.by_source ?? {};

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button onClick={load} className="rounded-md bg-blue-600 text-white px-4 py-2">
          Refresh
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Total Leads</div>
          <div className="text-3xl font-semibold mt-1">{total}</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Unique Sources</div>
          <div className="text-3xl font-semibold mt-1">
            {Object.keys(bySource).length}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Last Updated</div>
          <div className="text-lg mt-1">{new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Leads by Source (kept first) */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-medium">Leads by Source</h2>
        </div>

        {total === 0 ? (
          <div className="p-6 text-gray-600">
            No leads yet. Head to{" "}
            <Link to="/leads" className="text-blue-600 underline">
              Leads
            </Link>{" "}
            to add or import some.
          </div>
        ) : Object.keys(bySource).length === 0 ? (
          <div className="p-6 text-gray-600">No source data available.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-sm text-gray-600">
              <tr>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bySource).map(([src, count]) => (
                <tr key={src} className="border-t">
                  <td className="px-5 py-3 capitalize">
                    {src === "unknown" ? <span className="italic">unknown</span> : src}
                  </td>
                  <td className="px-5 py-3">{count as number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Salesperson stats (filters inline since global sidebar is now persistent) */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b flex flex-wrap items-center gap-3 justify-between">
          <h2 className="text-lg font-medium">Salesperson Stats</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">
              <span className="mr-2">Window</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
            <div className="min-w-[220px]">
              <OwnersSelect value={ownerId} onChange={setOwnerId} />
            </div>
          </div>
        </div>

        <SalespersonStatsTable days={days} ownerId={ownerId} />
      </div>
    </div>
  );
}
