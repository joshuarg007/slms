// src/pages/RecommendationsPage.tsx
import React, { useEffect, useState } from "react";
import { getRecommendations, RecommendationsResponse, RecommendationItem } from "../utils/api";

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
};

const categoryIcons: Record<string, string> = {
  sales: "chart-bar",
  marketing: "megaphone",
  coaching: "academic-cap",
  pipeline: "funnel",
};

const categoryColors: Record<string, string> = {
  sales: "bg-green-500",
  marketing: "bg-purple-500",
  coaching: "bg-blue-500",
  pipeline: "bg-orange-500",
};

function CategoryIcon({ category }: { category: string }) {
  const bgColor = categoryColors[category] || "bg-gray-500";

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
    <div className={`w-10 h-10 rounded-full ${bgColor} text-white flex items-center justify-center`}>
      {icons[category] || icons.sales}
    </div>
  );
}

function RecommendationCard({ item }: { item: RecommendationItem }) {
  const priorityClass = priorityColors[item.priority] || priorityColors.low;

  return (
    <div className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <CategoryIcon category={item.category} />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{item.title}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityClass}`}
            >
              {item.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
          {item.metric && (
            <div className="bg-gray-50 rounded px-3 py-2 mb-3">
              <p className="text-sm font-medium text-gray-700">{item.metric}</p>
            </div>
          )}
          <div className="bg-blue-50 rounded px-3 py-2">
            <p className="text-sm text-blue-800">
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
        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
          selected === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 text-sm font-medium rounded-full capitalize transition-colors ${
            selected === cat
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

  const categories = [...new Set(data.recommendations.map((r) => r.category))];
  const filteredRecs = categoryFilter
    ? data.recommendations.filter((r) => r.category === categoryFilter)
    : data.recommendations;

  const highPriority = filteredRecs.filter((r) => r.priority === "high");
  const mediumPriority = filteredRecs.filter((r) => r.priority === "medium");
  const lowPriority = filteredRecs.filter((r) => r.priority === "low");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-sm text-gray-500">
            AI-powered insights based on your sales data
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh Analysis
        </button>
      </div>

      <CategoryFilter
        categories={categories}
        selected={categoryFilter}
        onChange={setCategoryFilter}
      />

      {filteredRecs.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-green-500 mx-auto mb-3"
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
          <p className="text-green-800 font-medium">
            No recommendations at this time
          </p>
          <p className="text-green-600 text-sm mt-1">
            Your sales performance looks great!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {highPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                High Priority ({highPriority.length})
              </h2>
              <div className="space-y-4">
                {highPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}

          {mediumPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Medium Priority ({mediumPriority.length})
              </h2>
              <div className="space-y-4">
                {mediumPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}

          {lowPriority.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Low Priority ({lowPriority.length})
              </h2>
              <div className="space-y-4">
                {lowPriority.map((item, idx) => (
                  <RecommendationCard key={idx} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        Last analyzed: {new Date(data.generated_at).toLocaleString()}
      </div>
    </div>
  );
}
