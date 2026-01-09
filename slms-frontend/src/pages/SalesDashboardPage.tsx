// src/pages/SalesDashboardPage.tsx
import { useEffect, useState } from "react";
import {
  getSalesDashboard,
  SalesDashboardMetrics,
  SalespersonKPI,
  LeadSourceMetrics,
  PipelineMetrics,
} from "../utils/api";
import DateRangePicker, {
  DateRange,
  getDateRangeFromDays,
  formatDateForApi,
} from "../components/DateRangePicker";
import ExportCsvButton from "../components/ExportCsvButton";
import {
  AnimatedAreaChart,
  AnimatedBarChart,
  DonutChart,
  FunnelChart,
  RadialGauge,
  Sparkline,
  ProgressRing,
  ComparisonBar,
  CHART_COLORS,
  GRADIENTS,
} from "../components/charts";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// Status color mapping
const statusColors: Record<string, string> = {
  new: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  contacted: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  qualified: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
  proposal: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  negotiation: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  won: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  lost: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

function MetricCard({
  title,
  value,
  change,
  subtitle,
  index = 0,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
  index?: number;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-sm font-medium ${
            change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {formatChange(change)} vs last month
        </p>
      )}
      {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}

function PipelineSection({ pipeline }: { pipeline: PipelineMetrics[] }) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const activePipeline = pipeline.filter(
    (p) => !["won", "lost"].includes(p.status)
  );
  const totalValue = activePipeline.reduce((sum, p) => sum + p.total_value, 0);
  const totalLeads = pipeline.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pipeline Overview</h3>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{totalLeads} total leads</span>
        </div>
      </div>
      <div className="p-6 space-y-3">
        {pipeline.map((stage, idx) => {
          const pct = (stage.count / Math.max(totalLeads, 1)) * 100;
          const isHovered = hoveredStage === stage.status;

          return (
            <div
              key={stage.status}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                isHovered ? "bg-gray-50 dark:bg-gray-800/50" : ""
              }`}
              onMouseEnter={() => setHoveredStage(stage.status)}
              onMouseLeave={() => setHoveredStage(null)}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                  statusColors[stage.status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                }`}
              >
                {stage.status}
              </span>
              <div className="flex-1">
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stage.status === "won"
                        ? "bg-gradient-to-r from-emerald-500 to-green-500"
                        : stage.status === "lost"
                        ? "bg-gradient-to-r from-red-400 to-rose-500"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500"
                    } ${isHovered ? "opacity-80" : ""}`}
                    style={{
                      width: `${Math.min(
                        (stage.total_value / Math.max(totalValue, 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                {isHovered && (
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    <span>{pct.toFixed(1)}% of leads</span>
                    <span>Avg: {formatCurrency(stage.avg_value)}</span>
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-20 text-right">
                {stage.count} leads
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                {formatCurrency(stage.total_value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type SortKey = "source" | "total_leads" | "won_leads" | "close_rate" | "total_revenue" | "avg_deal_size";

function LeadSourcesTable({ sources }: { sources: LeadSourceMetrics[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("total_revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedSources = [...sources].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => (
    <span className="ml-1 inline-flex">
      {sortKey === column ? (
        sortDir === "asc" ? "↑" : "↓"
      ) : (
        <span className="text-gray-300 dark:text-gray-600">↕</span>
      )}
    </span>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Source Performance</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th
                onClick={() => handleSort("source")}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Source <SortIcon column="source" />
              </th>
              <th
                onClick={() => handleSort("total_leads")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Leads <SortIcon column="total_leads" />
              </th>
              <th
                onClick={() => handleSort("won_leads")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Won <SortIcon column="won_leads" />
              </th>
              <th
                onClick={() => handleSort("close_rate")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Close Rate <SortIcon column="close_rate" />
              </th>
              <th
                onClick={() => handleSort("total_revenue")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Revenue <SortIcon column="total_revenue" />
              </th>
              <th
                onClick={() => handleSort("avg_deal_size")}
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Avg Deal <SortIcon column="avg_deal_size" />
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {sortedSources.map((source, idx) => (
              <tr
                key={source.source}
                className={`hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer ${
                  idx === 0 && sortKey === "total_revenue" ? "bg-emerald-50 dark:bg-emerald-900/10" : ""
                }`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {source.source}
                  {idx === 0 && sortKey === "total_revenue" && (
                    <span className="ml-2 px-2 py-0.5 rounded-md text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Top</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {source.total_leads}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {source.won_leads}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-medium ${
                      source.close_rate >= 30
                        ? "text-emerald-600 dark:text-emerald-400"
                        : source.close_rate >= 20
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {source.close_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white text-right">
                  {formatCurrency(source.total_revenue)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">
                  {formatCurrency(source.avg_deal_size)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopPerformers({ performers }: { performers: SalespersonKPI[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {performers.map((sp, idx) => (
          <div
            key={sp.user_id}
            className="px-6 py-4 flex items-center gap-4"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${
                idx === 0
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
                  : idx === 1
                  ? "bg-gradient-to-br from-gray-300 to-gray-400 shadow-gray-400/30"
                  : idx === 2
                  ? "bg-gradient-to-br from-amber-600 to-amber-700 shadow-amber-600/30"
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30"
              }`}
            >
              {idx + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{sp.display_name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sp.won_leads} won / {sp.close_rate}% close rate
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(sp.total_revenue)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {sp.quota_attainment.toFixed(0)}% of quota
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityChart({
  data,
}: {
  data: { date: string; calls: number; emails: number; meetings: number }[];
}) {
  // Transform data for stacked bar chart
  const chartData = data.map((d) => ({
    name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    calls: d.calls,
    emails: d.emails,
    meetings: d.meetings,
  }));

  const totalActivity = data.reduce((sum, d) => sum + d.calls + d.emails + d.meetings, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Trends</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{totalActivity.toLocaleString()} total activities</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <AnimatedBarChart
          data={chartData}
          height={200}
          stacked
          stackedKeys={["calls", "emails", "meetings"]}
          colors={[GRADIENTS.cyan.start, GRADIENTS.emerald.start, GRADIENTS.purple.start]}
          barRadius={4}
        />
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GRADIENTS.cyan.start }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Calls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GRADIENTS.emerald.start }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Emails</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: GRADIENTS.purple.start }} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Meetings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceBreakdownChart({ sources }: { sources: LeadSourceMetrics[] }) {
  const donutData = sources.slice(0, 6).map((s) => ({
    name: s.source,
    value: s.total_leads,
  }));

  const totalLeads = sources.reduce((sum, s) => sum + s.total_leads, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Sources</h3>
        </div>
      </div>
      <div className="p-6 flex justify-center">
        <DonutChart
          data={donutData}
          size={220}
          thickness={50}
          centerValue={totalLeads.toLocaleString()}
          centerLabel="Total Leads"
        />
      </div>
    </div>
  );
}

function RevenueBySourceChart({ sources }: { sources: LeadSourceMetrics[] }) {
  const chartData = sources
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 6)
    .map((s) => ({
      name: s.source,
      value: s.total_revenue,
    }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Source</h3>
        </div>
      </div>
      <div className="p-6">
        <AnimatedBarChart
          data={chartData}
          height={220}
          horizontal
          colors={CHART_COLORS.gradient}
          barRadius={6}
        />
      </div>
    </div>
  );
}

function PipelineFunnelChart({ pipeline }: { pipeline: PipelineMetrics[] }) {
  const funnelData = pipeline
    .filter((p) => !["lost"].includes(p.status))
    .map((p) => ({
      name: p.status.charAt(0).toUpperCase() + p.status.slice(1),
      value: p.count,
      color: p.status === "won" ? GRADIENTS.emerald.start : undefined,
    }));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Funnel</h3>
        </div>
      </div>
      <div className="p-6">
        <FunnelChart data={funnelData} height={280} />
      </div>
    </div>
  );
}

export default function SalesDashboardPage() {
  const [metrics, setMetrics] = useState<SalesDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromDays(90));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await getSalesDashboard({
        start_date: formatDateForApi(dateRange.startDate),
        end_date: formatDateForApi(dateRange.endDate),
      });
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  // Prepare export data
  function getExportData() {
    if (!metrics) return [];
    return [
      {
        metric: "Total Leads",
        value: metrics.total_leads,
        period: dateRange.label,
      },
      {
        metric: "Total Revenue",
        value: metrics.total_revenue,
        period: dateRange.label,
      },
      {
        metric: "Avg Deal Size",
        value: metrics.avg_deal_size,
        period: dateRange.label,
      },
      {
        metric: "Close Rate",
        value: `${metrics.overall_close_rate}%`,
        period: dateRange.label,
      },
      {
        metric: "Pipeline Value",
        value: metrics.pipeline_value,
        period: dateRange.label,
      },
      ...metrics.by_source.map((s) => ({
        metric: `Source: ${s.source}`,
        value: s.total_leads,
        close_rate: `${s.close_rate}%`,
        revenue: s.total_revenue,
        period: dateRange.label,
      })),
    ];
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    const isCrmError = error?.toLowerCase().includes("credentials") || error?.toLowerCase().includes("integrations") || error?.toLowerCase().includes("not configured");
    return (
      <div className={`${isCrmError ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"} border rounded-2xl p-6`}>
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium">{isCrmError ? "CRM not connected" : "Unable to load dashboard"}</div>
            <p className="mt-1">{error || "No data available"}</p>
            {isCrmError && (
              <a
                href="/app/integrations"
                className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect CRM
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <div className={`flex items-center justify-between flex-wrap gap-4 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportCsvButton
            rows={getExportData()}
            filename={`sales-dashboard-${formatDateForApi(new Date())}.csv`}
          />
          <button
            onClick={loadDashboard}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-500 delay-75 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.total_revenue)}
          subtitle={`${formatCurrency(metrics.avg_deal_size)} avg deal`}
          index={0}
        />
        <MetricCard
          title="This Month Revenue"
          value={formatCurrency(metrics.revenue_this_month)}
          change={metrics.revenue_change_pct}
          index={1}
        />
        <MetricCard
          title="Total Leads"
          value={metrics.total_leads.toLocaleString()}
          subtitle={`${metrics.overall_close_rate.toFixed(1)}% close rate`}
          index={2}
        />
        <MetricCard
          title="Leads This Month"
          value={metrics.leads_this_month.toString()}
          change={metrics.leads_change_pct}
          index={3}
        />
      </div>

      {/* Pipeline Value Highlight */}
      <div className={`bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <p className="text-indigo-100 text-sm font-medium">Active Pipeline Value</p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(metrics.pipeline_value)}
        </p>
        <p className="text-indigo-200 text-sm mt-2">
          Across{" "}
          {metrics.pipeline
            .filter((p) => !["won", "lost"].includes(p.status))
            .reduce((sum, p) => sum + p.count, 0)}{" "}
          active opportunities
        </p>
      </div>


      {/* Visual Charts Row */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <PipelineFunnelChart pipeline={metrics.pipeline} />
        <SourceBreakdownChart sources={metrics.by_source} />
        <RevenueBySourceChart sources={metrics.by_source} />
      </div>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-500 delay-300 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="lg:col-span-2 space-y-6">
          <PipelineSection pipeline={metrics.pipeline} />
          <LeadSourcesTable sources={metrics.by_source} />
        </div>
        <div className="space-y-6">
          <TopPerformers performers={metrics.top_performers} />
          <ActivityChart data={metrics.activities_by_day} />
        </div>
      </div>
    </div>
  );
}
