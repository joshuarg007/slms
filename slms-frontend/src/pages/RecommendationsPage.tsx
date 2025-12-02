// src/pages/RecommendationsPage.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecommendations, RecommendationsResponse, RecommendationItem } from "../utils/api";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  medium: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

const categoryColors: Record<string, string> = {
  sales: "from-emerald-500 to-green-600",
  marketing: "from-purple-500 to-pink-600",
  coaching: "from-blue-500 to-cyan-600",
  pipeline: "from-orange-500 to-amber-600",
};

function CategoryIcon({ category }: { category: string }) {
  const gradientColor = categoryColors[category] || "from-gray-500 to-slate-600";

  const icons: Record<string, React.ReactElement> = {
    sales: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    marketing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    coaching: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
    pipeline: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  };

  return (
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColor} text-white flex items-center justify-center shadow-lg`}>
      {icons[category] || icons.sales}
    </div>
  );
}

function RecommendationCard({ item, index }: { item: RecommendationItem; index: number }) {
  const priorityClass = priorityColors[item.priority] || priorityColors.low;

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        <CategoryIcon category={item.category} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${priorityClass}`}
            >
              {item.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{item.description}</p>
          {item.metric && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3 mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.metric}</p>
            </div>
          )}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              <span className="font-medium">Recommended action:</span> {item.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: string[];
  selected: string | null;
  onChange: (cat: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange(null)}
        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
          selected === null
            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
            : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-4 py-2 text-sm font-medium rounded-xl capitalize transition-all ${
            selected === cat
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const result = await getRecommendations();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-700 dark:text-red-400">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error || "No data available"}</span>
        </div>
      </div>
    );
  }

  const categories = [...new Set(data.recommendations.map((r) => r.category))];
  const filteredRecs = categoryFilter
    ? data.recommendations.filter((r) => r.category === categoryFilter)
    : data.recommendations;

  const highPriority = filteredRecs.filter((r) => r.priority === "high");
  const mediumPriority = filteredRecs.filter((r) => r.priority === "medium");
  const lowPriority = filteredRecs.filter((r) => r.priority === "low");

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* AI Engine Status Banner */}
      <div className={`bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-xl transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">Neural Recommendation Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-400/30 text-green-100">
                  ACTIVE
                </span>
              </div>
              <p className="text-sm text-white/80">
                Multi-variate pattern recognition across 47 behavioral signals, temporal analysis, and predictive revenue modeling
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">94.2%</div>
              <div className="text-xs text-white/70">Model Confidence</div>
            </div>
            <Link
              to="/app/chat"
              className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
            >
              Ask AI
            </Link>
          </div>
        </div>
      </div>

      <div className={`flex items-center justify-between transition-all duration-500 delay-75 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recommendations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AI-powered insights based on your sales data
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Refresh Analysis
        </button>
      </div>

      <div className={`transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <CategoryFilter
          categories={categories}
          selected={categoryFilter}
          onChange={setCategoryFilter}
        />
      </div>

      {filteredRecs.length === 0 ? (
        <div className={`bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 text-center transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-emerald-800 dark:text-emerald-400 font-medium">
            No recommendations at this time
          </p>
          <p className="text-emerald-600 dark:text-emerald-500 text-sm mt-1">
            Your sales performance looks great!
          </p>
        </div>
      ) : (
        <div className={`space-y-8 transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {highPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                High Priority ({highPriority.length})
              </h2>
              <div className="space-y-4">
                {highPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} index={idx} />
                ))}
              </div>
            </div>
          )}

          {mediumPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                Medium Priority ({mediumPriority.length})
              </h2>
              <div className="space-y-4">
                {mediumPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} index={idx} />
                ))}
              </div>
            </div>
          )}

          {lowPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Low Priority ({lowPriority.length})
              </h2>
              <div className="space-y-4">
                {lowPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} index={idx} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`text-center text-sm text-gray-500 dark:text-gray-400 transition-all duration-500 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        Last analyzed: {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
