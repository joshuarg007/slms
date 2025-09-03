// src/components/SalespersonStatsTable.tsx
import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/utils/api";

export type Row = {
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  emails_last_n_days: number;
  calls_last_n_days: number;
  meetings_last_n_days: number;
  new_deals_last_n_days: number;
};

type Props = {
  /** New, preferred usage: pass pre-fetched data + range */
  rows?: Row[];
  days?: number;

  /** Legacy usage: component will fetch HubSpot stats itself */
  initialDays?: number;
  initialEmail?: string; // optional legacy filter
};

export default function SalespersonStatsTable(props: Props) {
  const usingExternalRows = Array.isArray(props.rows);
  const displayDays = (props.days ?? props.initialDays ?? 7);

  // If rows are provided, we just render them. Otherwise we fetch (legacy path).
  const [internalRows, setInternalRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(!usingExternalRows);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (usingExternalRows) {
      setLoading(false);
      setErr(null);
      return;
    }
    let alive = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        // legacy: hubspot-only endpoint
        const base = getApiBase();
        const url = new URL(`${base}/integrations/hubspot/salespeople/stats`);
        url.searchParams.set("days", String(displayDays));
        const res = await fetch(url.toString(), { credentials: "include" });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} – ${t}`);
        }
        const data = (await res.json()) as { results?: any[] };
        let rows: Row[] = (data?.results ?? []).map((r) => ({
          owner_id: String(r.owner_id ?? r.id ?? ""),
          owner_name: r.owner_name ?? r.name ?? r.email ?? "Owner",
          owner_email: r.owner_email ?? r.email ?? "",
          emails_last_n_days: Number(r.emails_last_n_days ?? 0),
          calls_last_n_days: Number(r.calls_last_n_days ?? 0),
          meetings_last_n_days: Number(r.meetings_last_n_days ?? 0),
          new_deals_last_n_days: Number(r.new_deals_last_n_days ?? 0),
        }));

        // optional legacy filter by email
        if (props.initialEmail) {
          const needle = props.initialEmail.toLowerCase();
          rows = rows.filter((r) => (r.owner_email ?? "").toLowerCase() === needle);
        }

        if (alive) setInternalRows(rows);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load stats");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingExternalRows, displayDays, props.initialEmail]);

  const rows: Row[] = useMemo(() => {
    return usingExternalRows ? props.rows! : internalRows;
  }, [usingExternalRows, props.rows, internalRows]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">
          Salesperson activity (last {displayDays} days)
        </h2>
      </div>

      {err && (
        <div className="px-5 py-4 text-sm text-red-700 bg-red-50 border-t border-red-100">
          {err}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-gray-600 dark:text-gray-300">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-6 text-gray-600 dark:text-gray-300">No data.</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <tr>
              <Th>Owner</Th>
              <Th>Email</Th>
              <Th className="text-center">Emails</Th>
              <Th className="text-center">Calls</Th>
              <Th className="text-center">Meetings</Th>
              <Th className="text-center">New Deals</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.owner_id}-${r.owner_email ?? ""}`} className="border-t border-gray-100 dark:border-gray-800">
                <Td>{r.owner_name ?? "—"}</Td>
                <Td className="text-gray-700 dark:text-gray-300">{r.owner_email ?? "—"}</Td>
                <Td num>{r.emails_last_n_days}</Td>
                <Td num>{r.calls_last_n_days}</Td>
                <Td num>{r.meetings_last_n_days}</Td>
                <Td num>{r.new_deals_last_n_days}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Th(props: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-5 py-3 text-left font-semibold ${props.className ?? ""}`}>
      {props.children}
    </th>
  );
}

function Td(props: { children: React.ReactNode; num?: boolean; className?: string }) {
  return (
    <td
      className={`px-5 py-3 ${props.num ? "text-right tabular-nums font-medium" : ""} ${props.className ?? ""}`}
    >
      {props.children}
    </td>
  );
}
