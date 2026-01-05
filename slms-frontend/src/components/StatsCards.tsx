// src/components/StatsCards.tsx
import React, { useMemo } from "react";

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
  rows: Row[];
  days: number;
};

// Get initials from name or email
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
}

// Generate consistent color from string
function getAvatarColor(str: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
    "from-lime-500 to-green-600",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Progress bar component
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Stat row component
function StatRow({
  icon,
  label,
  value,
  max,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${bgColor}`}>{icon}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      </div>
      <ProgressBar value={value} max={max} color={color} />
    </div>
  );
}

// Rank badge component
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white text-xs font-bold">🥇</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white text-xs font-bold">🥈</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-700 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white text-xs font-bold">🥉</span>
      </div>
    );
  }
  return (
    <div className="absolute -top-2 -right-2 w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
      <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold">#{rank}</span>
    </div>
  );
}

// Icons
const icons = {
  email: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  call: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  meeting: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  deal: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Format time period label
function formatTimePeriod(days: number): string {
  if (days === 0) return "All time";
  if (days === 1) return "Today";
  if (days === 7) return "This week";
  if (days === 30) return "This month";
  if (days === 90) return "Last 3 months";
  if (days === 180) return "Last 6 months";
  if (days === 365) return "This year";
  if (days === 730) return "Last 2 years";
  if (days === 1825) return "Last 5 years";
  return `Last ${days} days`;
}

export default function StatsCards({ rows, days }: Props) {
  // Calculate stats and rankings
  const { rankedRows, maxStats, totals, teamAvg } = useMemo(() => {
    const maxStats = {
      emails: Math.max(...rows.map((r) => r.emails_last_n_days || 0), 1),
      calls: Math.max(...rows.map((r) => r.calls_last_n_days || 0), 1),
      meetings: Math.max(...rows.map((r) => r.meetings_last_n_days || 0), 1),
      deals: Math.max(...rows.map((r) => r.new_deals_last_n_days || 0), 1),
    };

    const totals = rows.reduce(
      (acc, r) => {
        acc.emails += r.emails_last_n_days || 0;
        acc.calls += r.calls_last_n_days || 0;
        acc.meetings += r.meetings_last_n_days || 0;
        acc.deals += r.new_deals_last_n_days || 0;
        return acc;
      },
      { emails: 0, calls: 0, meetings: 0, deals: 0 }
    );

    const teamAvg = rows.length > 0 ? {
      emails: totals.emails / rows.length,
      calls: totals.calls / rows.length,
      meetings: totals.meetings / rows.length,
      deals: totals.deals / rows.length,
    } : { emails: 0, calls: 0, meetings: 0, deals: 0 };

    const rankedRows = rows
      .map((r) => ({
        ...r,
        totalScore:
          (r.emails_last_n_days || 0) +
          (r.calls_last_n_days || 0) * 2 +
          (r.meetings_last_n_days || 0) * 3 +
          (r.new_deals_last_n_days || 0) * 5,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return { rankedRows, maxStats, totals, teamAvg };
  }, [rows]);

  const timePeriod = formatTimePeriod(days);

  return (
    <div className="space-y-6">
      {/* Team Summary Header */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Team Performance</h2>
            <p className="text-white/80 text-sm mt-1">{timePeriod} • {rows.length} team member{rows.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totals.emails.toLocaleString()}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Emails</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totals.calls.toLocaleString()}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totals.meetings.toLocaleString()}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Meetings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totals.deals.toLocaleString()}</div>
              <div className="text-xs text-white/70 uppercase tracking-wide">Deals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {rankedRows.map((row) => {
          const name = row.owner_name || row.owner_email || "Unknown";
          const initials = getInitials(row.owner_name, row.owner_email);
          const avatarColor = getAvatarColor(row.owner_id);
          const aboveAvg = row.totalScore > (teamAvg.emails + teamAvg.calls * 2 + teamAvg.meetings * 3 + teamAvg.deals * 5);

          return (
            <div
              key={row.owner_id}
              className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              {/* Rank Badge */}
              <RankBadge rank={row.rank} />

              {/* Card Header */}
              <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform`}>
                    {initials}
                  </div>
                  {/* Name & Performance */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {name}
                    </h3>
                    {row.owner_email && row.owner_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {row.owner_email}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {aboveAvg ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                          Above avg
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          Average
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {row.totalScore.toLocaleString()} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-5 space-y-4">
                <StatRow
                  icon={<span className="text-blue-600 dark:text-blue-400">{icons.email}</span>}
                  label="Emails"
                  value={row.emails_last_n_days || 0}
                  max={maxStats.emails}
                  color="bg-gradient-to-r from-blue-400 to-blue-600"
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                />
                <StatRow
                  icon={<span className="text-emerald-600 dark:text-emerald-400">{icons.call}</span>}
                  label="Calls"
                  value={row.calls_last_n_days || 0}
                  max={maxStats.calls}
                  color="bg-gradient-to-r from-emerald-400 to-emerald-600"
                  bgColor="bg-emerald-100 dark:bg-emerald-900/30"
                />
                <StatRow
                  icon={<span className="text-purple-600 dark:text-purple-400">{icons.meeting}</span>}
                  label="Meetings"
                  value={row.meetings_last_n_days || 0}
                  max={maxStats.meetings}
                  color="bg-gradient-to-r from-purple-400 to-purple-600"
                  bgColor="bg-purple-100 dark:bg-purple-900/30"
                />
                <StatRow
                  icon={<span className="text-amber-600 dark:text-amber-400">{icons.deal}</span>}
                  label="Deals Won"
                  value={row.new_deals_last_n_days || 0}
                  max={maxStats.deals}
                  color="bg-gradient-to-r from-amber-400 to-amber-600"
                  bgColor="bg-amber-100 dark:bg-amber-900/30"
                />
              </div>

              {/* Card Footer - Quick Stats */}
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Total activities
                  </span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {((row.emails_last_n_days || 0) + (row.calls_last_n_days || 0) + (row.meetings_last_n_days || 0) + (row.new_deals_last_n_days || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {rankedRows.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Connect your CRM to see salesperson performance cards here.
          </p>
        </div>
      )}
    </div>
  );
}
