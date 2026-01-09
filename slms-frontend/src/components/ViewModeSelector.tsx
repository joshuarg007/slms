// src/components/ViewModeSelector.tsx
// Switch between Executive, Sales, and Marketing views to emphasize relevant metrics

import { motion } from "framer-motion";
import { useGamification } from "@/contexts/GamificationContext";

type ViewMode = "executive" | "sales" | "marketing";

const VIEW_MODES: {
  value: ViewMode;
  label: string;
  icon: string;
  description: string;
  emphasis: string[];
}[] = [
  {
    value: "executive",
    label: "Executive",
    icon: "📈",
    description: "High-level metrics & ROI",
    emphasis: ["Revenue Impact", "Growth Trends", "Strategic KPIs"],
  },
  {
    value: "sales",
    label: "Sales",
    icon: "🎯",
    description: "Team performance & pipeline",
    emphasis: ["Team KPIs", "Pipeline Health", "Conversion Rates"],
  },
  {
    value: "marketing",
    label: "Marketing",
    icon: "📊",
    description: "Lead quality & campaign ROI",
    emphasis: ["Lead Sources", "Campaign Performance", "Attribution"],
  },
];

interface ViewModeSelectorProps {
  variant?: "tabs" | "dropdown" | "cards";
  showDescription?: boolean;
  className?: string;
}

export default function ViewModeSelector({
  variant = "tabs",
  showDescription = false,
  className = "",
}: ViewModeSelectorProps) {
  const { viewMode, setViewMode } = useGamification();

  if (variant === "dropdown") {
    return (
      <div className={`relative ${className}`}>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="appearance-none pl-10 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
        >
          {VIEW_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.icon} {mode.label}
            </option>
          ))}
        </select>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          {VIEW_MODES.find((m) => m.value === viewMode)?.icon}
        </div>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className={`grid grid-cols-3 gap-4 ${className}`}>
        {VIEW_MODES.map((mode) => (
          <motion.button
            key={mode.value}
            onClick={() => setViewMode(mode.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
              viewMode === mode.value
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-500/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            {viewMode === mode.value && (
              <motion.div
                layoutId="viewModeIndicator"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
              />
            )}
            <div className="relative">
              <div className="text-3xl mb-2">{mode.icon}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{mode.label}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mode.description}</p>
              {showDescription && (
                <div className="mt-3 space-y-1">
                  {mode.emphasis.map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    );
  }

  // Default: tabs
  return (
    <div className={`inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setViewMode(mode.value)}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            viewMode === mode.value
              ? "text-white"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          {viewMode === mode.value && (
            <motion.div
              layoutId="viewModePill"
              className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-md"
              transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// Helper hook to get view-specific content
export function useViewModeContent<T>(content: { executive: T; sales: T; marketing: T }): T {
  const { viewMode } = useGamification();
  return content[viewMode];
}

// Component to conditionally show content based on view mode
export function ViewModeContent({
  executive,
  sales,
  marketing,
  children,
}: {
  executive?: React.ReactNode;
  sales?: React.ReactNode;
  marketing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { viewMode } = useGamification();

  if (viewMode === "executive" && executive !== undefined) return <>{executive}</>;
  if (viewMode === "sales" && sales !== undefined) return <>{sales}</>;
  if (viewMode === "marketing" && marketing !== undefined) return <>{marketing}</>;
  return <>{children}</>;
}

// View-specific insight banner
export function ViewModeInsight({ className = "" }: { className?: string }) {
  const { viewMode } = useGamification();

  const insights: Record<ViewMode, { message: string; icon: string; color: string }> = {
    executive: {
      message: "Focus on ROI and strategic growth. Every lead captured is pipeline for tomorrow's revenue.",
      icon: "📈",
      color: "from-purple-500 to-indigo-600",
    },
    sales: {
      message: "Monitor your team's pipeline health. Coach the bottom 20% to lift the whole group.",
      icon: "🎯",
      color: "from-blue-500 to-cyan-600",
    },
    marketing: {
      message: "Track lead quality by source. The 80/20 rule: 20% of sources bring 80% of revenue.",
      icon: "📊",
      color: "from-emerald-500 to-teal-600",
    },
  };

  const current = insights[viewMode];

  return (
    <div className={`rounded-xl overflow-hidden ${className}`}>
      <div className={`bg-gradient-to-r ${current.color} px-4 py-3 text-white flex items-center gap-3`}>
        <span className="text-xl">{current.icon}</span>
        <p className="text-sm font-medium">{current.message}</p>
      </div>
    </div>
  );
}
