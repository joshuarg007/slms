// src/pages/SalesDashboardPage.tsx
import { useEffect, useState } from "react";
import {
  getSalesDashboard,
  SalesDashboardMetrics,
  SalespersonKPI,
  LeadSourceMetrics,
  PipelineMetrics,
} from "../utils/api";

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
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-purple-100 text-purple-800",
  proposal: "bg-indigo-100 text-indigo-800",
  negotiation: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

function MetricCard({
  title,
  value,
  change,
  subtitle,
}: {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {change !== undefined && (
        <p
          className={`mt-1 text-sm ${
            change >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {formatChange(change)} vs last month
        </p>
      )}
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function PipelineSection({ pipeline }: { pipeline: PipelineMetrics[] }) {
  const activePipeline = pipeline.filter(
    (p) => !["won", "lost"].includes(p.status)
  );
  const totalValue = activePipeline.reduce((sum, p) => sum + p.total_value, 0);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Pipeline Overview
      </h3>
      <div className="space-y-3">
        {pipeline.map((stage) => (
          <div key={stage.status} className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                statusColors[stage.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {stage.status}
            </span>
            <div className="flex-1">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stage.status === "won"
                      ? "bg-green-500"
                      : stage.status === "lost"
                      ? "bg-red-400"
                      : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (stage.total_value / Math.max(totalValue, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-600 w-20 text-right">
              {stage.count} leads
            </span>
            <span className="text-sm font-medium text-gray-900 w-24 text-right">
              {formatCurrency(stage.total_value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadSourcesTable({ sources }: { sources: LeadSourceMetrics[] }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Lead Source Performance
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Source
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Leads
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Won
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Close Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Avg Deal
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sources.map((source) => (
              <tr key={source.source} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {source.source}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                  {source.total_leads}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                  {source.won_leads}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-sm font-medium ${
                      source.close_rate >= 30
                        ? "text-green-600"
                        : source.close_rate >= 20
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {source.close_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(source.total_revenue)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">
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
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
        <p className="text-sm text-gray-500">Last 30 days</p>
      </div>
      <div className="divide-y divide-gray-200">
        {performers.map((sp, idx) => (
          <div key={sp.user_id} className="px-5 py-4 flex items-center gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                idx === 0
                  ? "bg-yellow-500"
                  : idx === 1
                  ? "bg-gray-400"
                  : idx === 2
                  ? "bg-amber-600"
                  : "bg-blue-500"
              }`}
            >
              {idx + 1}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{sp.display_name}</p>
              <p className="text-sm text-gray-500">
                {sp.won_leads} won / {sp.close_rate}% close rate
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {formatCurrency(sp.total_revenue)}
              </p>
              <p className="text-sm text-gray-500">
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
  const maxValue = Math.max(
    ...data.flatMap((d) => [d.calls, d.emails, d.meetings]),
    1
  );

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activity Trends (Last 7 Days)
      </h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex gap-0.5 items-end h-32">
              <div
                className="w-3 bg-blue-500 rounded-t"
                style={{ height: `${(day.calls / maxValue) * 100}%` }}
                title={`${day.calls} calls`}
              />
              <div
                className="w-3 bg-green-500 rounded-t"
                style={{ height: `${(day.emails / maxValue) * 100}%` }}
                title={`${day.emails} emails`}
              />
              <div
                className="w-3 bg-purple-500 rounded-t"
                style={{ height: `${(day.meetings / maxValue) * 100}%` }}
                title={`${day.meetings} meetings`}
              />
            </div>
            <span className="text-xs text-gray-500">
              {new Date(day.date).toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span className="text-sm text-gray-600">Calls</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-sm text-gray-600">Emails</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded" />
          <span className="text-sm text-gray-600">Meetings</span>
        </div>
      </div>
    </div>
  );
}

export default function SalesDashboardPage() {
  const [metrics, setMetrics] = useState<SalesDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await getSalesDashboard();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || "No data available"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Dashboard</h1>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.total_revenue)}
          subtitle={`${formatCurrency(metrics.avg_deal_size)} avg deal`}
        />
        <MetricCard
          title="This Month Revenue"
          value={formatCurrency(metrics.revenue_this_month)}
          change={metrics.revenue_change_pct}
        />
        <MetricCard
          title="Total Leads"
          value={metrics.total_leads.toLocaleString()}
          subtitle={`${metrics.overall_close_rate.toFixed(1)}% close rate`}
        />
        <MetricCard
          title="Leads This Month"
          value={metrics.leads_this_month.toString()}
          change={metrics.leads_change_pct}
        />
      </div>

      {/* Pipeline Value Highlight */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow p-6 text-white">
        <p className="text-blue-100 text-sm font-medium">Active Pipeline Value</p>
        <p className="text-3xl font-bold mt-1">
          {formatCurrency(metrics.pipeline_value)}
        </p>
        <p className="text-blue-100 text-sm mt-2">
          Across{" "}
          {metrics.pipeline
            .filter((p) => !["won", "lost"].includes(p.status))
            .reduce((sum, p) => sum + p.count, 0)}{" "}
          active opportunities
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
