// src/pages/LeaderboardPage.tsx
import { useEffect, useState } from "react";
import {
  getLeaderboard,
  getMyBadges,
  getGamificationOverview,
  LeaderboardResponse,
  UserBadges,
  GamificationOverview,
  Badge,
} from "../utils/api";

// Badge icon mapping
function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    trophy: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    "check-circle": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "lightning-bolt": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    "currency-dollar": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    star: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    fire: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    target: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    "trending-up": (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    sparkles: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  };

  return <>{icons[icon] || icons.star}</>;
}

const badgeColors: Record<string, string> = {
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
  green: "bg-green-100 text-green-700 border-green-300",
  purple: "bg-purple-100 text-purple-700 border-purple-300",
  blue: "bg-blue-100 text-blue-700 border-blue-300",
  gold: "bg-amber-100 text-amber-700 border-amber-300",
  orange: "bg-orange-100 text-orange-700 border-orange-300",
  red: "bg-red-100 text-red-700 border-red-300",
  teal: "bg-teal-100 text-teal-700 border-teal-300",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
};

function BadgeCard({ badge, earned = false }: { badge: Badge; earned?: boolean }) {
  const colorClass = badgeColors[badge.color] || badgeColors.blue;

  return (
    <div
      className={`p-3 rounded-lg border-2 transition-all ${
        earned
          ? `${colorClass} shadow-sm`
          : "bg-gray-50 text-gray-400 border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${earned ? "bg-white/50" : "bg-gray-200"}`}>
          <BadgeIcon icon={badge.icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${earned ? "" : "text-gray-500"}`}>
            {badge.name}
          </p>
          <p className={`text-xs ${earned ? "opacity-80" : "text-gray-400"}`}>
            {badge.description}
          </p>
        </div>
        {!earned && badge.progress !== undefined && badge.progress > 0 && (
          <div className="w-12 text-center">
            <div className="text-xs font-medium text-gray-500">
              {badge.progress.toFixed(0)}%
            </div>
            <div className="h-1 bg-gray-200 rounded-full mt-1">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${badge.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(value: number, metric: string): string {
  if (metric === "revenue") {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (metric === "close_rate") {
    return `${value.toFixed(1)}%`;
  }
  return value.toLocaleString();
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-white font-bold shadow-lg">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold shadow">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold shadow">
        3
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [badges, setBadges] = useState<UserBadges | null>(null);
  const [overview, setOverview] = useState<GamificationOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<"revenue" | "deals" | "activities" | "close_rate">("revenue");
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");

  useEffect(() => {
    loadData();
  }, [metric, period]);

  async function loadData() {
    try {
      setLoading(true);
      const [lb, bg, ov] = await Promise.all([
        getLeaderboard({ metric, period }),
        getMyBadges(),
        getGamificationOverview(),
      ]);
      setLeaderboard(lb);
      setBadges(bg);
      setOverview(ov);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500">Track your progress and compete with the team</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="revenue">Revenue</option>
            <option value="deals">Deals Closed</option>
            <option value="activities">Activities</option>
            <option value="close_rate">Close Rate</option>
          </select>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-4 text-white">
            <p className="text-blue-100 text-sm">Your Rank</p>
            <p className="text-3xl font-bold">#{overview.current_rank}</p>
            <p className="text-blue-100 text-xs">of {overview.total_participants}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Points This Month</p>
            <p className="text-2xl font-bold text-gray-900">{overview.points_this_month.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Badges Earned</p>
            <p className="text-2xl font-bold text-purple-600">{overview.badges_earned}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-500 text-sm">Active Streak</p>
            <p className="text-2xl font-bold text-orange-600">{overview.streak_days} days</p>
          </div>
          <div className="col-span-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-4 text-white">
            <p className="text-purple-100 text-sm">Next Badge</p>
            {badges?.in_progress_badges[0] ? (
              <div className="flex items-center gap-2 mt-1">
                <BadgeIcon icon={badges.in_progress_badges[0].icon} className="w-5 h-5" />
                <span className="font-medium">{badges.in_progress_badges[0].name}</span>
                <span className="text-purple-200 text-sm">
                  ({badges.in_progress_badges[0].progress?.toFixed(0)}%)
                </span>
              </div>
            ) : (
              <p className="font-medium mt-1">All badges earned!</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {leaderboard?.metric_label} - {leaderboard?.period_label}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {leaderboard?.entries.map((entry) => (
              <div
                key={entry.user_id}
                className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                  entry.rank <= 3 ? "bg-gradient-to-r from-yellow-50/50 to-transparent" : "hover:bg-gray-50"
                }`}
              >
                <RankBadge rank={entry.rank} />
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${entry.avatar_color}`}
                >
                  {entry.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{entry.display_name}</p>
                  <p className="text-sm text-gray-500 truncate">{entry.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatValue(entry.value, leaderboard.metric)}
                  </p>
                  {entry.change !== 0 && (
                    <p
                      className={`text-sm ${
                        entry.change > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {entry.change > 0 ? "+" : ""}
                      {entry.change}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {leaderboard?.entries.length === 0 && (
              <div className="px-5 py-12 text-center text-gray-500">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Badges Section */}
        <div className="space-y-6">
          {/* Earned Badges */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Your Badges</h3>
              <span className="text-sm text-gray-500">{badges?.total_points} pts</span>
            </div>
            <div className="p-4 space-y-3">
              {badges?.earned_badges.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No badges earned yet. Keep going!
                </p>
              ) : (
                badges?.earned_badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} earned />
                ))
              )}
            </div>
          </div>

          {/* In Progress */}
          {badges?.in_progress_badges && badges.in_progress_badges.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">In Progress</h3>
              </div>
              <div className="p-4 space-y-3">
                {badges.in_progress_badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow p-5 text-white">
            <h3 className="font-semibold mb-4">Leaderboard Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Participants</span>
                <span className="font-medium">{leaderboard?.total_participants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Period</span>
                <span className="font-medium">{leaderboard?.period_label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="font-medium">
                  {leaderboard?.last_updated
                    ? new Date(leaderboard.last_updated).toLocaleTimeString()
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
