// src/hooks/useDashboardMetrics.ts
import { useEffect, useState } from "react";
import { getAccessToken } from "../utils/auth";

type MonthCount = { month: string; count: number };
type SourceCount = { source: string; count: number };
type StatusCount = { status: string; count: number };

type DashboardMetrics = {
  leads_by_month: MonthCount[];
  lead_sources: SourceCount[];
  status_counts: StatusCount[];
};

const EMPTY: DashboardMetrics = {
  leads_by_month: [],
  lead_sources: [],
  status_counts: [],
};

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    async function fetchMetrics() {
      setLoading(true);
      setError(null);

      try {
        const baseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
        const token = getAccessToken();
        const res = await fetch(`${baseUrl}/dashboard/metrics`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          // If your auth uses cookies instead of Authorization header, keep this.
          // If not, you can remove it.
          credentials: "include",
          signal: ctrl.signal,
        });

        if (res.status === 401) {
          setMetrics(EMPTY);
          setError("unauthorized");
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Request failed: ${res.status} ${text}`);
        }

        const data = (await res.json()) as DashboardMetrics;
        setMetrics(data ?? EMPTY);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error("Failed to fetch dashboard metrics:", e);
          setMetrics(EMPTY);
          setError(e?.message || "error");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    return () => ctrl.abort();
  }, []);

  return { metrics, loading, error };
}
