// src/hooks/useDashboardMetrics.ts
import { useEffect, useState } from "react";
import { api } from "../utils/api";

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
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api<DashboardMetrics>("/dashboard/metrics");
        setMetrics(data ?? EMPTY);
      } catch (e: any) {
        setError(e?.message || "error");
        setMetrics(EMPTY);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return { metrics, loading, error };
}
