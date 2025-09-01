// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import { applyTheme, getSavedTheme, type Theme } from "@/utils/theme";

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>(() => getSavedTheme());
  const [rotating, setRotating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [rotateErr, setRotateErr] = useState<string | null>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  async function rotateOrgKey() {
    setRotating(true);
    setRotateErr(null);
    try {
      const res = await fetch("/orgs/key/rotate", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { api_key?: string };
      setApiKey(json.api_key || null);
    } catch (e: any) {
      setRotateErr(e?.message || "Failed to rotate key");
    } finally {
      setRotating(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      {/* Appearance */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm mb-6">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Appearance</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose how SLMS looks on your device.
          </p>
        </div>
        <div className="px-6 py-6">
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
              />
              <span>Light</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
              />
              <span>Dark</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-pointer">
              <input
                type="radio"
                name="theme"
                value="system"
                checked={theme === "system"}
                onChange={() => setTheme("system")}
              />
              <span>System</span>
            </label>
          </fieldset>
        </div>
      </div>

      {/* Organization */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Organization</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage keys for public lead capture widgets and integrations.
          </p>
        </div>

        <div className="px-6 py-6 grid gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Public API Key</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Used by the <code>test-widget</code> and embedded forms. Rotating will
                invalidate old keys immediately.
              </div>
            </div>
            <button
              onClick={rotateOrgKey}
              disabled={rotating}
              className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {rotating ? "Rotating…" : "Rotate Key"}
            </button>
          </div>

          {rotateErr && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
              {rotateErr}
            </div>
          )}

          {apiKey && (
            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 px-3 py-2">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">New key</div>
              <code className="text-sm break-all">{apiKey}</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
