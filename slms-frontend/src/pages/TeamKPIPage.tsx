// src/pages/TeamKPIPage.tsx
import { useEffect, useState } from "react";
import { getTeamKPIs, TeamKPISummary, SalespersonKPI } from "../utils/api";

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function ProgressBar({
  value,
  max,
  color = "blue",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  const colorClass = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  }[color] || "bg-blue-500";

  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${colorClass} rounded-full transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SalespersonCard({ sp, teamAvgCloseRate }: { sp: SalespersonKPI; teamAvgCloseRate: number }) {
  const quotaColor =
    sp.quota_attainment >= 100
      ? "green"
      : sp.quota_attainment >= 75
      ? "blue"
      : sp.quota_attainment >= 50
      ? "yellow"
      : "red";

  const closeRateColor =
    sp.close_rate >= teamAvgCloseRate
      ? "text-green-600"
      : sp.close_rate >= teamAvgCloseRate * 0.8
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{sp.display_name}</h3>
          <p className="text-sm text-gray-500">{sp.email}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(sp.total_revenue)}
          </p>
          <p className="text-sm text-gray-500">Revenue</p>
        </div>
      </div>

      {/* Quota Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Quota Attainment</span>
          <span className="font-medium">{sp.quota_attainment.toFixed(0)}%</span>
        </div>
        <ProgressBar value={sp.quota_attainment} max={100} color={quotaColor} />
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(sp.total_revenue)} / {formatCurrency(sp.quota)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-lg font-semibold text-gray-900">{sp.total_leads}</p>
          <p className="text-xs text-gray-500">Leads</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded">
          <p className="text-lg font-semibold text-green-700">{sp.won_leads}</p>
          <p className="text-xs text-gray-500">Won</p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-lg font-semibold text-blue-700">{sp.in_pipeline}</p>
          <p className="text-xs text-gray-500">Pipeline</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Close Rate</span>
          <span className={`font-medium ${closeRateColor}`}>{sp.close_rate}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg Deal Size</span>
          <span className="font-medium">{formatCurrency(sp.avg_deal_size)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Avg Days to Close</span>
          <span className="font-medium">{sp.avg_days_to_close} days</span>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Activity</p>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-blue-600">{sp.calls_count}</span>
            <span className="text-gray-500">calls</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-600">{sp.emails_count}</span>
            <span className="text-gray-500">emails</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-600">{sp.meetings_count}</span>
            <span className="text-gray-500">meetings</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {sp.activities_per_lead} activities per lead
        </p>
      </div>
    </div>
  );
}

function TeamSummary({ data }: { data: TeamKPISummary }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{data.total_leads}</p>
          <p className="text-sm text-gray-500">Total Leads</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{data.total_won}</p>
          <p className="text-sm text-gray-500">Won</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.total_revenue)}
          </p>
          <p className="text-sm text-gray-500">Revenue</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{data.team_close_rate}%</p>
          <p className="text-sm text-gray-500">Close Rate</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Team Activity</p>
        <div className="flex gap-6">
          <div>
            <span className="text-lg font-semibold text-blue-600">
              {data.total_calls.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">calls</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-green-600">
              {data.total_emails.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">emails</span>
          </div>
          <div>
            <span className="text-lg font-semibold text-purple-600">
              {data.total_meetings.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500 ml-1">meetings</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamKPIPage() {
  const [data, setData] = useState<TeamKPISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  async function loadData() {
    try {
      setLoading(true);
      const result = await getTeamKPIs(days);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KPIs");
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

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error || "No data available"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Performance</h1>
          <p className="text-sm text-gray-500">
            {new Date(data.period_start).toLocaleDateString()} -{" "}
            {new Date(data.period_end).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <TeamSummary data={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.salespeople.map((sp) => (
          <SalespersonCard
            key={sp.user_id}
            sp={sp}
            teamAvgCloseRate={data.team_close_rate}
          />
        ))}
      </div>
    </div>
  );
}
