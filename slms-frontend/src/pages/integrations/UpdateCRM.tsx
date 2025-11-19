// src/pages/integrations/UpdateCRM.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase, refresh } from "@/utils/api";
import CrmCapabilityChips from "@/components/CRMCapabilityChips";

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell";

const CRM_OPTIONS: { id: CRM; label: string }[] = [
  { id: "hubspot", label: "HubSpot" },
  { id: "pipedrive", label: "Pipedrive" },
  { id: "salesforce", label: "Salesforce" },
  { id: "nutshell", label: "Nutshell CRM" },
];

type CredentialSummary = {
  id: number;
  provider: string;
  auth_type: string;
  is_active: boolean;
  token_suffix?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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

export default function UpdateCRM() {
  const [activeCRM, setActiveCRM] = useState<CRM>("hubspot");
  const [editing, setEditing] = useState<CRM>("hubspot");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [creds, setCreds] = useState<CredentialSummary[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  const [hubspotToken, setHubspotToken] = useState("");
  const [pipedriveToken, setPipedriveToken] = useState("");
  const [nutshellToken, setNutshellToken] = useState("");
  const [tokenBusy, setTokenBusy] = useState<CRM | null>(null);

  const [sfConnected, setSfConnected] = useState(false);
  const [sfBusy, setSfBusy] = useState(false);
  const [sfErr, setSfErr] = useState<string | null>(null);

  // Load active CRM and credentials
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMsg(null);

      try {
        const [activeRes, credsRes] = await Promise.all([
          authFetch(`${getApiBase()}/integrations/crm/active`),
          authFetch(`${getApiBase()}/integrations/credentials`),
        ]);

        if (!activeRes.ok) {
          const t = await activeRes.text().catch(() => "");
          throw new Error(
            `Failed to load active CRM: ${activeRes.status} ${activeRes.statusText} ${t}`
          );
        }

        if (!credsRes.ok) {
          const t = await credsRes.text().catch(() => "");
          throw new Error(
            `Failed to load credentials: ${credsRes.status} ${credsRes.statusText} ${t}`
          );
        }

        const activeJson = (await activeRes.json()) as { provider: CRM };
        const credsJson = (await credsRes.json()) as CredentialSummary[];

        if (cancelled) return;

        setActiveCRM(activeJson.provider);
        setEditing(activeJson.provider);
        setCreds(Array.isArray(credsJson) ? credsJson : []);

        const hasSF =
          Array.isArray(credsJson) &&
          credsJson.some((c) => c.provider === "salesforce" && c.is_active);
        setSfConnected(Boolean(hasSF));
      } catch (e: any) {
        if (!cancelled) {
          setMsg(
            e?.message ||
              "Could not load active CRM and credentials. Defaulting to HubSpot."
          );
          setActiveCRM("hubspot");
          setEditing("hubspot");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshCreds() {
    setLoadingCreds(true);
    try {
      const res = await authFetch(`${getApiBase()}/integrations/credentials`);
      if (!res.ok) {
        return;
      }
      const items = (await res.json()) as CredentialSummary[];
      setCreds(items || []);

      const hasSF =
        Array.isArray(items) &&
        items.some((c) => c.provider === "salesforce" && c.is_active);
      setSfConnected(Boolean(hasSF));
    } catch {
      // non blocking
    } finally {
      setLoadingCreds(false);
    }
  }

  // Detect ?salesforce=connected after OAuth and refresh status, then clean URL
  useEffect(() => {
    (async () => {
      const usp = new URLSearchParams(window.location.search);
      if (usp.get("salesforce") === "connected") {
        try {
          await refreshCreds();
        } finally {
          usp.delete("salesforce");
          const next = `${window.location.pathname}${
            usp.toString() ? `?${usp}` : ""
          }`;
          window.history.replaceState({}, "", next);
          setMsg("Salesforce connected.");
        }
      }
    })();
  }, []);

  function onSelect(next: CRM) {
    setEditing(next);
  }

  async function onSave() {
    if (editing === activeCRM) {
      setMsg("No changes to save.");
      return;
    }

    const confirmed = window.confirm(
      `Switch active CRM from ${labelOf(
        activeCRM
      )} to ${labelOf(editing)}?\n\n` +
        "This changes where new leads and salesperson stats are pulled from. " +
        "You can switch back any time on this page."
    );

    if (!confirmed) {
      setEditing(activeCRM);
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const r = await authFetch(`${getApiBase()}/integrations/crm/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: editing }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`Save failed: ${r.status} ${r.statusText} – ${t}`);
      }
      const j = (await r.json()) as { provider: CRM };
      setActiveCRM(j.provider);
      setEditing(j.provider);
      setMsg(`Active CRM set to ${labelOf(j.provider)}.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to save selection.");
      setEditing(activeCRM);
    } finally {
      setSaving(false);
    }
  }

  async function connectSalesforce() {
    setSfBusy(true);
    setSfErr(null);
    try {
      window.location.href = `${getApiBase()}/integrations/salesforce/auth`;
    } catch (e: any) {
      setSfErr(e?.message || "Failed to start Salesforce auth.");
      setSfBusy(false);
    }
  }

  function getActiveCredential(provider: CRM): CredentialSummary | undefined {
    return creds.find((c) => c.provider === provider && c.is_active);
  }

  async function saveToken(provider: "hubspot" | "pipedrive" | "nutshell") {
    const value =
      provider === "hubspot"
        ? hubspotToken.trim()
        : provider === "pipedrive"
        ? pipedriveToken.trim()
        : nutshellToken.trim();

    if (!value) {
      setMsg("Enter a token before saving.");
      return;
    }

    setTokenBusy(provider);
    setMsg(null);
    try {
      const payload = {
        provider,
        access_token: value,
        auth_type: "pat",
        activate: true,
      };
      const res = await authFetch(`${getApiBase()}/integrations/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Failed to save credentials: ${res.status} ${res.statusText} – ${t}`
        );
      }
      await refreshCreds();
      if (provider === "hubspot") setHubspotToken("");
      if (provider === "pipedrive") setPipedriveToken("");
      if (provider === "nutshell") setNutshellToken("");
      setMsg(`${labelOf(provider)} credentials saved.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to save credentials.");
    } finally {
      setTokenBusy(null);
    }
  }

  const hubspotCred = getActiveCredential("hubspot");
  const pipedriveCred = getActiveCredential("pipedrive");
  const salesforceCred = getActiveCredential("salesforce");
  const nutshellCred = getActiveCredential("nutshell");

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Update CRM</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Choose your active CRM and manage organization level credentials.
            This controls where new leads are sent and which CRM powers analytics.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <button
            onClick={onSave}
            disabled={saving || editing === activeCRM}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            to="/integrations/current"
            className="text-xs text-indigo-600 hover:underline"
          >
            View current CRM overview
          </Link>
        </div>
      </header>

      {/* Message banner */}
      {msg && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {msg}
        </div>
      )}

      {/* Active CRM selector */}
      <section className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Active CRM
            </div>
            <div className="mt-1 text-base font-medium">
              {labelOf(activeCRM)}
            </div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Lead capture supports all CRMs. Salesperson analytics are available
              for Pipedrive, Nutshell, and Salesforce. HubSpot analytics may
              require additional scopes on paid HubSpot plans.
            </p>
          </div>

          <div className="mt-1 grid gap-2 sm:mt-0 sm:grid-cols-2">
            {CRM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={[
                  "rounded-xl border px-3 py-3 text-sm text-left transition-colors",
                  editing === opt.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{opt.label}</span>
                  {activeCRM === opt.id && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                      Current
                    </span>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                  {opt.id === "hubspot" && "Best for HubSpot lead sync."}
                  {opt.id === "pipedrive" && "Full analytics with low friction API."}
                  {opt.id === "salesforce" &&
                    "OAuth connection with advanced reporting."}
                  {opt.id === "nutshell" && "Lightweight CRM with API access."}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Provider sections */}
      <div className="grid gap-6">
        {/* HubSpot */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            editing === "hubspot"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">HubSpot</h3>
            <div className="flex items-center gap-2 text-xs">
              {hubspotCred ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <span className="rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-400">
                  No token
                </span>
              )}
              {activeCRM === "hubspot" && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Active
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Lead capture works on HubSpot Free. Advanced salesperson analytics
            need extra API scopes that are only available on paid HubSpot plans.
          </p>

          <CrmCapabilityChips
            items={[
              {
                id: "hubspot-leads",
                label: "Lead capture",
                level: "full",
                tooltip: "Push new leads and contacts into HubSpot.",
              },
              {
                id: "hubspot-owners",
                label: "Owner lookup",
                level: "partial",
                tooltip:
                  "Requires owner scopes on a paid HubSpot plan or private app token.",
              },
              {
                id: "hubspot-analytics",
                label: "Sales analytics",
                level: "limited",
                tooltip:
                  "Full salesperson stats require a HubSpot Professional tier portal.",
              },
            ]}
          />

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : hubspotCred ? (
              <span>
                Active token ending in{" "}
                <code>…{hubspotCred.token_suffix || "****"}</code>
              </span>
            ) : (
              <span>No HubSpot token saved yet for this organization.</span>
            )}
          </div>

          {editing === "hubspot" && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="password"
                value={hubspotToken}
                onChange={(e) => setHubspotToken(e.target.value)}
                placeholder="Enter HubSpot token or private app key"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => saveToken("hubspot")}
                disabled={tokenBusy === "hubspot"}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                {tokenBusy === "hubspot" ? "Saving…" : "Save token"}
              </button>
            </div>
          )}

          <div className="mt-3">
            <a
              href="https://developers.hubspot.com/docs/api/private-apps"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              HubSpot developer docs
            </a>
          </div>
        </section>

        {/* Pipedrive */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            editing === "pipedrive"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Pipedrive</h3>
            <div className="flex items-center gap-2 text-xs">
              {pipedriveCred ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <span className="rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-400">
                  No token
                </span>
              )}
              {activeCRM === "pipedrive" && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Active
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Use a company wide API token. Pipedrive enables full API access on all
            plans, which makes it ideal for development and advanced analytics.
          </p>

          <CrmCapabilityChips
            items={[
              {
                id: "pd-leads",
                label: "Lead capture",
                level: "full",
                tooltip: "Create and update leads in Pipedrive.",
              },
              {
                id: "pd-owners",
                label: "Owner and activity stats",
                level: "full",
                tooltip:
                  "Owners and activities are fully supported through the API.",
              },
              {
                id: "pd-analytics",
                label: "Sales analytics",
                level: "full",
                tooltip:
                  "Your salespeople stats dashboard uses Pipedrive as a first class source.",
              },
            ]}
          />

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : pipedriveCred ? (
              <span>
                Active token ending in{" "}
                <code>…{pipedriveCred.token_suffix || "****"}</code>
              </span>
            ) : (
              <span>No Pipedrive token saved yet for this organization.</span>
            )}
          </div>

          {editing === "pipedrive" && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="password"
                value={pipedriveToken}
                onChange={(e) => setPipedriveToken(e.target.value)}
                placeholder="Enter Pipedrive API token"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => saveToken("pipedrive")}
                disabled={tokenBusy === "pipedrive"}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                {tokenBusy === "pipedrive" ? "Saving…" : "Save token"}
              </button>
            </div>
          )}

          <div className="mt-3">
            <a
              href="https://pipedrive.readme.io/docs/marketplace-and-api"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              Pipedrive API docs
            </a>
          </div>
        </section>

        {/* Salesforce */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            editing === "salesforce"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Salesforce</h3>
            <div className="flex items-center gap-2 text-xs">
              {salesforceCred ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <span className="rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-400">
                  No connection
                </span>
              )}
              {activeCRM === "salesforce" && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Active
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connect a Salesforce org by authorizing a connected app. This works
            well with developer sandboxes for testing and with paid editions for
            production.
          </p>

          <CrmCapabilityChips
            items={[
              {
                id: "sf-leads",
                label: "Lead capture",
                level: "full",
                tooltip: "Create leads and contacts inside Salesforce.",
              },
              {
                id: "sf-owners",
                label: "Owner and pipeline data",
                level: "full",
                tooltip:
                  "Use standard Salesforce objects to power salesperson stats.",
              },
              {
                id: "sf-analytics",
                label: "Sales analytics",
                level: "full",
                tooltip:
                  "Salesforce support is ideal for advanced analytics and enterprise customers.",
              },
            ]}
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm">
              <div className="font-medium">Connection status</div>
              <div className="text-gray-600 dark:text-gray-400">
                {sfConnected ? "Connected" : "Not connected"}
              </div>
              {sfErr && (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
                  {sfErr}
                </div>
              )}
            </div>
            <button
              onClick={connectSalesforce}
              disabled={sfBusy}
              className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {sfConnected
                ? sfBusy
                  ? "Opening…"
                  : "Manage connection"
                : sfBusy
                ? "Connecting…"
                : "Connect Salesforce"}
            </button>
          </div>
        </section>

        {/* Nutshell */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            editing === "nutshell"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Nutshell CRM</h3>
            <div className="flex items-center gap-2 text-xs">
              {nutshellCred ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Connected
                </span>
              ) : (
                <span className="rounded-full border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-400">
                  No key
                </span>
              )}
              {activeCRM === "nutshell" && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                  Active
                </span>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Use an API key per organization. Nutshell can power both lead capture
            and salesperson analytics once a key is connected.
          </p>

          <CrmCapabilityChips
            items={[
              {
                id: "nutshell-leads",
                label: "Lead capture",
                level: "full",
                tooltip: "Create and sync leads into Nutshell.",
              },
              {
                id: "nutshell-owners",
                label: "Owner and activity stats",
                level: "full",
                tooltip:
                  "Nutshell APIs expose owners, pipelines, and activities for stats.",
              },
              {
                id: "nutshell-analytics",
                label: "Sales analytics",
                level: "full",
                tooltip:
                  "Full salesperson analytics available when an API key is connected.",
              },
            ]}
          />

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : nutshellCred ? (
              <span>
                Active key ending in{" "}
                <code>…{nutshellCred.token_suffix || "****"}</code>
              </span>
            ) : (
              <span>No Nutshell key saved yet for this organization.</span>
            )}
          </div>

          {editing === "nutshell" && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="password"
                value={nutshellToken}
                onChange={(e) => setNutshellToken(e.target.value)}
                placeholder="Enter Nutshell API key"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                onClick={() => saveToken("nutshell")}
                disabled={tokenBusy === "nutshell"}
                className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm disabled:opacity-60"
              >
                {tokenBusy === "nutshell" ? "Saving…" : "Save key"}
              </button>
            </div>
          )}

          <div className="mt-3">
            <a
              href="https://developers.nutshell.com/"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              Nutshell developer docs
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function labelOf(id: CRM) {
  return CRM_OPTIONS.find((o) => o.id === id)?.label || id;
}
