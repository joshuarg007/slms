// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import { applyTheme, getSavedTheme, type Theme } from "@/utils/theme";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getApiBase, refresh } from "@/utils/api";
import CSVImportModal from "@/components/CSVImportModal";

type SaveState = "idle" | "saving" | "saved" | "error";
type TwoFAStep = "disabled" | "setup" | "verify" | "enabled";

// Simple component to handle verification animation
function VerifyingState({ onVerify }: { onVerify: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onVerify, 1000);
    return () => clearTimeout(timer);
  }, [onVerify]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">Verifying...</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Please wait while we verify your code and enable two-factor authentication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  _retried = false
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    const tok =
      typeof localStorage !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {
    // ignore localStorage errors
  }

  const res = await fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401 && !_retried) {
    const newTok = await refresh();
    if (newTok) {
      headers.Authorization = `Bearer ${newTok}`;
      return authFetch(input, { ...init, headers }, true);
    }
  }

  return res;
}

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());
  const [rotating, setRotating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [rotateErr, setRotateErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Organization settings
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [orgSaveState, setOrgSaveState] = useState<SaveState>("idle");

  // Data preferences
  const [leadNotifications, setLeadNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [dataRetention, setDataRetention] = useState("forever");
  const [dataSaveState, setDataSaveState] = useState<SaveState>("idle");

  // Export/Import
  const [exporting, setExporting] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Two-Factor Authentication
  const [twoFAStep, setTwoFAStep] = useState<TwoFAStep>("disabled");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [twoFASecret] = useState("JBSWY3DPEHPK3PXP"); // Demo secret - in production this comes from API
  const [backupCodes] = useState(["A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6", "Q7R8-S9T0"]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // Fetch current org settings
    async function loadSettings() {
      try {
        const res = await authFetch(`${getApiBase()}/orgs/current`);
        if (res.ok) {
          const data = await res.json();
          setOrgName(data.name || "");
          setCurrentApiKey(data.api_key ? `${data.api_key.slice(0, 8)}...${data.api_key.slice(-4)}` : null);
        }
      } catch {
        // Silently fail
      }
    }
    loadSettings();
  }, []);

  async function rotateOrgKey() {
    setRotating(true);
    setRotateErr(null);
    try {
      const res = await authFetch(`${getApiBase()}/orgs/key/rotate`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { api_key?: string };
      setApiKey(json.api_key || null);
      if (json.api_key) {
        setCurrentApiKey(`${json.api_key.slice(0, 8)}...${json.api_key.slice(-4)}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to rotate key";
      setRotateErr(message);
    } finally {
      setRotating(false);
    }
  }

  async function copyToClipboard(text?: string) {
    const textToCopy = text || apiKey;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleOrgSave() {
    setOrgSaveState("saving");
    // Mock save
    await new Promise((resolve) => setTimeout(resolve, 500));
    setOrgSaveState("saved");
    setTimeout(() => setOrgSaveState("idle"), 2000);
  }

  async function handleDataSave() {
    setDataSaveState("saving");
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDataSaveState("saved");
    setTimeout(() => setDataSaveState("idle"), 2000);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await authFetch(`${getApiBase()}/leads?page_size=1000`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `leads-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Handle error
    } finally {
      setExporting(false);
    }
  }

  function handleTwoFAVerify() {
    setTwoFAError(null);
    // Demo verification - accepts "123456" or any 6-digit code
    if (twoFACode.length === 6 && /^\d{6}$/.test(twoFACode)) {
      setTwoFAStep("enabled");
      setTwoFACode("");
    } else {
      setTwoFAError("Invalid verification code. Please enter a 6-digit code.");
    }
  }

  function handleDisableTwoFA() {
    setTwoFAStep("disabled");
    setTwoFACode("");
    setTwoFAError(null);
  }

  const themeOptions: { value: Theme; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      description: "Bright and clear",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      description: "Easy on the eyes",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ),
    },
    {
      value: "system",
      label: "System",
      description: "Match device settings",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const timezones = [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
  ];

  const dateFormats = [
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US)" },
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (EU)" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize your workspace and manage organization settings
        </p>
      </header>

      {/* Appearance */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {themeOptions.map((option) => (
              <label
                key={option.value}
                className={`relative flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === option.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="sr-only"
                />
                <div className={`p-3 rounded-xl mb-3 ${
                  theme === option.value
                    ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>
                  {option.icon}
                </div>
                <div className={`font-medium ${
                  theme === option.value
                    ? "text-indigo-700 dark:text-indigo-300"
                    : "text-gray-900 dark:text-white"
                }`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </div>
                {theme === option.value && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* Organization Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure your organization settings</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Your Company Name"
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {dateFormats.map((df) => (
                  <option key={df.value} value={df.value}>{df.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleOrgSave}
            disabled={orgSaveState === "saving"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {orgSaveState === "saving" ? "Saving..." : orgSaveState === "saved" ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Data & Privacy</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage notifications and data preferences</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Lead Notifications</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Email alerts for new leads</div>
            </div>
            <input
              type="checkbox"
              checked={leadNotifications}
              onChange={(e) => setLeadNotifications(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl cursor-pointer">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Weekly Reports</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Receive weekly summary emails</div>
            </div>
            <input
              type="checkbox"
              checked={weeklyReports}
              onChange={(e) => setWeeklyReports(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Data Retention
            </label>
            <select
              value={dataRetention}
              onChange={(e) => setDataRetention(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="forever">Forever</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              How long to keep lead data before automatic deletion
            </p>
          </div>

          <button
            onClick={handleDataSave}
            disabled={dataSaveState === "saving"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {dataSaveState === "saving" ? "Saving..." : dataSaveState === "saved" ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      </section>

      {/* API Keys */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage keys for widgets and integrations</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Current Key */}
          {currentApiKey && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Current API Key</div>
                  <code className="text-sm font-mono text-gray-600 dark:text-gray-400">{currentApiKey}</code>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Rotate API Key</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Generate a new key. The current key will be invalidated immediately.
              </div>
            </div>
            <button
              onClick={rotateOrgKey}
              disabled={rotating}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {rotating ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Rotating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Rotate Key
                </>
              )}
            </button>
          </div>

          {rotateErr && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {rotateErr}
            </div>
          )}

          {apiKey && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">New key generated successfully!</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-white dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 break-all border border-emerald-200 dark:border-emerald-800">
                  {apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard()}
                  className="p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                Copy this key now. You won't be able to see it again.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Export & Import */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export & Import</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Backup and restore your data</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Export Leads</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Download as JSON</div>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </>
                )}
              </button>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Import Leads</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Upload CSV file</div>
                </div>
              </div>
              <button
                onClick={() => setCsvImportOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security - Two-Factor Authentication */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg">
              <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Two-factor authentication and security settings</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* 2FA Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${twoFAStep === "enabled" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-700"}`}>
                <svg className={`w-5 h-5 ${twoFAStep === "enabled" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {twoFAStep === "enabled" ? "Enabled - Your account is protected" : "Add extra security to your account"}
                </div>
              </div>
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              twoFAStep === "enabled"
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
            }`}>
              {twoFAStep === "enabled" ? "Enabled" : "Disabled"}
            </span>
          </div>

          {/* 2FA Setup Flow */}
          {twoFAStep === "disabled" && (
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">How it works</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium shrink-0">1</span>
                    Download an authenticator app (Google Authenticator, Authy, etc.)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium shrink-0">2</span>
                    Scan the QR code with your authenticator app
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium shrink-0">3</span>
                    Enter the 6-digit code to verify setup
                  </li>
                </ul>
              </div>
              <button
                onClick={() => setTwoFAStep("setup")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Enable Two-Factor Authentication
              </button>
            </div>
          )}

          {twoFAStep === "setup" && (
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Step 1: Scan QR Code</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* QR Code placeholder - deterministic pattern */}
                  <div className="w-40 h-40 bg-white border-2 border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                    <div className="w-32 h-32 bg-gradient-to-br from-gray-900 to-gray-700 rounded p-2">
                      <div className="w-full h-full grid grid-cols-7 gap-0.5">
                        {[1,1,1,1,1,1,1,1,0,0,1,0,0,1,1,0,1,0,1,0,1,1,0,1,0,1,0,1,1,0,1,0,1,0,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,1,0,0,1,0,0,1,1,1,1,1,1,1,1,0,0,1,0,0,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,1,0,0,1,1].map((v, i) => (
                          <div
                            key={i}
                            className={v ? "bg-white" : "bg-transparent"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Scan this QR code with your authenticator app. If you can't scan, enter this key manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm font-mono text-gray-900 dark:text-gray-100 break-all">
                        {twoFASecret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(twoFASecret)}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Copy secret key"
                      >
                        {copied ? (
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Step 2: Enter Verification Code</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full sm:w-40 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  />
                  <button
                    onClick={() => setTwoFAStep("verify")}
                    disabled={twoFACode.length !== 6}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Verify & Enable
                  </button>
                </div>
                {twoFAError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{twoFAError}</p>
                )}
              </div>

              <button
                onClick={() => { setTwoFAStep("disabled"); setTwoFACode(""); setTwoFAError(null); }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel setup
              </button>
            </div>
          )}

          {twoFAStep === "verify" && (
            <VerifyingState onVerify={handleTwoFAVerify} />
          )}

          {twoFAStep === "enabled" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-emerald-800 dark:text-emerald-200">Two-Factor Authentication Enabled</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      Your account is now protected with two-factor authentication. You'll need to enter a code from your authenticator app each time you sign in.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Codes */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Backup Codes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Save these codes in a safe place. You can use them to access your account if you lose your authenticator device.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {backupCodes.map((code, idx) => (
                    <code key={idx} className="px-2 py-1.5 bg-gray-100 dark:bg-gray-900 rounded text-sm font-mono text-center">
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => copyToClipboard(backupCodes.join("\n"))}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {copied ? "Copied!" : "Copy all codes"}
                </button>
              </div>

              <button
                onClick={handleDisableTwoFA}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Disable Two-Factor Authentication
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quick actions for power users</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { keys: ["Ctrl", "K"], action: "Quick search" },
              { keys: ["Ctrl", "N"], action: "New lead" },
              { keys: ["Ctrl", "S"], action: "Save changes" },
              { keys: ["Esc"], action: "Close modal" },
              { keys: ["?"], action: "Show shortcuts" },
              { keys: ["G", "H"], action: "Go to dashboard" },
            ].map((shortcut, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">{shortcut.action}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, kidx) => (
                    <span key={kidx}>
                      <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                        {key}
                      </kbd>
                      {kidx < shortcut.keys.length - 1 && <span className="mx-1 text-gray-400">+</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImportComplete={() => setCsvImportOpen(false)}
      />
    </div>
  );
}
