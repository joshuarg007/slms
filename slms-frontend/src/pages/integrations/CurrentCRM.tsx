// src/pages/integrations/CurrentCRM.tsx
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

export default function CurrentCRM() {
  const [activeCRM, setActiveCRM] = useState<CRM | null>(null);
  const [creds, setCreds] = useState<CredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadingError(null);
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
        setCreds(Array.isArray(credsJson) ? credsJson : []);
      } catch (e: unknown) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "Failed to load current CRM configuration.";
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

  function getCredential(provider: CRM): CredentialSummary | undefined {
    return creds.find((c) => c.provider === provider && c.is_active);
  }

  const sfConnected =
    Array.isArray(creds) &&
    creds.some((c) => c.provider === "salesforce" && c.is_active);

  const hubspotCred = getCredential("hubspot");
  const pipedriveCred = getCredential("pipedrive");
  const salesforceCred = getCredential("salesforce");
  const nutshellCred = getCredential("nutshell");

  const activeCred = activeCRM ? getCredential(activeCRM) : undefined;

  function lastUpdated(cred?: CredentialSummary): string | null {
    const ts = cred?.updated_at || cred?.created_at;
    if (!ts) return null;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString();
  }

  const activeLastUpdated = lastUpdated(activeCred);
  const anyConnected = !!(hubspotCred || pipedriveCred || salesforceCred || nutshellCred);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Current CRM</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-xl">
            Review your active CRM connection and verify credentials are healthy
          </p>
        </div>

        <Link
          to="/app/integrations/update"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Update CRM
        </Link>
      </header>

      {/* Error */}
      {loadingError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {loadingError}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Active CRM Card */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Active CRM</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {loading ? "Loading..." : activeCRM ? labelOf(activeCRM) : "No active CRM"}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  activeCred
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                }`}
              >
                {activeCred ? "Connected" : "No credentials"}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Lead capture supports all CRMs. Salesperson analytics are fully available for Pipedrive, Nutshell, and Salesforce. HubSpot analytics may require additional scopes on paid plans.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Connection Details
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {activeCred ? (
                    <span>
                      Token ending in <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-xs">…{activeCred.token_suffix || "****"}</code>
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">No active token</span>
                  )}
                </div>
                {activeLastUpdated && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last updated {activeLastUpdated}
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Integration Health
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {anyConnected
                    ? "At least one CRM connected"
                    : "No CRM credentials detected"}
                </div>
                {sfConnected && activeCRM === "salesforce" && (
                  <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                    Salesforce org connected
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Providers List */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Providers at a Glance</h2>
          </div>
          <div className="p-4 space-y-2">
            {CRM_OPTIONS.map((opt) => {
              const cred = getCredential(opt.id);
              const isActive = activeCRM === opt.id;
              return (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isActive
                      ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-100 dark:border-gray-700"
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {cred ? `Token …${cred.token_suffix || "****"}` : "No credentials"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        cred
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {cred ? "Connected" : "Not connected"}
                    </span>
                    {isActive && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      {activeCRM && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {labelOf(activeCRM)} Capabilities
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              View only — change CRM on Update page
            </span>
          </div>
          <div className="p-6">
            <CrmCapabilityChips items={capabilityItemsFor(activeCRM)} />
          </div>
        </div>
      )}
    </div>
  );
}

function labelOf(id: CRM) {
  return CRM_OPTIONS.find((o) => o.id === id)?.label || id;
}

function capabilityItemsFor(crm: CRM) {
  if (crm === "hubspot") {
    return [
      { id: "hubspot-leads", label: "Lead capture", level: "full" as const, tooltip: "Push new leads and contacts into HubSpot." },
      { id: "hubspot-owners", label: "Owner lookup", level: "partial" as const, tooltip: "Requires owner scopes on a paid HubSpot plan or private app token." },
      { id: "hubspot-analytics", label: "Sales analytics", level: "limited" as const, tooltip: "Full salesperson stats require a HubSpot Professional tier portal." },
    ];
  }

  if (crm === "pipedrive") {
    return [
      { id: "pd-leads", label: "Lead capture", level: "full" as const, tooltip: "Create and update leads in Pipedrive." },
      { id: "pd-owners", label: "Owner and activity stats", level: "full" as const, tooltip: "Owners and activities are fully supported through the Pipedrive API." },
      { id: "pd-analytics", label: "Sales analytics", level: "full" as const, tooltip: "Salesperson stats and dashboards are first class with Pipedrive." },
    ];
  }

  if (crm === "salesforce") {
    return [
      { id: "sf-leads", label: "Lead capture", level: "full" as const, tooltip: "Create leads and contacts inside Salesforce." },
      { id: "sf-owners", label: "Owner and pipeline data", level: "full" as const, tooltip: "Standard Salesforce objects power salesperson and pipeline stats." },
      { id: "sf-analytics", label: "Sales analytics", level: "full" as const, tooltip: "Ideal for advanced analytics and enterprise reporting requirements." },
    ];
  }

  return [
    { id: "nutshell-leads", label: "Lead capture", level: "full" as const, tooltip: "Create and sync leads into Nutshell." },
    { id: "nutshell-owners", label: "Owner and activity stats", level: "full" as const, tooltip: "Nutshell APIs expose owners, pipelines, and activities for stats." },
    { id: "nutshell-analytics", label: "Sales analytics", level: "full" as const, tooltip: "Full salesperson analytics available once an API key is connected." },
  ];
}
