// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/utils/theme";

const DEFAULT_API =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
const API_KEY = "slms.apiBase";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [apiBase, setApiBase] = useState<string>("");
  const [savedApiBase, setSavedApiBase] = useState<string | null>(null);
  const [provider, setProvider] = useState<"hubspot" | "pipedrive" | "nutshell" | "salesforce">(
    "hubspot"
  );

  useEffect(() => {
    const stored = localStorage.getItem(API_KEY);
    setSavedApiBase(stored);
    setApiBase(stored || DEFAULT_API);
  }, []);

  function saveApiBase() {
    const cleaned = (apiBase || "").replace(/\/$/, "");
    localStorage.setItem(API_KEY, cleaned);
    setSavedApiBase(cleaned);
  }

  function resetApiBase() {
    localStorage.removeItem(API_KEY);
    setSavedApiBase(null);
    setApiBase(DEFAULT_API);
  }

  const themeOptions: { value: Theme; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      {/* API base */}
      <section className="rounded-2xl shadow p-5 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-medium mb-2">API</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Override the API base URL at runtime (stored in your browser only). Leave it as-is for
          local dev.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            className="rounded-md border border-gray-300 px-3 py-2 w-full dark:bg-gray-800 dark:border-gray-700"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder={DEFAULT_API}
          />
          <button onClick={saveApiBase} className="rounded-md bg-blue-600 text-white px-4 py-2">
            Save
          </button>
          <button onClick={resetApiBase} className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-700">
            Reset
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Current (effective): <code>{savedApiBase || DEFAULT_API}</code>
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-2xl shadow p-5 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-medium mb-2">Theme</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Choose between Light, Dark, or follow your system setting. This preference is saved in your browser.
        </p>
        <div className="flex items-center gap-6">
          {themeOptions.map((opt) => (
            <label key={opt.value} className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={theme === opt.value}
                onChange={() => setTheme(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* CRM provider */}
      <section className="rounded-2xl shadow p-5 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-medium mb-2">CRM Provider</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          HubSpot works today. The rest are planned; switches are disabled until their adapters are live.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="crm"
              checked={provider === "hubspot"}
              onChange={() => setProvider("hubspot")}
            />
            <span>HubSpot (active)</span>
          </label>

          <label className="flex items-center gap-2 text-gray-400">
            <input type="radio" name="crm" disabled />
            <span>Pipedrive (coming soon)</span>
          </label>

          <label className="flex items-center gap-2 text-gray-400">
            <input type="radio" name="crm" disabled />
            <span>Nutshell CRM (coming soon)</span>
          </label>

          <label className="flex items-center gap-2 text-gray-400">
            <input type="radio" name="crm" disabled />
            <span>Salesforce (coming soon)</span>
          </label>
        </div>
      </section>

      {/* Feature toggles (placeholders) */}
      <section className="rounded-2xl shadow p-5 bg-white dark:bg-gray-900">
        <h2 className="text-lg font-medium mb-2">Features</h2>
        <div className="grid gap-3">
          <label className="flex items-center justify-between">
            <span>Lead scoring (AI)</span>
            <input type="checkbox" disabled />
          </label>
          <label className="flex items-center justify-between">
            <span>Salesperson coaching (AI)</span>
            <input type="checkbox" disabled />
          </label>
          <label className="flex items-center justify-between">
            <span>Weekly email reports</span>
            <input type="checkbox" disabled />
          </label>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          These will be configurable once the corresponding endpoints and jobs are wired.
        </p>
      </section>
    </div>
  );
}
