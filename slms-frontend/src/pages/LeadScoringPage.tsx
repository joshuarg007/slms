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

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const getColor = (s: number) => {
    if (s >= 70) return { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-500" };
    if (s >= 50) return { bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-500" };
    if (s >= 30) return { bg: "bg-orange-100", text: "text-orange-700", ring: "ring-orange-500" };
    return { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-500" };
  };

  const colors = getColor(score);
  const sizeClass = size === "lg" ? "w-16 h-16 text-xl" : "w-10 h-10 text-sm";

  return (
    <div
      className={`${sizeClass} rounded-full ${colors.bg} ${colors.text} font-bold flex items-center justify-center ring-2 ${colors.ring}`}
    >
      {score}
    </div>
  );
}

function WinProbBadge({ prob }: { prob: number }) {
  const getColor = () => {
    if (prob >= 70) return "bg-green-100 text-green-800";
    if (prob >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getColor()}`}>
      {prob}% win
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-yellow-100 text-yellow-800",
    qualified: "bg-purple-100 text-purple-800",
    proposal: "bg-indigo-100 text-indigo-800",
    negotiation: "bg-orange-100 text-orange-800",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

function LeadScoreCard({ lead }: { lead: LeadScoreResponse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <ScoreGauge score={lead.total_score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 truncate">{lead.lead_name}</h3>
              <p className="text-sm text-gray-500 truncate">
                {lead.lead_company || lead.lead_email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.lead_status} />
              <WinProbBadge prob={lead.win_probability} />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lead.engagement_score}</div>
              <div className="text-gray-500">Engage</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lead.source_score}</div>
              <div className="text-gray-500">Source</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lead.value_score}</div>
              <div className="text-gray-500">Value</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lead.velocity_score}</div>
              <div className="text-gray-500">Velocity</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">{lead.fit_score}</div>
              <div className="text-gray-500">Fit</div>
            </div>
          </div>

          {/* Next action */}
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
            <span className="font-medium text-blue-700">Next: </span>
            <span className="text-blue-600">{lead.best_next_action}</span>
          </div>

          {/* Expand/collapse details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2">
              {lead.score_reasons.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700">Strengths:</p>
                  <ul className="text-xs text-green-600 list-disc list-inside">
                    {lead.score_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.risk_factors.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700">Risks:</p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {lead.risk_factors.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.predicted_close_days && (
                <p className="text-xs text-gray-500">
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
    { label: "Hot", value: distribution.hot, color: "bg-green-500" },
    { label: "Warm", value: distribution.warm, color: "bg-yellow-500" },
    { label: "Cool", value: distribution.cool, color: "bg-orange-500" },
    { label: "Cold", value: distribution.cold, color: "bg-red-500" },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
      <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all`}
            style={{ width: `${(seg.value / Math.max(total, 1)) * 100}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-3 text-sm">
        {segments.map((seg) => (
          <div key={seg.label} className="text-center">
            <div className={`w-3 h-3 rounded-full ${seg.color} mx-auto mb-1`} />
            <div className="font-medium text-gray-900">{seg.value}</div>
            <div className="text-gray-500">{seg.label}</div>
          </div>
        ))}
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

  const displayLeads =
    activeTab === "hot" ? hotLeads : activeTab === "at-risk" ? atRiskLeads : allLeads?.leads || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Scoring</h1>
          <p className="text-sm text-gray-500">AI-powered lead prioritization</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh All Scores"}
        </button>
      </div>

      {/* Summary Cards */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Active Leads</p>
            <p className="text-2xl font-bold text-gray-900">{insights.total_active_leads}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Average Score</p>
            <p className="text-2xl font-bold text-gray-900">{insights.avg_score}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">Hot Leads</p>
            <p className="text-2xl font-bold text-green-600">{insights.hot_leads}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">At Risk</p>
            <p className="text-2xl font-bold text-red-600">{insights.at_risk_leads}</p>
          </div>
        </div>
      )}

      {/* Distribution & Top Sources */}
      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionChart distribution={insights.distribution} />
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Sources by Score</h3>
            <div className="space-y-3">
              {insights.top_sources.map((source) => (
                <div key={source.source} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-900">{source.source}</span>
                      <span className="text-gray-500">{source.count} leads</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${source.avg_score}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 w-12 text-right">
                    {source.avg_score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lead Lists */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: "hot", label: "Hot Leads", count: hotLeads.length },
              { id: "at-risk", label: "At Risk", count: atRiskLeads.length },
              { id: "all", label: "All Leads", count: allLeads?.total_count || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {displayLeads.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No leads found</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {displayLeads.map((lead) => (
                <LeadScoreCard key={lead.lead_id} lead={lead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
