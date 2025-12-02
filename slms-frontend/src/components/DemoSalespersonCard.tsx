// src/components/DemoSalespersonCard.tsx
// Profile cards for demo salespeople with their philosophy and stats

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DemoSalesperson, SalesWisdom } from "@/data/demoSalespeople";

interface DemoSalespersonCardProps {
  person: DemoSalesperson;
  rank?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showPhilosophy?: boolean;
  variant?: "compact" | "full" | "leaderboard";
  className?: string;
}

export default function DemoSalespersonCard({
  person,
  rank,
  isExpanded = false,
  onToggleExpand,
  showPhilosophy = true,
  variant = "compact",
  className = "",
}: DemoSalespersonCardProps) {
  const [wisdomIndex, setWisdomIndex] = useState(0);

  const currentWisdom = person.wisdom[wisdomIndex];

  const cycleWisdom = () => {
    setWisdomIndex((prev) => (prev + 1) % person.wisdom.length);
  };

  // Difficulty stars
  const DifficultyStars = () => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i < person.difficulty ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );

  // Stat bars
  const StatBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">{value}</span>
    </div>
  );

  if (variant === "leaderboard") {
    return (
      <div
        className={`flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${className}`}
        onClick={onToggleExpand}
      >
        {rank && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
              rank === 1
                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-lg shadow-amber-500/30"
                : rank === 2
                ? "bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-lg shadow-gray-400/30"
                : rank === 3
                ? "bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            }`}
          >
            {rank}
          </div>
        )}

        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold ${person.avatar_color}`}>
          {person.display_name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white">{person.display_name}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
              Demo
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{person.title}</p>
        </div>

        <div className="text-right">
          <DifficultyStars />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{person.archetype}</p>
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className={`p-6 bg-gradient-to-r ${person.avatar_color.replace("bg-", "from-")} to-gray-900`}>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl font-bold text-white">
              {person.display_name.charAt(0)}
            </div>
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{person.display_name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">Demo</span>
              </div>
              <p className="text-white/80">{person.title}</p>
              <div className="flex items-center gap-4 mt-2">
                <DifficultyStars />
                <span className="text-sm text-white/60">Level {person.difficulty}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Archetype & Philosophy */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium">
                {person.archetype}
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                {person.specialty}
              </span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-medium italic">
              "{person.philosophy}"
            </p>
          </div>

          {/* Pareto Focus */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-600 dark:text-amber-400 text-lg">⚡</span>
              <span className="font-semibold text-amber-800 dark:text-amber-200">Pareto Focus (20% → 80%)</span>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">{person.pareto_focus}</p>
          </div>

          {/* Signature Move */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">Signature Move</span>
            </div>
            <p className="text-indigo-700 dark:text-indigo-300 font-medium">{person.signatureMove}</p>
          </div>

          {/* Stats */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Fighting Stats</h3>
            <StatBar label="Close Rate" value={person.base_stats.close_rate} color="bg-emerald-500" />
            <StatBar label="Activity" value={person.base_stats.activity_volume} color="bg-blue-500" />
            <StatBar label="Deal Size" value={person.base_stats.deal_size} color="bg-purple-500" />
            <StatBar label="Speed" value={person.base_stats.speed} color="bg-orange-500" />
            <StatBar label="Consistency" value={person.base_stats.consistency} color="bg-pink-500" />
          </div>

          {/* Wisdom */}
          {person.wisdom.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Words of Wisdom</h3>
                {person.wisdom.length > 1 && (
                  <button
                    onClick={cycleWisdom}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Next quote →
                  </button>
                )}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={wisdomIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                >
                  <p className="text-gray-700 dark:text-gray-300 italic">"{currentWisdom.quote}"</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">— {currentWisdom.author}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Unlock Message */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🏆</span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">Beat {person.display_name.split(" ")[0]}</span>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{person.unlock_message}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Compact variant
  return (
    <div
      className={`p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer ${className}`}
      onClick={onToggleExpand}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold ${person.avatar_color}`}
        >
          {person.display_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white truncate">{person.display_name}</span>
            <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              Demo
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{person.archetype}</p>
        </div>
        <DifficultyStars />
      </div>

      {showPhilosophy && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2 line-clamp-2">
          "{person.philosophy}"
        </p>
      )}
    </div>
  );
}

// Demo Team Mute Toggle
export function DemoTeamToggle({
  showDemoTeam,
  onToggle,
  canMute = true,
  variant = "switch",
}: {
  showDemoTeam: boolean;
  onToggle: () => void;
  canMute?: boolean;
  variant?: "switch" | "button" | "minimal";
}) {
  if (!canMute && showDemoTeam) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
        Demo team active (add 3+ team members to hide)
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={onToggle}
        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
        title={showDemoTeam ? "Hide demo salespeople" : "Show demo salespeople"}
      >
        {showDemoTeam ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Hide demo team
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Show demo team
          </>
        )}
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          showDemoTeam
            ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        {showDemoTeam ? "Demo Team: ON" : "Demo Team: OFF"}
      </button>
    );
  }

  // Switch variant
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span className="text-sm text-gray-600 dark:text-gray-400">Demo Team</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={showDemoTeam}
          onChange={onToggle}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${
            showDemoTeam ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
              showDemoTeam ? "translate-x-5" : "translate-x-1"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
