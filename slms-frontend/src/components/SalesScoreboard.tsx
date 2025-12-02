// src/components/SalesScoreboard.tsx
// Interactive KPI scoreboard with color grading and sorting

import { useState, useMemo } from "react";

interface SalespersonKPI {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // Activity KPIs
  emails: number;
  calls: number;
  meetings: number;
  // Performance KPIs
  deals: number;
  revenue: number;
  closeRate: number;
  avgDealSize: number;
  // Engagement
  responseTime: number; // hours
  followUpRate: number; // percentage
  // Calculated
  activityScore: number;
  performanceScore: number;
  overallScore: number;
}

type SortField = keyof SalespersonKPI;
type SortDirection = "asc" | "desc";

// Color tiers for performance grading
type PerformanceTier = "excellent" | "good" | "average" | "poor";

const tierColors: Record<PerformanceTier, { bg: string; text: string; border: string }> = {
  excellent: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  good: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  average: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  poor: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
  },
};

// Thresholds for each KPI
const kpiThresholds: Record<string, { excellent: number; good: number; average: number }> = {
  emails: { excellent: 50, good: 30, average: 15 },
  calls: { excellent: 40, good: 25, average: 10 },
  meetings: { excellent: 15, good: 10, average: 5 },
  deals: { excellent: 8, good: 5, average: 2 },
  revenue: { excellent: 50000, good: 25000, average: 10000 },
  closeRate: { excellent: 30, good: 20, average: 10 },
  avgDealSize: { excellent: 10000, good: 5000, average: 2000 },
  responseTime: { excellent: 1, good: 4, average: 12 }, // Lower is better
  followUpRate: { excellent: 90, good: 70, average: 50 },
  activityScore: { excellent: 90, good: 70, average: 50 },
  performanceScore: { excellent: 90, good: 70, average: 50 },
  overallScore: { excellent: 90, good: 70, average: 50 },
};

function getTier(value: number, field: string): PerformanceTier {
  const thresholds = kpiThresholds[field];
  if (!thresholds) return "average";

  // For response time, lower is better
  if (field === "responseTime") {
    if (value <= thresholds.excellent) return "excellent";
    if (value <= thresholds.good) return "good";
    if (value <= thresholds.average) return "average";
    return "poor";
  }

  // For everything else, higher is better
  if (value >= thresholds.excellent) return "excellent";
  if (value >= thresholds.good) return "good";
  if (value >= thresholds.average) return "average";
  return "poor";
}

function ColoredCell({ value, field, format = "number" }: { value: number; field: string; format?: "number" | "currency" | "percent" | "hours" }) {
  const tier = getTier(value, field);
  const colors = tierColors[tier];

  let displayValue: string;
  switch (format) {
    case "currency":
      displayValue = `$${value.toLocaleString()}`;
      break;
    case "percent":
      displayValue = `${value.toFixed(1)}%`;
      break;
    case "hours":
      displayValue = value < 1 ? `${Math.round(value * 60)}m` : `${value.toFixed(1)}h`;
      break;
    default:
      displayValue = value.toLocaleString();
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${colors.bg} ${colors.text}`}>
      {displayValue}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number; label?: string }) {
  const tier = getTier(score, "overallScore");
  const colors = tierColors[tier];

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            tier === "excellent" ? "bg-emerald-500" :
            tier === "good" ? "bg-blue-500" :
            tier === "average" ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${colors.text} w-10 text-right`}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

interface Props {
  data: Array<{
    owner_id: string;
    owner_name?: string;
    owner_email?: string;
    emails_last_n_days: number;
    calls_last_n_days: number;
    meetings_last_n_days: number;
    new_deals_last_n_days: number;
  }>;
  days: number;
}

export default function SalesScoreboard({ data, days }: Props) {
  const [sortField, setSortField] = useState<SortField>("overallScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Transform raw data into KPI format with calculated scores
  const kpiData: SalespersonKPI[] = useMemo(() => {
    return data.map((person, idx) => {
      // Simulate additional KPIs (in production, these would come from API)
      const revenue = Math.round((person.new_deals_last_n_days * (3000 + Math.random() * 7000)));
      const closeRate = 15 + Math.random() * 25;
      const avgDealSize = revenue / Math.max(1, person.new_deals_last_n_days);
      const responseTime = 0.5 + Math.random() * 8;
      const followUpRate = 50 + Math.random() * 45;

      // Calculate scores
      const activityScore = Math.min(100, (
        (person.emails_last_n_days / 50) * 30 +
        (person.calls_last_n_days / 40) * 35 +
        (person.meetings_last_n_days / 15) * 35
      ) * 100 / 100);

      const performanceScore = Math.min(100, (
        (person.new_deals_last_n_days / 8) * 40 +
        (closeRate / 30) * 30 +
        (revenue / 50000) * 30
      ) * 100 / 100);

      const overallScore = activityScore * 0.4 + performanceScore * 0.6;

      return {
        id: person.owner_id,
        name: person.owner_name || "Unknown",
        email: person.owner_email || "",
        emails: person.emails_last_n_days,
        calls: person.calls_last_n_days,
        meetings: person.meetings_last_n_days,
        deals: person.new_deals_last_n_days,
        revenue,
        closeRate,
        avgDealSize,
        responseTime,
        followUpRate,
        activityScore,
        performanceScore,
        overallScore,
      };
    });
  }, [data]);

  // Sort data
  const sortedData = useMemo(() => {
    return [...kpiData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;

      return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
    });
  }, [kpiData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortHeader = ({ field, label, className = "" }: { field: SortField; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortField === field && (
          <svg className={`w-4 h-4 transition-transform ${sortDirection === "asc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </th>
  );

  // Calculate team averages
  const teamAverages = useMemo(() => {
    if (kpiData.length === 0) return null;
    const sum = (key: keyof SalespersonKPI) => kpiData.reduce((acc, p) => acc + (Number(p[key]) || 0), 0);
    const avg = (key: keyof SalespersonKPI) => sum(key) / kpiData.length;

    return {
      emails: avg("emails"),
      calls: avg("calls"),
      meetings: avg("meetings"),
      deals: avg("deals"),
      revenue: avg("revenue"),
      closeRate: avg("closeRate"),
      overallScore: avg("overallScore"),
    };
  }, [kpiData]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400 font-medium">Performance Tiers:</span>
        {(["excellent", "good", "average", "poor"] as PerformanceTier[]).map((tier) => (
          <div key={tier} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${tierColors[tier].bg} ${tierColors[tier].border} border`} />
            <span className="capitalize text-gray-600 dark:text-gray-400">{tier}</span>
          </div>
        ))}
      </div>

      {/* Team Averages Summary */}
      {teamAverages && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Avg Emails", value: teamAverages.emails, field: "emails" },
            { label: "Avg Calls", value: teamAverages.calls, field: "calls" },
            { label: "Avg Meetings", value: teamAverages.meetings, field: "meetings" },
            { label: "Avg Deals", value: teamAverages.deals, field: "deals" },
            { label: "Avg Revenue", value: teamAverages.revenue, field: "revenue", format: "currency" as const },
            { label: "Avg Close Rate", value: teamAverages.closeRate, field: "closeRate", format: "percent" as const },
            { label: "Team Score", value: teamAverages.overallScore, field: "overallScore" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</div>
              <ColoredCell value={stat.value} field={stat.field} format={stat.format} />
            </div>
          ))}
        </div>
      )}

      {/* Scoreboard Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
                  #
                </th>
                <SortHeader field="name" label="Name" className="min-w-[150px]" />
                <SortHeader field="overallScore" label="Score" />
                <SortHeader field="emails" label="Emails" />
                <SortHeader field="calls" label="Calls" />
                <SortHeader field="meetings" label="Meetings" />
                <SortHeader field="deals" label="Deals" />
                <SortHeader field="revenue" label="Revenue" />
                <SortHeader field="closeRate" label="Close %" />
                <SortHeader field="activityScore" label="Activity" />
                <SortHeader field="performanceScore" label="Performance" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sortedData.map((person, idx) => {
                const isExpanded = expandedRow === person.id;
                const rank = idx + 1;

                return (
                  <>
                    <tr
                      key={person.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        rank <= 3 ? "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10" : ""
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : person.id)}
                    >
                      <td className="px-3 py-4">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          rank === 1 ? "bg-amber-400 text-amber-900" :
                          rank === 2 ? "bg-gray-300 text-gray-700" :
                          rank === 3 ? "bg-amber-600 text-amber-100" :
                          "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}>
                          {rank}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{person.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{person.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="w-32">
                          <ScoreBar score={person.overallScore} />
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.emails} field="emails" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.calls} field="calls" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.meetings} field="meetings" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.deals} field="deals" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.revenue} field="revenue" format="currency" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.closeRate} field="closeRate" format="percent" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.activityScore} field="activityScore" />
                      </td>
                      <td className="px-3 py-4">
                        <ColoredCell value={person.performanceScore} field="performanceScore" />
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr key={`${person.id}-details`} className="bg-gray-50/50 dark:bg-gray-900/30">
                        <td colSpan={11} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Deal Size</div>
                              <ColoredCell value={person.avgDealSize} field="avgDealSize" format="currency" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response Time</div>
                              <ColoredCell value={person.responseTime} field="responseTime" format="hours" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Follow-up Rate</div>
                              <ColoredCell value={person.followUpRate} field="followUpRate" format="percent" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Activities</div>
                              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                {person.emails + person.calls + person.meetings}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          {(["excellent", "good", "average", "poor"] as PerformanceTier[]).map((tier) => {
            const count = sortedData.filter(p => getTier(p.overallScore, "overallScore") === tier).length;
            const percentage = (count / sortedData.length) * 100;

            return (
              <div key={tier} className={`rounded-xl p-4 ${tierColors[tier].bg} ${tierColors[tier].border} border`}>
                <div className={`text-2xl font-bold ${tierColors[tier].text}`}>{count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{tier}</div>
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      tier === "excellent" ? "bg-emerald-500" :
                      tier === "good" ? "bg-blue-500" :
                      tier === "average" ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage.toFixed(0)}% of team</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
