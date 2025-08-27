// src/pages/SalespeoplePage.tsx
import { useState } from "react";
import OwnersSelect from "@/components/OwnersSelect";
import SalespersonStatsTable, { type SalespersonStat } from "@/components/SalespersonStatsTable";

function Totals({ rows }: { rows: SalespersonStat[] }) {
  const sum = (k: keyof SalespersonStat) => rows.reduce((acc, r) => acc + (Number((r as any)[k]) || 0), 0);
  const totals = [
    { label: "Emails", value: sum("emails_last_n_days") },
    { label: "Calls", value: sum("calls_last_n_days") },
    { label: "Meetings", value: sum("meetings_last_n_days") },
    { label: "New deals", value: sum("new_deals_last_n_days") },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
      {totals.map((t) => (
        <div key={t.label} className="bg-white rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">{t.label}</div>
          <div className="text-3xl font-semibold mt-1">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function SalespeoplePage() {
  const [days, setDays] = useState<number>(90);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [rows, setRows] = useState<SalespersonStat[]>([]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Salespeople</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="bg-white rounded-2xl shadow p-4 h-max">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Filters</div>

          <label className="block">
            <span className="text-sm text-gray-600">Window</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>

          <div className="mt-3">
            <OwnersSelect value={ownerId} onChange={setOwnerId} />
          </div>
        </aside>

        {/* Main */}
        <main>
          <Totals rows={rows} />
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-medium">Salesperson Stats</h2>
              <div className="text-sm text-gray-500">Click headers to sort • Export CSV</div>
            </div>
            <SalespersonStatsTable days={days} ownerId={ownerId} onRows={setRows} />
          </div>
        </main>
      </div>
    </div>
  );
}
