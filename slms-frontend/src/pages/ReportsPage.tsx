// src/pages/ReportsPage.tsx
import { useEffect, useState } from "react";
import { getDashboardMetrics } from "@/utils/api";
import { getApiBase } from "@/utils/api";
import StatsCards, { Row as SalesRow } from "@/components/StatsCards";

type Tab = "leads" | "salespeople";

type LeadsMetrics = {
  total: number;
  by_source: Record<string, number>;
};

type SalespeopleResponse = {
  days: number;
  results: SalesRow[];
};

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    const tok =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {
    // ignore localStorage errors
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  const [leadsMetrics, setLeadsMetrics] = useState<LeadsMetrics | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [salesDays, setSalesDays] = useState(7);
  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesWarning, setSalesWarning] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
    loadSalespeople(7);
  }, []);

  async function loadLeads() {
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      const data = await getDashboardMetrics();
      setLeadsMetrics({
        total: data.total,
        by_source: data.by_source || {},
      });
    } catch (e: any) {
      setLeadsError(e?.message || "Could not load lead metrics.");
    } finally {
      setLeadsLoading(false);
    }
  }

  async function loadSalespeople(days: number) {
    setSalesLoading(true);
    setSalesError(null);
    setSalesWarning(null);
    try {
      const base = getApiBase();
      const res = await authFetch(`${base}/salespeople/stats?days=${days}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Salespeople stats failed: ${res.status} ${res.statusText} – ${text}`,
        );
      }
      const json = (await res.json()) as SalespeopleResponse;

      const warningRow = json.results.find(
        (r: any) => typeof (r as any).warning === "string",
      ) as any;

      if (warningRow && warningRow.warning) {
        setSalesWarning(warningRow.warning as string);
        setSalesRows([]);
      } else {
        setSalesRows(json.results || []);
      }

      setSalesDays(json.days);
    } catch (e: any) {
      setSalesError(e?.message || "Could not load salesperson stats.");
    } finally {
      setSalesLoading(false);
    }
  }

  function TabButton(props: {
    id: Tab;
    label: string;
    active: boolean;
    onClick: () => void;
  }) {
    const { id, label, active, onClick } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-full transition
          ${
            active
              ? "bg-brand-red text-white shadow-sm"
              : "text-text-secondary hover:bg-bg-tertiary"
          }`}
        aria-pressed={active}
        aria-label={label}
        data-tab={id}
      >
        {label}
      </button>
    );
  }

  const leadsSources = leadsMetrics?.by_source || {};
  const leadsSourceEntries = Object.entries(leadsSources).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Reports and Analytics
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Review lead funnel health and salesperson performance across your
            active CRM.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-bg-secondary border border-border px-2 py-1">
          <TabButton
            id="leads"
            label="Lead reports"
            active={activeTab === "leads"}
            onClick={() => setActiveTab("leads")}
          />
          <TabButton
            id="salespeople"
            label="Salespeople"
            active={activeTab === "salespeople"}
            onClick={() => setActiveTab("salespeople")}
          />
        </div>
      </header>

      {activeTab === "leads" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              Lead volume by source
            </h2>
            <button
              type="button"
              onClick={loadLeads}
              disabled={leadsLoading}
              className="text-xs rounded-full border border-border px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
            >
              {leadsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {leadsError && (
            <div className="rounded-lg border border-brand-red bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
              {leadsError}
            </div>
          )}

          {!leadsError && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Total leads
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-text-primary">
                    {leadsMetrics ? leadsMetrics.total.toLocaleString() : "—"}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Top source
                  </div>
                  <div className="mt-2 text-base text-text-primary">
                    {leadsSourceEntries.length
                      ? `${leadsSourceEntries[0][0]} (${leadsSourceEntries[0][1]})`
                      : "No data yet"}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
                  <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Number of sources
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-text-primary">
                    {leadsSourceEntries.length}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Leads by source
                  </h3>
                  <span className="text-xs text-text-muted">
                    Sorted by volume, highest first
                  </span>
                </div>

                {leadsSourceEntries.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No lead activity yet. Once you start capturing leads, you
                    will see a breakdown by source here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {leadsSourceEntries.map(([source, count]) => {
                      const total = leadsMetrics?.total || 0;
                      const pct =
                        total > 0
                          ? Math.round(((count ?? 0) / total) * 100)
                          : 0;
                      const label = source || "unknown";
                      return (
                        <div key={label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-text-primary">
                              {label}
                            </span>
                            <span className="text-text-muted">
                              {count.toLocaleString()} leads ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-bg-primary overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-red"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === "salespeople" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Salesperson performance
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Aggregated activity across your active CRM. Some providers
                require higher tier plans for full activity access.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted">
                Window
                <select
                  value={salesDays}
                  onChange={(e) => {
                    const d = Number(e.target.value) || 7;
                    setSalesDays(d);
                    loadSalespeople(d);
                  }}
                  className="ml-2 rounded-md border border-border bg-bg-secondary px-2 py-1 text-xs text-text-primary"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => loadSalespeople(salesDays)}
                disabled={salesLoading}
                className="text-xs rounded-full border border-border px-3 py-1.5 text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
              >
                {salesLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {salesWarning && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="font-medium">Limited HubSpot access</div>
              <p className="mt-1">{salesWarning}</p>
            </div>
          )}

          {salesError && (
            <div className="rounded-lg border border-brand-red bg-brand-red/5 px-4 py-3 text-sm text-brand-red">
              {salesError}
            </div>
          )}

          {!salesWarning && !salesError && (
            <>
              <StatsCards rows={salesRows} days={salesDays} />

              <div className="mt-4 rounded-2xl border border-border bg-bg-secondary p-4 shadow-sm overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-muted border-b border-border">
                      <th className="py-2 pr-4">Salesperson</th>
                      <th className="py-2 pr-4 text-right">
                        Emails (last {salesDays}d)
                      </th>
                      <th className="py-2 pr-4 text-right">
                        Calls (last {salesDays}d)
                      </th>
                      <th className="py-2 pr-4 text-right">
                        Meetings (last {salesDays}d)
                      </th>
                      <th className="py-2 pr-4 text-right">
                        New deals (last {salesDays}d)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-4 text-center text-text-muted"
                        >
                          No salesperson activity found for this window.
                        </td>
                      </tr>
                    ) : (
                      salesRows.map((r) => (
                        <tr
                          key={r.owner_id}
                          className="border-b border-border/60 last:border-b-0"
                        >
                          <td className="py-2 pr-4">
                            <div className="font-medium text-text-primary">
                              {r.owner_name ||
                                r.owner_email ||
                                r.owner_id ||
                                "Owner"}
                            </div>
                            {r.owner_email && (
                              <div className="text-xs text-text-muted">
                                {r.owner_email}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {r.emails_last_n_days.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {r.calls_last_n_days.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {r.meetings_last_n_days.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {r.new_deals_last_n_days.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
