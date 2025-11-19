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

// Auth helper with cookie include and refresh on 401
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
      } catch (e: any) {
        if (!cancelled) {
          setLoadingError(
            e?.message ||
              "Failed to load alerts and notifications settings using safe defaults for now."
          );
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
    } catch (e: any) {
      setSavingState("error");
      setBanner(
        e?.message ||
          "Failed to save notification settings. Nothing has been changed on the server."
      );
    }
  }

  function renderSavingLabel() {
    if (savingState === "saving") return "Saving";
    if (savingState === "saved") return "Saved";
    if (savingState === "error") return "Try again";
    return "Save changes";
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
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Alerts and notifications</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Control how Site2CRM alerts your team about new leads, integration
            issues, and summary reports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={savingState === "saving"}
          className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
        >
          {renderSavingLabel()}
        </button>
      </header>

      {loadingError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {loadingError}
        </div>
      )}

      {banner && (
        <div
          className={[
            "rounded-lg px-3 py-2 text-sm",
            savingState === "error"
              ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200",
          ].join(" ")}
        >
          {banner}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Primary channel
              </div>
              <div className="mt-1 text-base font-medium capitalize">
                {channel} alerts
              </div>
            </div>
            <div className="rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-1 text-xs text-gray-600 dark:text-gray-300">
              Organization wide
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            For now all notifications are delivered by email to your configured
            recipients for this organization. Additional channels can be added
            later.
          </p>

          <div className="mt-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              What this covers
            </div>
            <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-200">
              <li>Real time alerts when a new lead is captured.</li>
              <li>Alerts when CRM integrations fail to sync correctly.</li>
              <li>Optional daily and weekly summary emails.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 text-xs space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Live preview
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-3 space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
              Subject
            </div>
            <div className="text-[13px] text-gray-800 dark:text-gray-100">
              {settings.new_lead
                ? "New lead captured from your funnel"
                : settings.crm_error
                ? "Attention needed CRM sync issue detected"
                : "Your Site2CRM update"}
            </div>

            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-2">
              Summary
            </div>
            <div className="text-[12px] text-gray-700 dark:text-gray-200">
              {renderDigestSummary()}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold">Real time alerts</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            These alerts fire as events happen. They keep your team aware of new
            opportunities and problems that require quick attention.
          </p>

          <div className="mt-3 space-y-3 text-sm">
            <ToggleRow
              label="New lead captured"
              description="Send an email when a new lead is created from your public forms or integrations."
              checked={settings.new_lead}
              onChange={() => toggle("new_lead")}
            />
            <ToggleRow
              label="CRM integration errors"
              description="Send an email when a sync to your active CRM fails or becomes unhealthy."
              checked={settings.crm_error}
              onChange={() => toggle("crm_error")}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold">Digest emails</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Digest emails bundle activity into fewer messages so your inbox
            stays focused while leaders still see the bigger picture.
          </p>

          <div className="mt-3 space-y-3 text-sm">
            <ToggleRow
              label="Daily summary"
              description="A short daily recap of new leads and recent sales activity."
              checked={settings.daily_digest}
              onChange={() => toggle("daily_digest")}
            />
            <ToggleRow
              label="Weekly summary"
              description="A weekly rollup of lead volume and pipeline movement."
              checked={settings.weekly_digest}
              onChange={() => toggle("weekly_digest")}
            />
            <ToggleRow
              label="Salesperson recap"
              description="A weekly recap focused on salesperson performance metrics."
              checked={settings.salesperson_digest}
              onChange={() => toggle("salesperson_digest")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60 px-5 py-4 text-xs">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Coming soon
        </div>
        <p className="mt-2 text-gray-700 dark:text-gray-200">
          Slack channels and other destinations can be wired into the same rules
          that power email alerts so that your team meets the lead where they
          already work.
        </p>
      </section>

      {loading && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Loading current notification settings
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
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={[
          "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
          checked
            ? "bg-emerald-500 border-emerald-500"
            : "bg-gray-300 border-gray-300 dark:bg-gray-700 dark:border-gray-700",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </label>
  );
}
