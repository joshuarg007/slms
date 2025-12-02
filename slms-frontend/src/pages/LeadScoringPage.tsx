// src/pages/LeadScoringPage.tsx
import { useEffect, useState } from "react";
import {
  getScoringInsights,
  getHotLeads,
  getAtRiskLeads,
  getScoredLeads,
  refreshAllScores,
  ScoringInsights,
  LeadScoreResponse,
  ScoredLeadsResponse,
} from "../utils/api";
import AIInsightWidget from "../components/AIInsightWidget";

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const getColor = (s: number) => {
    if (s >= 70) return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", ring: "ring-emerald-500" };
    if (s >= 50) return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", ring: "ring-amber-500" };
    if (s >= 30) return { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", ring: "ring-orange-500" };
    return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", ring: "ring-red-500" };
  };

  const colors = getColor(score);
  const sizeClass = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";

  return (
    <div
      className={`${sizeClass} rounded-2xl ${colors.bg} ${colors.text} font-bold flex items-center justify-center ring-2 ${colors.ring}`}
    >
      {score}
    </div>
  );
}

function WinProbBadge({ prob }: { prob: number }) {
  const getColor = () => {
    if (prob >= 70) return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    if (prob >= 40) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getColor()}`}>
      {prob}% win
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    contacted: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    qualified: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    proposal: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
    negotiation: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg text-xs font-medium capitalize ${colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"}`}>
      {status}
    </span>
  );
}

function LeadScoreCard({ lead, index }: { lead: LeadScoreResponse; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        <ScoreGauge score={lead.total_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{lead.lead_name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lead.lead_company || lead.lead_email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.lead_status} />
              <WinProbBadge prob={lead.win_probability} />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
            {[
              { label: "Engage", value: lead.engagement_score },
              { label: "Source", value: lead.source_score },
              { label: "Value", value: lead.value_score },
              { label: "Velocity", value: lead.velocity_score },
              { label: "Fit", value: lead.fit_score },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="font-bold text-gray-900 dark:text-white">{item.value}</div>
                <div className="text-gray-500 dark:text-gray-400">{item.label}</div>
              </div>
            ))}
          </div>

          {/* Next action */}
          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm">
            <span className="font-medium text-indigo-700 dark:text-indigo-400">Next: </span>
            <span className="text-indigo-600 dark:text-indigo-300">{lead.best_next_action}</span>
          </div>

          {/* Expand/collapse details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {lead.score_reasons.length > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Strengths:</p>
                  <ul className="text-xs text-emerald-600 dark:text-emerald-300 list-disc list-inside space-y-0.5">
                    {lead.score_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.risk_factors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Risks:</p>
                  <ul className="text-xs text-red-600 dark:text-red-300 list-disc list-inside space-y-0.5">
                    {lead.risk_factors.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.predicted_close_days && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Predicted close: ~{lead.predicted_close_days} days
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DistributionChart({ distribution }: { distribution: ScoringInsights["distribution"] }) {
  const total = distribution.hot + distribution.warm + distribution.cool + distribution.cold;

  const segments = [
    { label: "Hot", value: distribution.hot, color: "bg-emerald-500", lightBg: "bg-emerald-100 dark:bg-emerald-900/30" },
    { label: "Warm", value: distribution.warm, color: "bg-amber-500", lightBg: "bg-amber-100 dark:bg-amber-900/30" },
    { label: "Cool", value: distribution.cool, color: "bg-orange-500", lightBg: "bg-orange-100 dark:bg-orange-900/30" },
    { label: "Cold", value: distribution.cold, color: "bg-red-500", lightBg: "bg-red-100 dark:bg-red-900/30" },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Score Distribution</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="h-4 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-500`}
              style={{ width: `${(seg.value / Math.max(total, 1)) * 100}%` }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {segments.map((seg) => (
            <div key={seg.label} className={`text-center p-3 ${seg.lightBg} rounded-xl`}>
              <div className="font-bold text-gray-900 dark:text-white">{seg.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{seg.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LeadScoringPage() {
  const [insights, setInsights] = useState<ScoringInsights | null>(null);
  const [hotLeads, setHotLeads] = useState<LeadScoreResponse[]>([]);
  const [atRiskLeads, setAtRiskLeads] = useState<LeadScoreResponse[]>([]);
  const [allLeads, setAllLeads] = useState<ScoredLeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"hot" | "at-risk" | "all">("hot");
  const [error, setError] = useState<string | null>(null);
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
      const [insightsData, hot, atRisk, all] = await Promise.all([
        getScoringInsights(),
        getHotLeads(10),
        getAtRiskLeads(10),
        getScoredLeads({ limit: 50 }),
      ]);
      setInsights(insightsData);
      setHotLeads(hot);
      setAtRiskLeads(atRisk);
      setAllLeads(all);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scoring data");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRefreshing(true);
      await refreshAllScores();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh scores");
    } finally {
      setRefreshing(false);
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading lead scores...</p>
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

  const displayLeads =
    activeTab === "hot" ? hotLeads : activeTab === "at-risk" ? atRiskLeads : allLeads?.leads || [];

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      <div className={`flex items-center justify-between transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Scoring</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered lead prioritization</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all"
        >
          {refreshing ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Refreshing...
            </span>
          ) : (
            "Refresh All Scores"
          )}
        </button>
      </div>

      {/* Summary Cards */}
      {insights && (
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 transition-all duration-500 delay-75 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {[
            { label: "Active Leads", value: insights.total_active_leads, color: "gray" },
            { label: "Average Score", value: insights.avg_score, color: "blue" },
            { label: "Hot Leads", value: insights.hot_leads, color: "green" },
            { label: "At Risk", value: insights.at_risk_leads, color: "red" },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${
                stat.color === "green" ? "text-emerald-600 dark:text-emerald-400" :
                stat.color === "red" ? "text-red-600 dark:text-red-400" :
                stat.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                "text-gray-900 dark:text-white"
              }`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Insight */}
      <div className={`transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <AIInsightWidget
          variant="inline"
          insights={[
            { icon: "star", text: "Your hot leads from 'Google Ads' have a 45% higher win rate. Consider increasing spend on this channel." }
          ]}
          ctaText="Get AI Recommendations"
        />
      </div>

      {/* Distribution & Top Sources */}
      {insights && (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <DistributionChart distribution={insights.distribution} />
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Sources by Score</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {insights.top_sources.map((source, idx) => (
                <div
                  key={source.source}
                  className="flex items-center gap-4"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-900 dark:text-white">{source.source}</span>
                      <span className="text-gray-500 dark:text-gray-400">{source.count} leads</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${source.avg_score}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white w-12 text-right">
                    {source.avg_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lead Lists */}
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-500 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="border-b border-gray-100 dark:border-gray-800">
          <nav className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-800/50">
            {[
              { id: "hot" as const, label: "Hot Leads", count: hotLeads.length },
              { id: "at-risk" as const, label: "At Risk", count: atRiskLeads.length },
              { id: "all" as const, label: "All Leads", count: allLeads?.total_count || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {displayLeads.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No leads found</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayLeads.map((lead, idx) => (
                <LeadScoreCard key={lead.lead_id} lead={lead} index={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
