// src/pages/AutomationPage.tsx
import { useEffect, useState } from "react";
import {
  getAssignmentStrategies,
  getAssignmentPreview,
  bulkAssignLeads,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationStats,
  AssignmentStrategy,
  AssignmentPreviewResponse,
  AutomationSettings,
  AutomationStats,
} from "../utils/api";

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
          enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  color = "gray",
  icon,
  index = 0,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: "gray" | "green" | "blue" | "orange" | "red" | "purple";
  icon?: string;
  index?: number;
}) {
  const colorConfig = {
    gray: {
      text: "text-gray-900 dark:text-white",
      bg: "bg-gray-100 dark:bg-gray-800",
      iconBg: "bg-gray-200 dark:bg-gray-700",
      accent: "from-gray-500 to-slate-600",
    },
    green: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      accent: "from-emerald-500 to-green-600",
    },
    blue: {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      accent: "from-blue-500 to-cyan-600",
    },
    orange: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      accent: "from-amber-500 to-orange-600",
    },
    red: {
      text: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      accent: "from-red-500 to-rose-600",
    },
    purple: {
      text: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      accent: "from-purple-500 to-pink-600",
    },
  };

  const config = colorConfig[color];

  return (
    <div
      className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r ${config.accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${config.text}`}>{value}</p>
          {sublabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sublabel}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
            <svg className={`w-5 h-5 ${config.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AutomationPage() {
  const [strategies, setStrategies] = useState<AssignmentStrategy[]>([]);
  const [preview, setPreview] = useState<AssignmentPreviewResponse | null>(null);
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState("best_fit");
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      loadPreview();
    }
  }, [selectedStrategy]);

  async function loadData() {
    try {
      setLoading(true);
      const [strats, setts, st] = await Promise.all([
        getAssignmentStrategies(),
        getAutomationSettings(),
        getAutomationStats(),
      ]);
      setStrategies(strats);
      setSettings(setts);
      setStats(st);
      setSelectedStrategy(setts.assignment_strategy);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load automation data");
    } finally {
      setLoading(false);
    }
  }

  async function loadPreview() {
    try {
      const prev = await getAssignmentPreview(selectedStrategy);
      setPreview(prev);
    } catch (err) {
      console.error("Failed to load preview:", err);
    }
  }

  async function handleBulkAssign() {
    if (!preview?.unassigned_leads) return;

    try {
      setAssigning(true);
      setAssignResult(null);
      const result = await bulkAssignLeads(selectedStrategy, 100);
      setAssignResult(`Assigned ${result.assignments_made} leads successfully!`);
      // Refresh data
      await loadData();
      await loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign leads");
    } finally {
      setAssigning(false);
    }
  }

  async function handleSettingChange(key: keyof AutomationSettings, value: boolean | string) {
    if (!settings) return;

    try {
      const updated = await updateAutomationSettings({ [key]: value });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update settings");
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading automation...</p>
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
          <button onClick={loadData} className="ml-auto px-4 py-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Header */}
      <div className={`transition-all duration-500 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure automatic lead assignment and scheduled tasks
        </p>
      </div>


      {/* Stats Overview */}
      {stats && (
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 transition-all duration-500 delay-100 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          <StatCard
            label="Total Leads"
            value={stats.total_leads.toLocaleString()}
            icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            index={0}
          />
          <StatCard
            label="Assigned"
            value={stats.assigned_leads.toLocaleString()}
            color="green"
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            index={1}
          />
          <StatCard
            label="Unassigned"
            value={stats.unassigned_leads.toLocaleString()}
            color={stats.unassigned_leads > 0 ? "orange" : "gray"}
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            index={2}
          />
          <StatCard
            label="Assignment Rate"
            value={`${stats.assignment_rate}%`}
            color={stats.assignment_rate >= 90 ? "green" : stats.assignment_rate >= 70 ? "blue" : "orange"}
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            index={3}
          />
          <StatCard
            label="Active Reps"
            value={stats.active_salespeople}
            color="blue"
            icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            index={4}
          />
          <StatCard
            label="Avg Workload"
            value={stats.avg_workload_per_rep}
            sublabel="leads per rep"
            color="purple"
            icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            index={5}
          />
        </div>
      )}

      {/* Main Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 delay-150 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        {/* Lead Assignment */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lead Assignment</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure how leads are distributed</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Strategy Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Strategy
              </label>
              <select
                value={selectedStrategy}
                onChange={(e) => {
                  setSelectedStrategy(e.target.value);
                  handleSettingChange("assignment_strategy", e.target.value);
                }}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              >
                {strategies.map((strat) => (
                  <option key={strat.id} value={strat.id}>
                    {strat.name}
                  </option>
                ))}
              </select>
              {preview && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{preview.strategy_description}</p>
              )}
            </div>

            {/* Preview */}
            {preview && preview.salespeople.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Distribution Preview</p>
                <div className="space-y-3">
                  {preview.salespeople.map((sp, idx) => (
                    <div
                      key={sp.user_id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {sp.display_name.charAt(0)}
                      </div>
                      <div className="w-20 truncate text-sm font-medium text-gray-900 dark:text-white">
                        {sp.display_name}
                      </div>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${sp.estimated_assignment_pct}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {sp.estimated_assignment_pct.toFixed(0)}%
                      </div>
                      <div className="w-16 text-right text-xs text-gray-500 dark:text-gray-400">
                        {sp.current_workload} active
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Assign Button */}
            {preview && preview.unassigned_leads > 0 && (
              <div className="pt-5 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {preview.unassigned_leads} unassigned leads
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Assign now using {selectedStrategy.replace("_", " ")} strategy
                    </p>
                  </div>
                  <button
                    onClick={handleBulkAssign}
                    disabled={assigning}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all"
                  >
                    {assigning ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Assigning...
                      </span>
                    ) : (
                      "Assign All"
                    )}
                  </button>
                </div>
                {assignResult && (
                  <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {assignResult}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Automation Settings */}
        {settings && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable/disable automated workflows</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-2">
              <Toggle
                enabled={settings.auto_assign_enabled}
                onChange={(v) => handleSettingChange("auto_assign_enabled", v)}
                label="Auto-assign new leads"
                description="Automatically assign incoming leads to salespeople"
              />
              <Toggle
                enabled={settings.notify_on_assignment}
                onChange={(v) => handleSettingChange("notify_on_assignment", v)}
                label="Assignment notifications"
                description="Notify salespeople when leads are assigned"
              />
              <Toggle
                enabled={settings.daily_digest_enabled}
                onChange={(v) => handleSettingChange("daily_digest_enabled", v)}
                label="Daily digest emails"
                description="Send daily summary of new leads"
              />
              <Toggle
                enabled={settings.weekly_recommendations_enabled}
                onChange={(v) => handleSettingChange("weekly_recommendations_enabled", v)}
                label="Weekly AI recommendations"
                description="Send AI-generated recommendations every Wednesday"
              />
            </div>
          </div>
        )}
      </div>

      {/* Strategy Info Cards */}
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-500 delay-200 ${mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assignment Strategies</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose how leads are distributed to your team</p>
            </div>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {strategies.map((strat, idx) => (
            <button
              key={strat.id}
              className={`relative p-5 rounded-xl border-2 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                selectedStrategy === strat.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50"
              }`}
              onClick={() => {
                setSelectedStrategy(strat.id);
                handleSettingChange("assignment_strategy", strat.id);
              }}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {selectedStrategy === strat.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                selectedStrategy === strat.id
                  ? "bg-indigo-100 dark:bg-indigo-900/50"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}>
                <svg className={`w-5 h-5 ${selectedStrategy === strat.id ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {strat.id === "round_robin" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />}
                  {strat.id === "best_fit" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                  {strat.id === "workload" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />}
                  {strat.id === "territory" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />}
                </svg>
              </div>
              <span className={`font-semibold ${selectedStrategy === strat.id ? "text-indigo-900 dark:text-indigo-100" : "text-gray-900 dark:text-white"}`}>
                {strat.name}
              </span>
              <p className={`mt-1 text-sm ${selectedStrategy === strat.id ? "text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400"}`}>
                {strat.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
