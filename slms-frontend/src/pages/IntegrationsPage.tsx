// src/pages/IntegrationsPage.tsx - Next-Gen CRM Integration Center
import { useEffect, useState, useRef } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getApiBase, refresh } from "@/utils/api";
import {
  AnimatedAreaChart,
  DonutChart,
  RadialGauge,
  Sparkline,
  ComparisonBar,
  CHART_COLORS,
  GRADIENTS,
} from "../components/charts";

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell" | "zoho";
type TabType = "command" | "activity" | "mapping" | "analytics";

const CRM_OPTIONS: {
  id: CRM;
  label: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
  tagline: string;
}[] = [
  {
    id: "hubspot",
    label: "HubSpot",
    icon: "H",
    color: "from-orange-500 to-red-500",
    gradient: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
    description: "Marketing-first CRM platform",
    tagline: "Inbound Marketing Leader",
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    icon: "P",
    color: "from-green-500 to-emerald-600",
    gradient: "linear-gradient(135deg, #22c55e 0%, #059669 100%)",
    description: "Sales pipeline focused",
    tagline: "Pipeline-Driven Sales",
  },
  {
    id: "salesforce",
    label: "Salesforce",
    icon: "S",
    color: "from-blue-500 to-cyan-500",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    description: "Enterprise CRM leader",
    tagline: "Enterprise Scale",
  },
  {
    id: "nutshell",
    label: "Nutshell",
    icon: "N",
    color: "from-purple-500 to-pink-500",
    gradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
    description: "SMB-friendly CRM",
    tagline: "Simple & Powerful",
  },
  {
    id: "zoho",
    label: "Zoho CRM",
    icon: "Z",
    color: "from-red-500 to-yellow-500",
    gradient: "linear-gradient(135deg, #ef4444 0%, #eab308 100%)",
    description: "All-in-one business platform",
    tagline: "Complete Business Suite",
  },
];

// Mock real-time sync data
const generateSyncPulse = (): { id: number; type: string; direction: "outbound" | "inbound"; status: string } => ({
  id: Date.now(),
  type: ["lead", "contact", "deal", "activity"][Math.floor(Math.random() * 4)],
  direction: Math.random() > 0.3 ? "outbound" : "inbound",
  status: Math.random() > 0.1 ? "success" : Math.random() > 0.5 ? "warning" : "error",
});

const MOCK_ACTIVITY = [
  { id: 1, type: "lead_created", entity: "John Smith", source: "Website Form", time: "Just now", status: "success", value: 15000 },
  { id: 2, type: "deal_synced", entity: "Acme Corp Deal", source: "CRM", time: "30s ago", status: "success", value: 45000 },
  { id: 3, type: "contact_updated", entity: "Sarah Johnson", source: "Widget", time: "1m ago", status: "success", value: 0 },
  { id: 4, type: "lead_created", entity: "Tech Solutions", source: "API", time: "2m ago", status: "warning", value: 8500 },
  { id: 5, type: "activity_logged", entity: "Call with Mike", source: "CRM", time: "3m ago", status: "success", value: 0 },
  { id: 6, type: "lead_created", entity: "Global Industries", source: "Widget", time: "5m ago", status: "error", value: 25000 },
  { id: 7, type: "deal_updated", entity: "$85K Enterprise", source: "CRM", time: "8m ago", status: "success", value: 85000 },
  { id: 8, type: "contact_synced", entity: "Emily Chen", source: "Website", time: "12m ago", status: "success", value: 0 },
];

const FIELD_MAPPINGS = [
  { id: 1, source: "name", target: "contact_name", type: "text", enabled: true, syncs: 12847, aiConfidence: 99 },
  { id: 2, source: "email", target: "email_address", type: "email", enabled: true, syncs: 12847, aiConfidence: 100 },
  { id: 3, source: "phone", target: "phone_number", type: "phone", enabled: true, syncs: 11203, aiConfidence: 98 },
  { id: 4, source: "company", target: "organization", type: "text", enabled: true, syncs: 9845, aiConfidence: 95 },
  { id: 5, source: "source", target: "lead_source", type: "select", enabled: true, syncs: 12847, aiConfidence: 87 },
  { id: 6, source: "notes", target: "description", type: "textarea", enabled: false, syncs: 0, aiConfidence: 72 },
  { id: 7, source: "value", target: "deal_value", type: "currency", enabled: true, syncs: 8234, aiConfidence: 94 },
  { id: 8, source: "utm_campaign", target: "marketing_campaign", type: "text", enabled: true, syncs: 6521, aiConfidence: 89 },
];

type CredentialSummary = {
  id: number;
  provider: string;
  auth_type: string;
  is_active: boolean;
  token_suffix?: string | null;
};

async function authFetch(input: RequestInfo | URL, init: RequestInit = {}, _retried = false): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  try {
    const tok = typeof localStorage !== "undefined" ? localStorage.getItem("access_token") : null;
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch { /* ignore */ }
  const res = await fetch(input, { credentials: "include", ...init, headers });
  if (res.status === 401 && !_retried) {
    const newTok = await refresh();
    if (newTok) {
      headers.Authorization = `Bearer ${newTok}`;
      return authFetch(input, { ...init, headers }, true);
    }
  }
  return res;
}

// Animated background particles
function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          initial={{ x: Math.random() * 100 + "%", y: "100%", opacity: 0 }}
          animate={{
            y: "-10%",
            opacity: [0, 0.5, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

// Live sync pulse animation
function SyncPulse({ direction, status }: { direction: "outbound" | "inbound"; status: string }) {
  const color = status === "success" ? "#22c55e" : status === "warning" ? "#eab308" : "#ef4444";
  return (
    <motion.div
      className="absolute"
      style={{ left: direction === "outbound" ? "10%" : "90%" }}
      initial={{ x: direction === "outbound" ? 0 : 0, y: "50%", opacity: 1, scale: 0.5 }}
      animate={{
        x: direction === "outbound" ? "800%" : "-800%",
        opacity: [1, 1, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{ duration: 2, ease: "easeInOut" }}
    >
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}` }} />
    </motion.div>
  );
}

export default function IntegrationsPage() {
  useDocumentTitle("Integrations");
  const [activeCRM, setActiveCRM] = useState<CRM>("hubspot");
  const [editing, setEditing] = useState<CRM>("hubspot");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("command");
  const [creds, setCreds] = useState<CredentialSummary[]>([]);
  const [syncPulses, setSyncPulses] = useState<ReturnType<typeof generateSyncPulse>[]>([]);
  const [fieldMappings, setFieldMappings] = useState(FIELD_MAPPINGS);

  // Token states
  const [hubspotToken, setHubspotToken] = useState("");
  const [pipedriveToken, setPipedriveToken] = useState("");
  const [nutshellToken, setNutshellToken] = useState("");
  const [tokenBusy, setTokenBusy] = useState<CRM | null>(null);
  const [sfConnected, setSfConnected] = useState(false);
  const [sfBusy, setSfBusy] = useState(false);
  const [hsOAuthConnected, setHsOAuthConnected] = useState(false);
  const [hsOAuthBusy, setHsOAuthBusy] = useState(false);

  // Quick action states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Real-time stats
  const [stats, setStats] = useState({
    syncedToday: 847,
    activeConnections: 3,
    successRate: 99.7,
    avgLatency: 12,
    totalSynced: 124839,
    dataQuality: 94.2,
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  // Simulated real-time sync pulses
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setSyncPulses((prev) => [...prev.slice(-5), generateSyncPulse()]);
        setStats((prev) => ({
          ...prev,
          syncedToday: prev.syncedToday + 1,
          totalSynced: prev.totalSynced + 1,
        }));
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load active CRM
  useEffect(() => {
    (async () => {
      try {
        const r = await authFetch(`${getApiBase()}/integrations/crm/active`);
        if (r.ok) {
          const j = (await r.json()) as { provider: CRM };
          setActiveCRM(j.provider);
          setEditing(j.provider);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  // Load credentials
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch(`${getApiBase()}/integrations/credentials`);
        if (res.ok) {
          const items = (await res.json()) as CredentialSummary[];
          setCreds(items || []);
          setSfConnected(items?.some((c) => c.provider === "salesforce" && c.is_active) || false);
          setHsOAuthConnected(items?.some((c) => c.provider === "hubspot" && c.auth_type === "oauth" && c.is_active) || false);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  async function onSave() {
    if (editing === activeCRM) return;
    setSaving(true);
    try {
      const r = await authFetch(`${getApiBase()}/integrations/crm/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: editing }),
      });
      if (r.ok) {
        const j = (await r.json()) as { provider: CRM };
        setActiveCRM(j.provider);
        setMsg(`Switched to ${CRM_OPTIONS.find((o) => o.id === j.provider)?.label}`);
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveToken(provider: "hubspot" | "pipedrive" | "nutshell") {
    const value = provider === "hubspot" ? hubspotToken : provider === "pipedrive" ? pipedriveToken : nutshellToken;
    if (!value.trim()) return;
    setTokenBusy(provider);
    try {
      const res = await authFetch(`${getApiBase()}/integrations/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, access_token: value.trim(), auth_type: "pat", activate: true }),
      });
      if (res.ok) {
        setMsg(`${CRM_OPTIONS.find((o) => o.id === provider)?.label} connected!`);
        if (provider === "hubspot") setHubspotToken("");
        if (provider === "pipedrive") setPipedriveToken("");
        if (provider === "nutshell") setNutshellToken("");
      }
    } catch { /* ignore */ }
    setTokenBusy(null);
  }

  // Test connection to active CRM
  async function testConnection() {
    if (!activeCRM) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const endpoint = `${getApiBase()}/integrations/${activeCRM}/salespeople`;
      const res = await authFetch(endpoint);
      if (res.ok) {
        setTestResult({ status: "success", message: "Connection verified!" });
        setMsg("Connection test passed!");
      } else {
        const errorText = await res.text().catch(() => "Connection failed");
        setTestResult({ status: "error", message: errorText.slice(0, 100) });
        setMsg("Connection test failed");
      }
    } catch (e: any) {
      setTestResult({ status: "error", message: e?.message || "Connection test failed" });
      setMsg("Connection test failed");
    } finally {
      setTestingConnection(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  }

  // Refresh credentials/sync status
  async function syncNow() {
    setSyncing(true);
    try {
      const res = await authFetch(`${getApiBase()}/integrations/credentials`);
      if (res.ok) {
        const items = (await res.json()) as CredentialSummary[];
        setCreds(items || []);
        setSfConnected(items?.some((c) => c.provider === "salesforce" && c.is_active) || false);
        setHsOAuthConnected(items?.some((c) => c.provider === "hubspot" && c.auth_type === "oauth" && c.is_active) || false);
        setMsg("Sync complete!");
      }
    } catch {
      setMsg("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const getCredential = (provider: CRM) => creds.find((c) => c.provider === provider && c.is_active);
  const activeCRMData = CRM_OPTIONS.find((o) => o.id === activeCRM);
  const isConnected = activeCRM === "salesforce" ? sfConnected : !!getCredential(activeCRM);

  return (
    <div className={`min-h-screen transition-all duration-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Hero Section with Live Visualization */}
      <div className="relative overflow-hidden rounded-3xl mx-6 mt-6 mb-8">
        <div className={`absolute inset-0 bg-gradient-to-br ${activeCRMData?.color || "from-indigo-600 to-purple-700"}`} />
        <ParticleField />

        {/* Live sync pulses */}
        <div className="absolute inset-0">
          <AnimatePresence>
            {syncPulses.map((pulse) => (
              <SyncPulse key={pulse.id} direction={pulse.direction} status={pulse.status} />
            ))}
          </AnimatePresence>
        </div>

        <div className="relative z-10 px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Left: CRM Info */}
            <div className="flex items-center gap-6">
              <motion.div
                className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-5xl font-bold text-white shadow-2xl"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {activeCRMData?.icon}
              </motion.div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{activeCRMData?.label}</h1>
                  <motion.span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isConnected ? "bg-green-400/30 text-green-100" : "bg-red-400/30 text-red-100"
                    }`}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-400" : "bg-red-400"}`} />
                    {isConnected ? "LIVE" : "OFFLINE"}
                  </motion.span>
                </div>
                <p className="text-white/80 text-lg">{activeCRMData?.tagline}</p>
                <p className="text-white/60 text-sm mt-1">{activeCRMData?.description}</p>
              </div>
            </div>

            {/* Right: Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Synced Today", value: stats.syncedToday.toLocaleString(), icon: "↑", trend: "+12%" },
                { label: "Success Rate", value: `${stats.successRate}%`, icon: "✓", trend: "+0.3%" },
                { label: "Avg Latency", value: `${stats.avgLatency}ms`, icon: "⚡", trend: "-5ms" },
                { label: "Total Synced", value: stats.totalSynced.toLocaleString(), icon: "∞", trend: "+1.2K" },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/60 text-xs">{stat.label}</div>
                  <div className="text-green-300 text-xs mt-1">{stat.trend}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 pb-8">
        {/* Status Message */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 px-5 py-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-emerald-800 dark:text-emerald-200 font-medium">{msg}</span>
              <button onClick={() => setMsg(null)} className="ml-auto text-emerald-600 hover:text-emerald-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl inline-flex">
            {[
              { id: "command" as TabType, label: "Command Center", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
              { id: "activity" as TabType, label: "Live Activity", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { id: "mapping" as TabType, label: "Field Mapping", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
              { id: "analytics" as TabType, label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "command" && (
            <CommandCenterTab
              key="command"
              activeCRM={activeCRM}
              editing={editing}
              onSelect={setEditing}
              onSave={onSave}
              saving={saving}
              creds={creds}
              isConnected={isConnected}
              hubspotToken={hubspotToken}
              setHubspotToken={setHubspotToken}
              pipedriveToken={pipedriveToken}
              setPipedriveToken={setPipedriveToken}
              nutshellToken={nutshellToken}
              setNutshellToken={setNutshellToken}
              tokenBusy={tokenBusy}
              saveToken={saveToken}
              sfConnected={sfConnected}
              sfBusy={sfBusy}
              setSfBusy={setSfBusy}
              hsOAuthConnected={hsOAuthConnected}
              hsOAuthBusy={hsOAuthBusy}
              setHsOAuthBusy={setHsOAuthBusy}
            />
          )}

          {activeTab === "activity" && <LiveActivityTab key="activity" />}

          {activeTab === "mapping" && (
            <FieldMappingTab
              key="mapping"
              fieldMappings={fieldMappings}
              setFieldMappings={setFieldMappings}
            />
          )}

          {activeTab === "analytics" && <AnalyticsTab key="analytics" stats={stats} />}
        </AnimatePresence>

      </div>
    </div>
  );
}

// Command Center Tab
function CommandCenterTab({
  activeCRM,
  editing,
  onSelect,
  onSave,
  saving,
  creds,
  isConnected,
  hubspotToken,
  setHubspotToken,
  pipedriveToken,
  setPipedriveToken,
  nutshellToken,
  setNutshellToken,
  tokenBusy,
  saveToken,
  sfConnected,
  sfBusy,
  setSfBusy,
  hsOAuthConnected,
  hsOAuthBusy,
  setHsOAuthBusy,
}: any) {
  const getCredential = (provider: CRM) => creds.find((c: any) => c.provider === provider && c.is_active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid lg:grid-cols-3 gap-6"
    >
      {/* CRM Selection */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select CRM Provider</h3>
            <motion.button
              onClick={onSave}
              disabled={saving || editing === activeCRM}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                editing !== activeCRM
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
              }`}
              whileHover={editing !== activeCRM ? { scale: 1.02 } : {}}
              whileTap={editing !== activeCRM ? { scale: 0.98 } : {}}
            >
              {saving ? "Saving..." : "Apply Changes"}
            </motion.button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {CRM_OPTIONS.map((opt, idx) => {
              const credential = getCredential(opt.id);
              const connected = opt.id === "salesforce" ? sfConnected : !!credential;

              return (
                <motion.button
                  key={opt.id}
                  onClick={() => onSelect(opt.id)}
                  className={`relative rounded-2xl border-2 p-5 text-left transition-all overflow-hidden ${
                    editing === opt.id
                      ? "border-indigo-500 shadow-xl shadow-indigo-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  {editing === opt.id && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${opt.color} opacity-5`} />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                        style={{ background: opt.gradient }}
                      >
                        {opt.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white">{opt.label}</span>
                          {activeCRM === opt.id && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{opt.description}</p>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-gray-400"}`} />
                          <span className={`text-xs ${connected ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                            {connected ? "Connected" : "Not connected"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {editing === opt.id && (
                    <motion.div
                      className="absolute top-4 right-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Connection Form */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
              {editing === "salesforce" || editing === "hubspot" ? "OAuth Connection" : "API Credentials"}
            </h4>

            {editing === "salesforce" ? (
              <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-100 dark:border-blue-800/50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {sfConnected ? "Salesforce org is connected" : "Connect via OAuth"}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Secure OAuth 2.0 authentication</p>
                </div>
                <motion.button
                  onClick={() => {
                    setSfBusy(true);
                    window.location.href = `${getApiBase()}/integrations/salesforce/auth`;
                  }}
                  disabled={sfBusy}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {sfConnected ? "Reconnect" : sfBusy ? "Connecting..." : "Connect Salesforce"}
                </motion.button>
              </div>
            ) : editing === "hubspot" ? (
              <div className="space-y-4">
                {/* HubSpot OAuth (Recommended) */}
                <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-100 dark:border-orange-800/50">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {hsOAuthConnected ? "HubSpot is connected via OAuth" : "Connect via OAuth (Recommended)"}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatic token refresh, full CRM access</p>
                  </div>
                  <motion.button
                    onClick={() => {
                      setHsOAuthBusy(true);
                      window.location.href = `${getApiBase()}/integrations/hubspot/auth`;
                    }}
                    disabled={hsOAuthBusy}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {hsOAuthConnected ? "Reconnect" : hsOAuthBusy ? "Connecting..." : "Connect HubSpot"}
                  </motion.button>
                </div>
                {/* HubSpot API Key (Fallback) */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Or use Private App API Key:</p>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      value={hubspotToken}
                      onChange={(e) => setHubspotToken(e.target.value)}
                      placeholder="Enter HubSpot API key (pat-na2-...)"
                      className="flex-1 rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm dark:bg-gray-800 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <motion.button
                      onClick={() => saveToken("hubspot")}
                      disabled={tokenBusy === "hubspot"}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-60"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {tokenBusy === "hubspot" ? "..." : "Save"}
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="password"
                  value={editing === "pipedrive" ? pipedriveToken : nutshellToken}
                  onChange={(e) => {
                    if (editing === "pipedrive") setPipedriveToken(e.target.value);
                    else setNutshellToken(e.target.value);
                  }}
                  placeholder={`Enter ${CRM_OPTIONS.find((o) => o.id === editing)?.label} API key`}
                  className="flex-1 rounded-xl border-2 border-gray-200 dark:border-gray-700 px-5 py-3 text-sm dark:bg-gray-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
                <motion.button
                  onClick={() => saveToken(editing as "pipedrive" | "nutshell")}
                  disabled={tokenBusy === editing}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {tokenBusy === editing ? "Connecting..." : "Connect"}
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Health Score */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Integration Health</h3>
          <div className="flex justify-center mb-4">
            <RadialGauge
              value={isConnected ? 94 : 0}
              label="Health Score"
              sublabel={isConnected ? "Excellent" : "Offline"}
              size={140}
              thickness={14}
              gradient={isConnected ? "emerald" : "rose"}
            />
          </div>
          <div className="space-y-3">
            {[
              { label: "Connection", value: isConnected ? 100 : 0, color: "emerald" },
              { label: "Data Quality", value: 94.2, color: "blue" },
              { label: "Sync Speed", value: 98.5, color: "purple" },
            ].map((metric) => (
              <ComparisonBar
                key={metric.label}
                label={metric.label}
                value={metric.value}
                maxValue={100}
                gradient={metric.color as any}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {/* Test Connection */}
            <motion.button
              onClick={testConnection}
              disabled={testingConnection || !isConnected}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
              whileHover={{ x: 4 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                {testingConnection ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">{testingConnection ? "Testing..." : "Test Connection"}</span>
                {testResult && (
                  <span className={`block text-xs ${testResult.status === "success" ? "text-emerald-600" : "text-red-500"}`}>
                    {testResult.message}
                  </span>
                )}
              </div>
            </motion.button>

            {/* Sync Now */}
            <motion.button
              onClick={syncNow}
              disabled={syncing}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
              whileHover={{ x: 4 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <svg className={`w-5 h-5 text-white ${syncing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">{syncing ? "Syncing..." : "Sync Now"}</span>
            </motion.button>

            {/* View Activity */}
            <motion.button
              onClick={() => setActiveTab("activity")}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              whileHover={{ x: 4 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900 dark:text-white">View Activity</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Live Activity Tab
function LiveActivityTab() {
  const [filter, setFilter] = useState<"all" | "success" | "warning" | "error">("all");
  const filtered = filter === "all" ? MOCK_ACTIVITY : MOCK_ACTIVITY.filter((a) => a.status === filter);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-3 h-3 rounded-full bg-green-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Sync Activity</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Real-time data flow monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: "all" as const, label: "All", count: MOCK_ACTIVITY.length },
                { id: "success" as const, label: "Success", count: MOCK_ACTIVITY.filter((a) => a.status === "success").length },
                { id: "warning" as const, label: "Warnings", count: MOCK_ACTIVITY.filter((a) => a.status === "warning").length },
                { id: "error" as const, label: "Errors", count: MOCK_ACTIVITY.filter((a) => a.status === "error").length },
              ].map((f) => (
                <motion.button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    filter === f.id
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {f.label} ({f.count})
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <AnimatePresence>
            {filtered.map((activity, idx) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        activity.status === "success"
                          ? "bg-gradient-to-br from-green-400 to-emerald-500"
                          : activity.status === "warning"
                          ? "bg-gradient-to-br from-yellow-400 to-amber-500"
                          : "bg-gradient-to-br from-red-400 to-rose-500"
                      }`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {activity.status === "success" ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : activity.status === "warning" ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{activity.entity}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {activity.type.replace("_", " ")}
                        </span>
                        {activity.value > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            ${activity.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">{activity.source}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    whileHover={{ x: 2 }}
                  >
                    View →
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// Field Mapping Tab
function FieldMappingTab({ fieldMappings, setFieldMappings }: { fieldMappings: typeof FIELD_MAPPINGS; setFieldMappings: any }) {
  function toggle(id: number) {
    setFieldMappings((prev: any) => prev.map((f: any) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xl">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Smart Field Mapping</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Automatic field matching with confidence scores</p>
            </div>
            <motion.button
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              + Add Mapping
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {fieldMappings.map((mapping, idx) => (
              <motion.div
                key={mapping.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  mapping.enabled
                    ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60"
                }`}
              >
                {/* Toggle */}
                <motion.button
                  onClick={() => toggle(mapping.id)}
                  className={`w-14 h-8 rounded-full transition-all relative ${
                    mapping.enabled ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
                    animate={{ left: mapping.enabled ? "calc(100% - 28px)" : "4px" }}
                    transition={{ type: "spring", stiffness: 500 }}
                  />
                </motion.button>

                {/* Source */}
                <div className="flex-1">
                  <code className="px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-mono font-medium">
                    {mapping.source}
                  </code>
                </div>

                {/* Arrow with animation */}
                <motion.div
                  className="text-gray-400"
                  animate={{ x: mapping.enabled ? [0, 5, 0] : 0 }}
                  transition={{ duration: 1.5, repeat: mapping.enabled ? Infinity : 0 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </motion.div>

                {/* Target */}
                <div className="flex-1">
                  <code className="px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-mono font-medium">
                    {mapping.target}
                  </code>
                </div>

                {/* Type */}
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 w-20 text-center">
                  {mapping.type}
                </span>

                {/* Match Confidence */}
                <div className="w-24">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          mapping.aiConfidence >= 90 ? "bg-green-500" : mapping.aiConfidence >= 70 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${mapping.aiConfidence}%` }}
                        transition={{ delay: idx * 0.05, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{mapping.aiConfidence}%</span>
                  </div>
                </div>

                {/* Syncs count */}
                <div className="text-right w-24">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{mapping.syncs.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">syncs</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Analytics Tab
function AnalyticsTab({ stats }: { stats: any }) {
  const syncTrend = [
    { name: "Mon", value: 720 },
    { name: "Tue", value: 890 },
    { name: "Wed", value: 1100 },
    { name: "Thu", value: 980 },
    { name: "Fri", value: 850 },
    { name: "Sat", value: 340 },
    { name: "Sun", value: 280 },
  ];

  const sourceBreakdown = [
    { name: "Website Forms", value: 45 },
    { name: "API", value: 25 },
    { name: "Widget", value: 20 },
    { name: "Manual", value: 10 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid lg:grid-cols-2 gap-6"
    >
      {/* Sync Trends */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Sync Volume</h3>
            <p className="text-sm text-gray-500">Last 7 days</p>
          </div>
        </div>
        <AnimatedAreaChart data={syncTrend} height={240} gradient="indigo" />
      </div>

      {/* Source Breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Lead Sources</h3>
            <p className="text-sm text-gray-500">Distribution</p>
          </div>
        </div>
        <div className="flex justify-center">
          <DonutChart
            data={sourceBreakdown}
            size={200}
            thickness={45}
            centerValue={stats.totalSynced.toLocaleString()}
            centerLabel="Total"
            showLegend
          />
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Performance Metrics</h3>
            <p className="text-sm text-gray-500">Real-time system health</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Uptime", value: 99.99, suffix: "%", gradient: "emerald" },
            { label: "Success Rate", value: stats.successRate, suffix: "%", gradient: "blue" },
            { label: "Data Quality", value: stats.dataQuality, suffix: "%", gradient: "purple" },
            { label: "Avg Latency", value: stats.avgLatency, suffix: "ms", gradient: "amber" },
          ].map((metric, idx) => (
            <motion.div
              key={metric.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <RadialGauge
                value={metric.suffix === "ms" ? 100 - metric.value : metric.value}
                label={metric.label}
                sublabel={`${metric.value}${metric.suffix}`}
                size={120}
                thickness={12}
                gradient={metric.gradient as any}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
