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
        <div className="text-gray-700 dark:text-gray-200">Loading dashboard…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="bg-white dark:bg-gray-900 border border-red-300 dark:border-red-800 shadow rounded-2xl p-6 max-w-md w-full">
          <div className="text-red-700 dark:text-red-300 mb-3">{err}</div>
          <button
            onClick={load}
            className="rounded-md bg-indigo-600 text-white px-4 py-2"
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
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <button
          onClick={load}
          className="rounded-md bg-indigo-600 text-white px-4 py-2"
        >
          Refresh
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardLabel>Total Leads</CardLabel>
          <CardValue>{total}</CardValue>
        </Card>

        <Card>
          <CardLabel>Unique Sources</CardLabel>
          <CardValue>{Object.keys(bySource).length}</CardValue>
        </Card>

        <Card>
          <CardLabel>Last Updated</CardLabel>
          <div className="text-lg mt-1 text-gray-900 dark:text-gray-100">
            {new Date().toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Sources table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Leads by Source</h2>
        </div>

        {total === 0 ? (
          <div className="p-6 text-gray-700 dark:text-gray-200">
            No leads yet. Head to{" "}
            <Link to="/leads" className="text-indigo-600 underline">
              Leads
            </Link>{" "}
            to add or import some.
          </div>
        ) : Object.keys(bySource).length === 0 ? (
          <div className="p-6 text-gray-700 dark:text-gray-200">No source data available.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr className="text-gray-900 dark:text-gray-100">
                <th className="px-5 py-3 text-left font-semibold">Source</th>
                <th className="px-5 py-3 text-left font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="text-gray-900 dark:text-gray-100">
              {Object.entries(bySource).map(([src, count]) => (
                <tr key={src} className="border-t border-gray-100 dark:border-gray-800">
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

/** Small presentational bits to keep styles consistent */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow p-5">
      {children}
    </div>
  );
}
function CardLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{children}</div>;
}
function CardValue({ children }: { children: React.ReactNode }) {
  return <div className="text-3xl font-semibold mt-1 text-gray-900 dark:text-gray-100">{children}</div>;
}
