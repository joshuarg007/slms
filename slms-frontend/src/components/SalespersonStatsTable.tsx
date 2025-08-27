// src/components/SalespersonStatsTable.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import ExportCsvButton from "./ExportCsvButton";

export type SalespersonStat = {
  owner_id: string;
  owner_name: string;
  owner_email: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
};

type StatsResponse = { days: number; results: SalespersonStat[] };

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

type SortKey = keyof Pick<
  SalespersonStat,
  | "owner_name"
  | "owner_email"
  | "emails_last_n_days"
  | "calls_last_n_days"
  | "meetings_last_n_days"
  | "new_deals_last_n_days"
>;

export default function SalespersonStatsTable({
  days,
  ownerId,
  ownerEmail,
  onRows,
}: {
  days: number;
  ownerId: string | null;
  ownerEmail?: string;
  onRows?: (rows: SalespersonStat[]) => void;
}) {
  const [rows, setRows] = useState<SalespersonStat[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("new_deals_last_n_days");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const ctrlRef = useRef<AbortController | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ days: String(days) });
    if (ownerId) p.set("owner_id", ownerId);
    if (!ownerId && ownerEmail?.trim()) p.set("owner_email", ownerEmail.trim());
    return p.toString();
  }, [days, ownerId, ownerEmail]);

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `${API_BASE}/integrations/hubspot/salespeople/stats?${qs}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: StatsResponse = await res.json();
        const r = json.results || [];
        setRows(r);
        onRows?.(r);
      } catch (e: any) {
        if (e.name !== "AbortError") setErr(e?.message || "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [qs, onRows]);

  function requestSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    const arr = [...(rows || [])];
    arr.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av || "");
      const bs = String(bv || "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const headers = [
    { key: "owner_name", label: "Owner" },
    { key: "owner_email", label: "Email" },
    { key: "emails_last_n_days", label: "Emails" },
    { key: "calls_last_n_days", label: "Calls" },
    { key: "meetings_last_n_days", label: "Meetings" },
    { key: "new_deals_last_n_days", label: "New deals" },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-end gap-2 px-5 pt-4">
        <ExportCsvButton
          filename={`salesperson_stats_${days}d.csv`}
          headers={headers as any}
          rows={sorted}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        />
      </div>

      {err ? (
        <div className="p-6 text-red-600">Error: {err}</div>
      ) : loading ? (
        <div className="p-6 text-gray-600">Fetching latest stats…</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              {headers.map((h) => {
                const active = (h.key as any) === sortKey;
                return (
                  <th
                    key={h.key as string}
                    className="px-5 py-3 cursor-pointer select-none"
                    onClick={() => requestSort(h.key as unknown as SortKey)}
                    title="Sort"
                  >
                    <span className="inline-flex items-center gap-1">
                      {h.label}
                      {active && (
                        <span className="text-gray-400">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {(sorted ?? []).map((r) => (
              <tr key={r.owner_id} className="border-t">
                <td className="px-5 py-3">{r.owner_name || r.owner_id}</td>
                <td className="px-5 py-3">{r.owner_email}</td>
                <td className="px-5 py-3">{r.emails_last_n_days}</td>
                <td className="px-5 py-3">{r.calls_last_n_days}</td>
                <td className="px-5 py-3">{r.meetings_last_n_days}</td>
                <td className="px-5 py-3">{r.new_deals_last_n_days}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className="px-5 py-3 text-gray-600" colSpan={headers.length}>
                  No rows for the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
