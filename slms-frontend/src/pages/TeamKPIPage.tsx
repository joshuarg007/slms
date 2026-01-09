// src/pages/TeamKPIPage.tsx
import { useEffect, useState, useMemo } from "react";
import { getTeamKPIs, TeamKPISummary, SalespersonKPI } from "../utils/api";
import DateRangePicker, {
  DateRange,
  getDateRangeFromDays,
  formatDateForApi,
} from "../components/DateRangePicker";
import ExportCsvButton from "../components/ExportCsvButton";
import {
  AnimatedBarChart,
  RadialGauge,
  ProgressRing,
  ComparisonBar,
  DonutChart,
  GRADIENTS,
  CHART_COLORS,
} from "../components/charts";
import { useGamification } from "@/contexts/GamificationContext";
import { DemoTeamToggle } from "@/components/DemoSalespersonCard";
import { RotatingWisdom } from "@/components/WisdomTooltip";
import { getDemoSalesperson } from "@/data/demoSalespeople";

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
    blue: "from-blue-500 to-cyan-500",
    green: "from-emerald-500 to-green-500",
    yellow: "from-amber-500 to-yellow-500",
    red: "from-red-500 to-rose-500",
  }[color] || "from-blue-500 to-cyan-500";

  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${colorClass} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SalespersonCard({ sp, teamAvgCloseRate, index }: { sp: SalespersonKPI; teamAvgCloseRate: number; index: number }) {
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
      ? "text-emerald-600 dark:text-emerald-400"
      : sp.close_rate >= teamAvgCloseRate * 0.8
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div
      className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-500/25">
            {sp.display_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{sp.display_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{sp.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(sp.total_revenue)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
        </div>
      </div>

      {/* Quota Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Quota Attainment</span>
          <span className="font-semibold text-gray-900 dark:text-white">{sp.quota_attainment.toFixed(0)}%</span>
        </div>
        <ProgressBar value={sp.quota_attainment} max={100} color={quotaColor} />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          {formatCurrency(sp.total_revenue)} / {formatCurrency(sp.quota)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{sp.total_leads}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Leads</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
          <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{sp.won_leads}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Won</p>
        </div>
        <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl col-span-2 sm:col-span-1">
          <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-400">{sp.in_pipeline}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pipeline</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Close Rate</span>
          <span className={`font-semibold ${closeRateColor}`}>{sp.close_rate}%</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Avg Deal Size</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sp.avg_deal_size)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Avg Days to Close</span>
          <span className="font-semibold text-gray-900 dark:text-white">{sp.avg_days_to_close} days</span>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Activity</p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg min-h-[36px]">
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-400">{sp.calls_count}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg min-h-[36px]">
            <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{sp.emails_count}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-400">{sp.meetings_count}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {sp.activities_per_lead} activities per lead
        </p>
      </div>
    </div>
  );
}

function TeamSummary({ data }: { data: TeamKPISummary }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Summary</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.total_leads}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.total_won}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Won</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(data.total_revenue)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.team_close_rate}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Close Rate</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Team Activity</p>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {data.total_calls.toLocaleString()}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">calls</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {data.total_emails.toLocaleString()}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">emails</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {data.total_meetings.toLocaleString()}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">meetings</p>
              </div>
            </div>
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
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromDays(30));
  const [mounted, setMounted] = useState(false);

  // Gamification
  const { showDemoTeam, setShowDemoTeam, getDemoPerformance, canMuteDemoTeam } = useGamification();

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      const result = await getTeamKPIs({
        start_date: formatDateForApi(dateRange.startDate),
        end_date: formatDateForApi(dateRange.endDate),
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load KPIs");
    } finally {
      setLoading(false);
    }
  }

  // Merge real salespeople with demo salespeople
  const mergedSalespeople = useMemo(() => {
    const realSalespeople = data?.salespeople || [];

    if (!showDemoTeam) return realSalespeople;

    const demoPerformance = getDemoPerformance();
    const demoSalespeople: SalespersonKPI[] = demoPerformance.map((perf) => {
      const person = getDemoSalesperson(perf.user_id);
      return {
        user_id: perf.user_id,
        display_name: person?.display_name || "Demo",
        email: person?.archetype || "demo@site2crm.com",
        total_leads: perf.total_leads,
        won_leads: perf.won_leads,
        lost_leads: perf.lost_leads,
        in_pipeline: perf.in_pipeline,
        close_rate: perf.close_rate,
        total_revenue: perf.total_revenue,
        avg_deal_size: perf.avg_deal_size,
        quota: perf.quota,
        quota_attainment: perf.quota_attainment,
        calls_count: perf.calls_count,
        emails_count: perf.emails_count,
        meetings_count: perf.meetings_count,
        total_activities: perf.total_activities || (perf.calls_count + perf.emails_count + perf.meetings_count),
        activities_per_lead: perf.activities_per_lead,
        avg_days_to_close: perf.avg_days_to_close,
      };
    });

    return [...realSalespeople, ...demoSalespeople];
  }, [data, showDemoTeam, getDemoPerformance]);

  // Prepare CSV export data
  function getExportData() {
    if (!data) return [];
    return data.salespeople.map((sp) => ({
      name: sp.display_name,
      email: sp.email,
      total_leads: sp.total_leads,
      won_leads: sp.won_leads,
      lost_leads: sp.lost_leads,
      in_pipeline: sp.in_pipeline,
      close_rate: `${sp.close_rate}%`,
      total_revenue: sp.total_revenue,
      avg_deal_size: sp.avg_deal_size,
      quota: sp.quota,
      quota_attainment: `${sp.quota_attainment}%`,
      calls: sp.calls_count,
      emails: sp.emails_count,
      meetings: sp.meetings_count,
      activities_per_lead: sp.activities_per_lead,
      avg_days_to_close: sp.avg_days_to_close,
      period: dateRange.label,
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    const isCrmError = error?.toLowerCase().includes("credentials") || error?.toLowerCase().includes("integrations") || error?.toLowerCase().includes("not configured");
    return (
      <div className={`${isCrmError ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"} border rounded-2xl p-6`}>
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-medium">{isCrmError ? "CRM not connected" : "Unable to load team data"}</div>
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
    <div className={`space-y-4 sm:space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <div className={`space-y-3 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Team Performance</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(data.period_start).toLocaleDateString()} -{" "}
              {new Date(data.period_end).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <DemoTeamToggle
              showDemoTeam={showDemoTeam}
              onToggle={() => setShowDemoTeam(!showDemoTeam)}
              canMute={canMuteDemoTeam}
              variant="minimal"
            />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ExportCsvButton
              rows={getExportData()}
            filename={`team-kpi-${formatDateForApi(new Date())}.csv`}
          />
          <button
            onClick={loadData}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          </div>
        </div>
        {/* Wisdom */}
        <RotatingWisdom />
      </div>

      <div className={`transition-all duration-500 delay-75 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <TeamSummary data={data} />
      </div>

      {/* Visual Charts Section */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        {/* Revenue by Salesperson */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Rep</h3>
            </div>
          </div>
          <div className="p-6">
            <AnimatedBarChart
              data={mergedSalespeople
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 6)
                .map(sp => ({
                  name: sp.display_name.split(' ')[0],
                  value: sp.total_revenue,
                }))}
              height={220}
              horizontal
              colors={CHART_COLORS.success}
              barRadius={6}
            />
          </div>
        </div>

        {/* Activity Distribution Donut */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Mix</h3>
            </div>
          </div>
          <div className="p-6 flex justify-center">
            <DonutChart
              data={[
                { name: 'Calls', value: data.total_calls, color: GRADIENTS.cyan.start },
                { name: 'Emails', value: data.total_emails, color: GRADIENTS.emerald.start },
                { name: 'Meetings', value: data.total_meetings, color: GRADIENTS.purple.start },
              ]}
              size={200}
              thickness={45}
              centerValue={(data.total_calls + data.total_emails + data.total_meetings).toLocaleString()}
              centerLabel="Total"
            />
          </div>
        </div>

        {/* Team Quota Progress */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quota Attainment</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap justify-center gap-6">
              {data.salespeople.slice(0, 4).map((sp) => (
                <div key={sp.user_id} className="flex flex-col items-center">
                  <ProgressRing
                    progress={sp.quota_attainment}
                    size={80}
                    strokeWidth={8}
                    gradient={sp.quota_attainment >= 100 ? 'emerald' : sp.quota_attainment >= 75 ? 'indigo' : sp.quota_attainment >= 50 ? 'amber' : 'rose'}
                    showValue={false}
                  />
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {sp.display_name.split(' ')[0]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {sp.quota_attainment.toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Team Comparison Bars */}
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-500 delay-125 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Performance Comparison</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mergedSalespeople.map((sp) => {
              const maxRevenue = Math.max(...mergedSalespeople.map(s => s.total_revenue));
              return (
                <ComparisonBar
                  key={sp.user_id}
                  label={sp.display_name}
                  value={sp.total_revenue}
                  maxValue={maxRevenue}
                  gradient={sp.quota_attainment >= 100 ? 'emerald' : sp.quota_attainment >= 75 ? 'indigo' : 'amber'}
                  formatValue={(v) => formatCurrency(v)}
                />
              );
            })}
          </div>
        </div>
      </div>


      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        {mergedSalespeople.map((sp, idx) => (
          <SalespersonCard
            key={sp.user_id}
            sp={sp}
            teamAvgCloseRate={data.team_close_rate}
            index={idx}
          />
        ))}
      </div>
    </div>
  );
}
