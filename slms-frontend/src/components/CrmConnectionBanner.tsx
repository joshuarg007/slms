// src/components/CrmConnectionBanner.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getApiBase } from "@/utils/api";

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell";

type ActiveCrmResponse = {
  provider: CRM;
};

type CredentialSummary = {
  id: number;
  provider: string;
  auth_type: string;
  is_active: boolean;
  token_suffix?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
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
    // ignore
  }

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

export default function CrmConnectionBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      setLoading(true);
      setMessage(null);

      try {
        const base = getApiBase();

        // 1. Who is the active CRM
        const activeRes = await authFetch(`${base}/integrations/crm/active`);

        if (activeRes.status === 401) {
          if (!cancelled) {
            setMessage(null);
            setLoading(false);
          }
          return;
        }

        if (!activeRes.ok) {
          if (!cancelled) {
            setMessage(null);
            setLoading(false);
          }
          return;
        }

        const active = (await activeRes.json()) as ActiveCrmResponse;
        const provider = active.provider as CRM;

        // 2. What credentials exist for this org
        const credsRes = await authFetch(`${base}/integrations/credentials`);
        if (!credsRes.ok) {
          if (!cancelled) {
            setMessage(null);
            setLoading(false);
          }
          return;
        }

        const items = (await credsRes.json()) as CredentialSummary[];
        const hasActive = items.some(
          (c) => c.provider === provider && c.is_active,
        );

        let msg: string | null = null;

        if (!hasActive) {
          if (provider === "salesforce") {
            msg =
              "Salesforce is selected as the active CRM but is not connected yet. Please connect Salesforce in Integrations before using salesperson analytics.";
          } else if (provider === "hubspot") {
            msg =
              "HubSpot is selected as the active CRM but no active token is configured for this organization. Add a HubSpot private app token in Integrations.";
          } else if (provider === "pipedrive") {
            msg =
              "Pipedrive is selected as the active CRM but no active API token is configured for this organization. Add a Pipedrive API token in Integrations.";
          } else if (provider === "nutshell") {
            msg =
              "Nutshell is selected as the active CRM but no active API key is configured for this organization. Add a Nutshell API key in Integrations.";
          }
        }

        // Optional light check for clearly broken Salesforce config
        if (!msg && provider === "salesforce") {
          try {
            const statsRes = await authFetch(
              `${base}/integrations/salespeople/stats?days=7`,
            );
            if (!statsRes.ok) {
              const text = await statsRes.text().catch(() => "");
              if (
                text.includes("instance_url not found") ||
                text.includes("SALESFORCE_INSTANCE_URL")
              ) {
                msg =
                  "Salesforce is selected as the active CRM but the Salesforce connection is incomplete. Please reconnect Salesforce in Integrations.";
              }
            }
          } catch {
            // ignore network error here and leave msg as is
          }
        }

        if (!cancelled) {
          setMessage(msg);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setMessage(null);
          setLoading(false);
        }
      }
    }

    checkStatus();

    // Recheck whenever the route changes so it feels global
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (loading || !message) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="font-medium">CRM connection required</div>
      <p className="mt-1">{message}</p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/integrations")}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          Open Integrations
        </button>
      </div>
    </div>
  );
}
