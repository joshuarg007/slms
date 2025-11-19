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
      } catch (e: any) {
        if (!cancelled) {
          setLoadingError(
            e?.message || "Failed to load current CRM configuration."
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
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Current CRM</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Review your active CRM connection, see which providers are connected,
            and confirm that credentials are healthy before changing anything.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Link
            to="/integrations/update"
            className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-60"
          >
            Go to Update CRM
          </Link>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Changes to the active CRM are made on the Update CRM page.
          </span>
        </div>
      </header>

      {/* Error */}
      {loadingError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {loadingError}
        </div>
      )}

      {/* High level status */}
      <section className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Active CRM card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Active CRM
              </div>
              <div className="mt-1 text-lg font-semibold">
                {loading
                  ? "Loading..."
                  : activeCRM
                  ? labelOf(activeCRM)
                  : "No active CRM set"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " +
                  (activeCred
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200")
                }
              >
                {activeCred ? "Credentials connected" : "No credentials found"}
              </span>
              {sfConnected && activeCRM === "salesforce" && (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
                  Salesforce org connected
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Lead capture supports all CRMs. Salesperson analytics are fully
            available for Pipedrive, Nutshell, and Salesforce. HubSpot analytics
            may require additional scopes on paid plans.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-2.5 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Connection summary
              </div>
              <div className="mt-1 text-gray-800 dark:text-gray-200">
                {activeCred ? (
                  <span>
                    Token ending in{" "}
                    <code className="text-[11px]">
                      …{activeCred.token_suffix || "****"}
                    </code>
                  </span>
                ) : (
                  <span>No active token saved for this CRM.</span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {activeLastUpdated
                  ? `Last updated ${activeLastUpdated}`
                  : "No credential timestamps available yet."}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-3 py-2.5 text-xs">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Overall integration health
              </div>
              <div className="mt-1 text-gray-800 dark:text-gray-200">
                {anyConnected ? (
                  <span>
                    At least one CRM is connected with valid credentials. Use the
                    Update CRM page to switch the active provider if needed.
                  </span>
                ) : (
                  <span>
                    No CRM credentials detected for this organization. Configure
                    at least one provider before routing leads.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick provider status */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Providers at a glance
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              Connected / Active
            </div>
          </div>

          <div className="space-y-2">
            {CRM_OPTIONS.map((opt) => {
              const cred = getCredential(opt.id);
              const isActive = activeCRM === opt.id;
              return (
                <div
                  key={opt.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/50 px-3 py-2"
                >
                  <div>
                    <div className="text-[13px] font-medium">{opt.label}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {cred
                        ? `Token …${cred.token_suffix || "****"}`
                        : "No credentials saved"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                        (cred
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300")
                      }
                    >
                      {cred ? "Connected" : "Not connected"}
                    </span>
                    {isActive && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Active CRM capabilities */}
      {activeCRM && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {labelOf(activeCRM)} capabilities
            </h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              View only. To change CRM, use Update CRM.
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            This summarizes what Site2CRM is designed to do with your current CRM
            provider. Exact behavior can depend on plan level and scopes.
          </div>

          <CrmCapabilityChips
            items={capabilityItemsFor(activeCRM)}
          />
        </section>
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
      {
        id: "hubspot-leads",
        label: "Lead capture",
        level: "full" as const,
        tooltip: "Push new leads and contacts into HubSpot.",
      },
      {
        id: "hubspot-owners",
        label: "Owner lookup",
        level: "partial" as const,
        tooltip:
          "Requires owner scopes on a paid HubSpot plan or private app token.",
      },
      {
        id: "hubspot-analytics",
        label: "Sales analytics",
        level: "limited" as const,
        tooltip:
          "Full salesperson stats require a HubSpot Professional tier portal.",
      },
    ];
  }

  if (crm === "pipedrive") {
    return [
      {
        id: "pd-leads",
        label: "Lead capture",
        level: "full" as const,
        tooltip: "Create and update leads in Pipedrive.",
      },
      {
        id: "pd-owners",
        label: "Owner and activity stats",
        level: "full" as const,
        tooltip:
          "Owners and activities are fully supported through the Pipedrive API.",
      },
      {
        id: "pd-analytics",
        label: "Sales analytics",
        level: "full" as const,
        tooltip:
          "Salesperson stats and dashboards are first class with Pipedrive.",
      },
    ];
  }

  if (crm === "salesforce") {
    return [
      {
        id: "sf-leads",
        label: "Lead capture",
        level: "full" as const,
        tooltip: "Create leads and contacts inside Salesforce.",
      },
      {
        id: "sf-owners",
        label: "Owner and pipeline data",
        level: "full" as const,
        tooltip:
          "Standard Salesforce objects power salesperson and pipeline stats.",
      },
      {
        id: "sf-analytics",
        label: "Sales analytics",
        level: "full" as const,
        tooltip:
          "Ideal for advanced analytics and enterprise reporting requirements.",
      },
    ];
  }

  return [
    {
      id: "nutshell-leads",
      label: "Lead capture",
      level: "full" as const,
      tooltip: "Create and sync leads into Nutshell.",
    },
    {
      id: "nutshell-owners",
      label: "Owner and activity stats",
      level: "full" as const,
      tooltip:
        "Nutshell APIs expose owners, pipelines, and activities for stats.",
    },
    {
      id: "nutshell-analytics",
      label: "Sales analytics",
      level: "full" as const,
      tooltip:
        "Full salesperson analytics available once an API key is connected.",
    },
  ];
}
