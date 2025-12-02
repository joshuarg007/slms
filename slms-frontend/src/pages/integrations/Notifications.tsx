// src/pages/integrations/Notifications.tsx
import { useEffect, useState } from "react";
import { getApiBase, refresh } from "@/utils/api";

type Channel = "email";

type NotificationSettings = {
  new_lead: boolean;
  crm_error: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  salesperson_digest: boolean;
};

type SavingState = "idle" | "saving" | "saved" | "error";

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

export default function Notifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    new_lead: true,
    crm_error: true,
    daily_digest: false,
    weekly_digest: true,
    salesperson_digest: false,
  });

  const [channel] = useState<Channel>("email");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<SavingState>("idle");
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingError(null);
      setBanner(null);

      try {
        const res = await authFetch(
          `${getApiBase()}/integrations/notifications`
        );

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(
            `Failed to load notification settings ${res.status} ${res.statusText} ${t}`
          );
        }

        const json = await res.json().catch(() => null);
        if (cancelled || !json) {
          setLoading(false);
          return;
        }

        const raw = json.settings as Partial<NotificationSettings> | undefined;

        if (raw) {
          setSettings((prev) => ({
            new_lead:
              typeof raw.new_lead === "boolean" ? raw.new_lead : prev.new_lead,
            crm_error:
              typeof raw.crm_error === "boolean"
                ? raw.crm_error
                : prev.crm_error,
            daily_digest:
              typeof raw.daily_digest === "boolean"
                ? raw.daily_digest
                : prev.daily_digest,
            weekly_digest:
              typeof raw.weekly_digest === "boolean"
                ? raw.weekly_digest
                : prev.weekly_digest,
            salesperson_digest:
              typeof raw.salesperson_digest === "boolean"
                ? raw.salesperson_digest
                : prev.salesperson_digest,
          }));
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load notification settings.";
          setLoadingError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(key: keyof NotificationSettings) {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSavingState("idle");
    setBanner(null);
  }

  async function handleSave() {
    setSavingState("saving");
    setBanner(null);
    try {
      const res = await authFetch(
        `${getApiBase()}/integrations/notifications`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, settings }),
        }
      );

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Save failed ${res.status} ${res.statusText} ${t}`
        );
      }

      setSavingState("saved");
      setBanner("Notification preferences saved for this organization.");
    } catch (e: unknown) {
      setSavingState("error");
      const message = e instanceof Error ? e.message : "Failed to save notification settings.";
      setBanner(message);
    }
  }

  function renderDigestSummary() {
    const parts: string[] = [];
    if (settings.daily_digest) parts.push("daily summary");
    if (settings.weekly_digest) parts.push("weekly summary");
    if (settings.salesperson_digest) parts.push("salesperson recap");

    if (!parts.length) {
      return "No digest emails are scheduled.";
    }

    if (parts.length === 1) {
      return `You will receive a ${parts[0]} by email.`;
    }

    if (parts.length === 2) {
      return `You will receive a ${parts[0]} and a ${parts[1]} by email.`;
    }

    return "You will receive daily and weekly digests plus a salesperson recap by email.";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alerts & Notifications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Control how Site2CRM alerts your team about new leads and updates
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={savingState === "saving"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {savingState === "saving" ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : savingState === "saved" ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </header>

      {/* Loading Error */}
      {loadingError && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {loadingError}
        </div>
      )}

      {/* Banner */}
      {banner && (
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
            savingState === "error"
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {savingState === "error" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {banner}
        </div>
      )}

      {/* Channel Info */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Primary Channel</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                    {channel} Alerts
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Organization wide
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All notifications are delivered by email to your configured recipients. Additional channels can be added later.
            </p>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                What This Covers
              </div>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Real-time alerts when a new lead is captured
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Alerts when CRM integrations fail to sync
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Optional daily and weekly summary emails
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Live Preview</h2>
          </div>
          <div className="p-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-3">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Subject</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {settings.new_lead
                    ? "New lead captured from your funnel"
                    : settings.crm_error
                    ? "Attention needed: CRM sync issue detected"
                    : "Your Site2CRM update"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {renderDigestSummary()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Real-time Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Alerts</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Instant notifications as events happen</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <ToggleRow
              label="New lead captured"
              description="Send an email when a new lead is created from your forms"
              checked={settings.new_lead}
              onChange={() => toggle("new_lead")}
            />
            <ToggleRow
              label="CRM integration errors"
              description="Send an email when a sync to your CRM fails"
              checked={settings.crm_error}
              onChange={() => toggle("crm_error")}
            />
          </div>
        </div>

        {/* Digest Emails */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Digest Emails</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bundled activity summaries</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <ToggleRow
              label="Daily summary"
              description="A short daily recap of new leads and activity"
              checked={settings.daily_digest}
              onChange={() => toggle("daily_digest")}
            />
            <ToggleRow
              label="Weekly summary"
              description="A weekly rollup of lead volume and pipeline"
              checked={settings.weekly_digest}
              onChange={() => toggle("weekly_digest")}
            />
            <ToggleRow
              label="Salesperson recap"
              description="Weekly salesperson performance metrics"
              checked={settings.salesperson_digest}
              onChange={() => toggle("salesperson_digest")}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Loading current notification settings...
        </div>
      )}
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
};

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {label}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked
            ? "bg-indigo-600"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
