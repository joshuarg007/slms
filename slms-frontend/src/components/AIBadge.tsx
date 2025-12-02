// src/components/AIBadge.tsx
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface AIBadgeProps {
  type: "hot" | "warm" | "cold" | "risk" | "opportunity" | "trending" | "priority" | "insight";
  tooltip?: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const badgeConfig = {
  hot: {
    label: "AI: Hot Lead",
    shortLabel: "Hot",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    hoverBg: "hover:bg-red-200 dark:hover:bg-red-900/50",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  },
  warm: {
    label: "AI: Warming Up",
    shortLabel: "Warm",
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
    hoverBg: "hover:bg-orange-200 dark:hover:bg-orange-900/50",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707",
  },
  cold: {
    label: "AI: Needs Nurturing",
    shortLabel: "Cold",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    hoverBg: "hover:bg-blue-200 dark:hover:bg-blue-900/50",
    icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  },
  risk: {
    label: "AI: At Risk",
    shortLabel: "Risk",
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    hoverBg: "hover:bg-red-200 dark:hover:bg-red-900/50",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  opportunity: {
    label: "AI: High Opportunity",
    shortLabel: "Opportunity",
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    hoverBg: "hover:bg-green-200 dark:hover:bg-green-900/50",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  trending: {
    label: "AI: Trending Up",
    shortLabel: "Trending",
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-300",
    hoverBg: "hover:bg-purple-200 dark:hover:bg-purple-900/50",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  priority: {
    label: "AI: High Priority",
    shortLabel: "Priority",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    hoverBg: "hover:bg-amber-200 dark:hover:bg-amber-900/50",
    icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
  insight: {
    label: "AI Insight",
    shortLabel: "AI",
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
    hoverBg: "hover:bg-indigo-200 dark:hover:bg-indigo-900/50",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
};

export default function AIBadge({ type, tooltip, size = "sm", showIcon = true }: AIBadgeProps) {
  const config = badgeConfig[type];
  const sizeClasses = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <Link
      to="/app/chat"
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${config.hoverBg} ${sizeClasses} transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-sm`}
      title={tooltip || config.label}
    >
      {showIcon && (
        <svg className={`${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} transition-transform duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
        </svg>
      )}
      {config.shortLabel}
    </Link>
  );
}

// Inline AI prediction component
export function AIPrediction({
  label,
  value,
  confidence,
  trend,
}: {
  label: string;
  value: string;
  confidence?: number;
  trend?: "up" | "down" | "stable";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 transition-all duration-500 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      }`}
    >
      <svg className="w-4 h-4 text-indigo-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animationDuration: "3s" }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{value}</span>
        {trend && (
          <svg
            className={`w-3 h-3 transition-transform duration-300 ${
              trend === "up" ? "text-green-500 -translate-y-0.5" : trend === "down" ? "text-red-500 translate-y-0.5" : "text-gray-400"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={trend === "up" ? "M5 10l7-7m0 0l7 7m-7-7v18" : trend === "down" ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 12h14"}
            />
          </svg>
        )}
        {confidence && (
          <span className="text-[10px] text-gray-400">({confidence}% conf)</span>
        )}
      </div>
    </div>
  );
}

// AI Score Ring with smooth animation
export function AIScoreRing({ score, label, size = "md" }: { score: number; label?: string; size?: "sm" | "md" | "lg" }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      // Animate score from 0 to target
      const duration = 1000;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedScore(Math.round(score * eased));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "stroke-green-500", text: "text-green-600", glow: "shadow-green-500/20" };
    if (s >= 60) return { stroke: "stroke-blue-500", text: "text-blue-600", glow: "shadow-blue-500/20" };
    if (s >= 40) return { stroke: "stroke-yellow-500", text: "text-yellow-600", glow: "shadow-yellow-500/20" };
    return { stroke: "stroke-red-500", text: "text-red-600", glow: "shadow-red-500/20" };
  };

  const colors = getColor(score);
  const sizeConfig = {
    sm: { size: 32, stroke: 3, text: "text-xs" },
    md: { size: 48, stroke: 4, text: "text-sm" },
    lg: { size: 64, stroke: 5, text: "text-lg" },
  };
  const cfg = sizeConfig[size];
  const radius = (cfg.size - cfg.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <Link
      to="/app/chat"
      className={`relative inline-flex items-center justify-center group transition-all duration-300 hover:scale-110 ${mounted ? "opacity-100" : "opacity-0"}`}
      title="AI Score - Click for details"
    >
      <svg width={cfg.size} height={cfg.size} className="transform -rotate-90 transition-transform duration-300 group-hover:rotate-[-85deg]">
        <circle
          cx={cfg.size / 2}
          cy={cfg.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={cfg.stroke}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={cfg.size / 2}
          cy={cfg.size / 2}
          r={radius}
          fill="none"
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${colors.stroke} transition-all duration-700 ease-out drop-shadow-sm`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${colors.text} ${cfg.text} transition-all duration-300`}>{animatedScore}</span>
        {label && <span className="text-[8px] text-gray-400 uppercase tracking-wide">{label}</span>}
      </div>
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all duration-200">
        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707" />
        </svg>
      </div>
    </Link>
  );
}

// AI Recommendation Card with smooth entrance
export function AIRecommendationCard({
  title,
  description,
  impact,
  actionLabel = "Apply",
  onAction,
}: {
  title: string;
  description: string;
  impact: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`p-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-900/20 dark:via-gray-800 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 transition-all duration-500 ease-out hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25 transition-transform duration-300 hover:scale-110 hover:rotate-3">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">AI Recommendation</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full transition-colors duration-200">{impact}</span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onAction}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/25 active:scale-95"
            >
              {actionLabel}
            </button>
            <Link
              to="/app/chat"
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors duration-200"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
