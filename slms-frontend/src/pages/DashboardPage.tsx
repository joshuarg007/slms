// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { api, type DashboardMetrics } from "@/utils/api";
import { Link } from "react-router-dom";

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

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-600">Loading dashboard…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="bg-white shadow rounded-2xl p-6 max-w-md w-full">
          <div className="text-red-600 mb-3">{err}</div>
          <button
            onClick={load}
            className="rounded-md bg-blue-600 text-white px-4 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const total = data?.total ?? 0;
  const bySource = data?.by_source ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={load}
          className="rounded-md bg-blue-600 text-white px-4 py-2"
        >
          Refresh
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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

      {/* Sources table */}
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
    </div>
  );
}
