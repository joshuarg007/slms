// src/pages/LeaderboardPage.tsx
import { useEffect, useState, useMemo } from "react";
import {
  getLeaderboard,
  getMyBadges,
  getGamificationOverview,
  LeaderboardResponse,
  UserBadges,
  GamificationOverview,
  Badge,
} from "../utils/api";
import {
  RadialGauge,
  ProgressRing,
  ComparisonBar,
  AnimatedBarChart,
  GRADIENTS,
  CHART_COLORS,
} from "../components/charts";
import { useGamification } from "@/contexts/GamificationContext";
import { DemoTeamToggle } from "@/components/DemoSalespersonCard";
import { RotatingWisdom } from "@/components/WisdomTooltip";
import UnderdogCelebration, { ImprovementBadge } from "@/components/UnderdogCelebration";
import { isDemoSalesperson, getDemoSalesperson } from "@/data/demoSalespeople";

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
  yellow: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  green: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700",
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  gold: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700",
  red: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
  teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-300 dark:border-teal-700",
  emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  indigo: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700",
};

function BadgeCard({ badge, earned = false }: { badge: Badge; earned?: boolean }) {
  const colorClass = badgeColors[badge.color] || badgeColors.blue;

  return (
    <div
      className={`p-3 rounded-xl border-2 transition-all ${
        earned
          ? `${colorClass}`
          : "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${earned ? "bg-white/50 dark:bg-black/20" : "bg-gray-200 dark:bg-gray-700"}`}>
          <BadgeIcon icon={badge.icon} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${earned ? "" : "text-gray-500 dark:text-gray-400"}`}>
            {badge.name}
          </p>
          <p className={`text-xs ${earned ? "opacity-80" : "text-gray-400 dark:text-gray-500"}`}>
            {badge.description}
          </p>
        </div>
        {!earned && badge.progress !== undefined && badge.progress > 0 && (
          <div className="w-14 text-center">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {badge.progress.toFixed(0)}%
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
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
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/30 text-lg">
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold shadow-lg shadow-gray-400/30 text-lg">
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-600/30 text-lg">
        3
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-lg">
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
  const [mounted, setMounted] = useState(false);

  // Gamification context
  const { showDemoTeam, setShowDemoTeam, getDemoPerformance, underdogMoments, clearUnderdogMoment, canMuteDemoTeam } = useGamification();

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

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

  // Merge real and demo salespeople for leaderboard
  const mergedEntries = useMemo(() => {
    // Extended entry type for demo support
    type ExtendedEntry = {
      user_id: number;
      display_name: string;
      email: string;
      value: number;
      rank: number;
      change: number;
      avatar_color: string;
      streak?: number;
      isDemo?: boolean;
      demoId?: number;
    };

    let entries: ExtendedEntry[] = leaderboard?.entries.map(e => ({ ...e })) || [];

    // Add demo salespeople if enabled
    if (showDemoTeam) {
      const demoPerformance = getDemoPerformance();
      const demoEntries: ExtendedEntry[] = demoPerformance.map((perf) => {
        const person = getDemoSalesperson(perf.user_id);
        let value = 0;
        switch (metric) {
          case "revenue":
            value = perf.total_revenue;
            break;
          case "deals":
            value = perf.won_leads;
            break;
          case "activities":
            value = perf.total_activities || (perf.calls_count + perf.emails_count + perf.meetings_count);
            break;
          case "close_rate":
            value = perf.close_rate;
            break;
        }
        return {
          user_id: perf.user_id,
          display_name: person?.display_name || "Demo Salesperson",
          email: person?.archetype || "demo@site2crm.com",
          value,
          rank: 0,
          change: Math.floor(Math.random() * 3) - 1,
          avatar_color: person?.avatar_color || "bg-gradient-to-br from-amber-500 to-orange-600",
          isDemo: true,
          demoId: perf.user_id,
        };
      });

      entries = [...entries, ...demoEntries];
    }

    // Sort by value and assign ranks
    entries.sort((a, b) => b.value - a.value);
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }, [leaderboard, showDemoTeam, getDemoPerformance, metric]);

  // Get current underdog moment to celebrate
  const currentUnderdogMoment = underdogMoments[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-700 dark:text-red-400">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Underdog Celebration Modal */}
      {currentUnderdogMoment && (
        <UnderdogCelebration
          moment={currentUnderdogMoment}
          onClose={() => clearUnderdogMoment(currentUnderdogMoment.userId)}
        />
      )}

      {/* Header */}
      <div className={`space-y-4 transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your progress and compete with the team</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Demo Team Toggle */}
            <DemoTeamToggle
              showDemoTeam={showDemoTeam}
              onToggle={() => setShowDemoTeam(!showDemoTeam)}
              canMute={canMuteDemoTeam}
              variant="minimal"
            />
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
            >
              <option value="revenue">Revenue</option>
              <option value="deals">Deals Closed</option>
              <option value="activities">Activities</option>
              <option value="close_rate">Close Rate</option>
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 min-h-[44px]"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
        {/* Rotating Wisdom */}
        <RotatingWisdom />
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 transition-all duration-500 delay-75 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/25">
            <p className="text-indigo-100 text-sm">Your Rank</p>
            <p className="text-3xl font-bold mt-1">#{overview.current_rank}</p>
            <p className="text-indigo-200 text-xs mt-1">of {overview.total_participants}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Points This Month</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{overview.points_this_month.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Badges Earned</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{overview.badges_earned}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Active Streak</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{overview.streak_days} days</p>
          </div>
          <div className="col-span-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/25">
            <p className="text-purple-100 text-sm">Next Badge</p>
            {badges?.in_progress_badges[0] ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="p-2 bg-white/20 rounded-lg">
                  <BadgeIcon icon={badges.in_progress_badges[0].icon} className="w-5 h-5" />
                </div>
                <span className="font-medium">{badges.in_progress_badges[0].name}</span>
                <span className="text-purple-200 text-sm">
                  ({badges.in_progress_badges[0].progress?.toFixed(0)}%)
                </span>
              </div>
            ) : (
              <p className="font-medium mt-2">All badges earned!</p>
            )}
          </div>
        </div>
      )}

      {/* Performance Visualization */}
      {mergedEntries.length > 0 && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {/* Top Performers Bar Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Performance Comparison</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{leaderboard?.metric_label}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <AnimatedBarChart
                data={mergedEntries.slice(0, 6).map(e => ({
                  name: e.display_name.split(' ')[0],
                  value: e.value,
                }))}
                height={240}
                horizontal
                colors={CHART_COLORS.gradient}
                barRadius={6}
              />
            </div>
          </div>

          {/* Your Rank Visual */}
          {overview && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Progress</h3>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-around">
                  <RadialGauge
                    value={(1 - (overview.current_rank - 1) / Math.max(overview.total_participants - 1, 1)) * 100}
                    label="Rank Percentile"
                    sublabel={`#${overview.current_rank} of ${overview.total_participants}`}
                    size={160}
                    thickness={16}
                    gradient="indigo"
                  />
                  <div className="space-y-4 flex-1 max-w-xs ml-8">
                    <ComparisonBar
                      label="Points This Month"
                      value={overview.points_this_month}
                      maxValue={Math.max(overview.points_this_month * 1.5, 5000)}
                      gradient="purple"
                      formatValue={(v) => v.toLocaleString() + ' pts'}
                    />
                    <ComparisonBar
                      label="Badges Earned"
                      value={overview.badges_earned}
                      maxValue={15}
                      gradient="amber"
                      formatValue={(v) => v.toString()}
                    />
                    <ComparisonBar
                      label="Active Streak"
                      value={overview.streak_days}
                      maxValue={30}
                      gradient="emerald"
                      formatValue={(v) => v + ' days'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {leaderboard?.metric_label} - {leaderboard?.period_label}
                </h3>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {mergedEntries.map((entry, idx) => {
              const isDemo = (entry as any).isDemo;
              const demoPerson = isDemo ? getDemoSalesperson((entry as any).demoId) : null;
              return (
                <div
                  key={`${entry.user_id}-${isDemo ? 'demo' : 'real'}`}
                  className={`px-6 py-4 flex items-center gap-4 transition-all ${
                    entry.rank <= 3
                      ? "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent"
                      : isDemo
                        ? "bg-gradient-to-r from-indigo-50/30 to-transparent dark:from-indigo-900/10 dark:to-transparent hover:from-indigo-50/50 dark:hover:from-indigo-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <RankBadge rank={entry.rank} />
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold ${entry.avatar_color}`}
                  >
                    {isDemo ? "🎯" : entry.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{entry.display_name}</p>
                      {isDemo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                          DEMO
                        </span>
                      )}
                      {entry.rank <= 3 && !isDemo && (
                        <span className="text-amber-500 text-sm">⭐</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {isDemo ? demoPerson?.archetype : entry.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatValue(entry.value, leaderboard?.metric || metric)}
                    </p>
                    {entry.change !== 0 && (
                      <p
                        className={`text-sm font-medium ${
                          entry.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {entry.change > 0 ? "+" : ""}
                        {entry.change}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {mergedEntries.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Badges Section */}
        <div className="space-y-6">
          {/* Earned Badges */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Badges</h3>
              </div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{badges?.total_points} pts</span>
            </div>
            <div className="p-4 space-y-3">
              {badges?.earned_badges.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">In Progress</h3>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {badges.in_progress_badges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-4">Leaderboard Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Participants</span>
                <span className="font-medium">{mergedEntries.length}</span>
              </div>
              {showDemoTeam && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Demo Team</span>
                  <span className="font-medium text-indigo-400">9 members</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Period</span>
                <span className="font-medium">{leaderboard?.period_label}</span>
              </div>
              <div className="flex justify-between items-center">
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
