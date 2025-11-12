// src/pages/IntegrationsPage.tsx
import { useEffect, useState } from "react";
import { getApiBase } from "@/utils/api";

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

export default function IntegrationsPage() {
  const [activeCRM, setActiveCRM] = useState<CRM>("hubspot");
  const [editing, setEditing] = useState<CRM>("hubspot");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Org-level credentials state
  const [creds, setCreds] = useState<CredentialSummary[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);

  // Token inputs for per-org PAT/API keys
  const [hubspotToken, setHubspotToken] = useState("");
  const [pipedriveToken, setPipedriveToken] = useState("");
  const [nutshellToken, setNutshellToken] = useState("");
  const [tokenBusy, setTokenBusy] = useState<CRM | null>(null);

  // Salesforce connection state (OAuth)
  const [sfConnected, setSfConnected] = useState(false);
  const [sfBusy, setSfBusy] = useState(false);
  const [sfErr, setSfErr] = useState<string | null>(null);

  // Load active CRM from backend
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${getApiBase()}/integrations/crm/active`, { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { provider: CRM };
        setActiveCRM(j.provider);
        setEditing(j.provider);
      } catch {
        setMsg("Could not load active CRM from server; defaulting to HubSpot.");
      }
    })();
  }, []);

  // Load credentials (for all providers)
  async function refreshCreds() {
    setLoadingCreds(true);
    try {
      const res = await fetch(`${getApiBase()}/integrations/credentials`, { credentials: "include" });
      if (!res.ok) return;
      const items = (await res.json()) as CredentialSummary[];
      setCreds(items || []);

      const hasSF =
        Array.isArray(items) &&
        items.some((c) => c.provider === "salesforce" && c.is_active);
      setSfConnected(!!hasSF);
    } catch {
      // ignore; non-blocking
    } finally {
      setLoadingCreds(false);
    }
  }

  useEffect(() => {
    refreshCreds();
  }, []);

  // Detect ?salesforce=connected after OAuth and refresh status, then clean URL
  useEffect(() => {
    (async () => {
      const usp = new URLSearchParams(window.location.search);
      if (usp.get("salesforce") === "connected") {
        try {
          await refreshCreds();
        } finally {
          usp.delete("salesforce");
          const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
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
      `Switch active CRM from ${labelOf(activeCRM)} to ${labelOf(editing)}?\n\n` +
        "This will change where new leads and salesperson stats are pulled from. " +
        "You can switch back any time in Integrations.",
    );
    if (!confirmed) {
      setEditing(activeCRM);
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${getApiBase()}/integrations/crm/active`, {
        method: "POST",
        credentials: "include",
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
      setMsg(e?.message || "Failed to save selection");
      setEditing(activeCRM); // roll back UI
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
      setSfErr(e?.message || "Failed to start Salesforce auth");
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
      const res = await fetch(`${getApiBase()}/integrations/credentials`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Failed to save credentials: ${res.status} ${res.statusText} – ${t}`);
      }
      await refreshCreds();
      if (provider === "hubspot") setHubspotToken("");
      if (provider === "pipedrive") setPipedriveToken("");
      if (provider === "nutshell") setNutshellToken("");
      setMsg(`${labelOf(provider)} credentials saved.`);
    } catch (e: any) {
      setMsg(e?.message || "Failed to save credentials");
    } finally {
      setTokenBusy(null);
    }
  }

  const hubspotCred = getActiveCredential("hubspot");
  const pipedriveCred = getActiveCredential("pipedrive");
  const nutshellCred = getActiveCredential("nutshell");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <button
          onClick={onSave}
          disabled={saving || editing === activeCRM}
          className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      {msg && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {msg}
        </div>
      )}

      {/* Active CRM card */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-medium">Active CRM</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose the primary CRM for lead capture and salesperson analytics. You’ll be asked to confirm before switching.
          </p>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {CRM_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors
                ${
                  editing === opt.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="crm"
                  value={opt.id}
                  checked={editing === opt.id}
                  onChange={() => onSelect(opt.id)}
                  className="h-4 w-4"
                />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Current: <span className="font-medium">{labelOf(activeCRM)}</span>
            </p>
            <p className="mt-1">
              Make sure you’ve added API credentials for the selected CRM in the sections below.
            </p>
          </div>
        </div>
      </section>

      {/* Provider sections */}
      <div className="mt-6 grid gap-6">
        {/* HubSpot */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            activeCRM === "hubspot"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">HubSpot</h3>
            {activeCRM !== "hubspot" && (
              <span className="text-xs rounded-full border px-2 py-0.5 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Private app token with: crm.objects.owners.read, crm.objects.deals.read, engagements read scopes.
          </p>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : hubspotCred ? (
              <span>
                Active token ending in <code>…{hubspotCred.token_suffix}</code>
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
                placeholder="Enter HubSpot private app token"
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
              Docs
            </a>
          </div>
        </section>

        {/* Pipedrive */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            activeCRM === "pipedrive"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Pipedrive</h3>
            {activeCRM !== "pipedrive" && (
              <span className="text-xs rounded-full border px-2 py-0.5 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Use a company-wide API token for now; OAuth coming soon.
          </p>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : pipedriveCred ? (
              <span>
                Active token ending in <code>…{pipedriveCred.token_suffix}</code>
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
              Docs
            </a>
          </div>
        </section>

        {/* Salesforce (OAuth) */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            activeCRM === "salesforce"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Salesforce</h3>
            {activeCRM !== "salesforce" && (
              <span className="text-xs rounded-full border px-2 py-0.5 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Connected App (OAuth 2.0). Click connect to authorize SLMS with your org.
          </p>

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
                  : "Manage Connection"
                : sfBusy
                ? "Connecting…"
                : "Connect Salesforce"}
            </button>
          </div>
        </section>

        {/* Nutshell */}
        <section
          className={`rounded-2xl border px-5 py-4 ${
            activeCRM === "nutshell"
              ? "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              : "border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 opacity-80"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Nutshell CRM</h3>
            {activeCRM !== "nutshell" && (
              <span className="text-xs rounded-full border px-2 py-0.5 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                Inactive
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            API key per organization. Paste your Nutshell API key below when this CRM is active.
          </p>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            {loadingCreds ? (
              <span>Checking credentials…</span>
            ) : nutshellCred ? (
              <span>
                Active key ending in <code>…{nutshellCred.token_suffix}</code>
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
              Docs
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
