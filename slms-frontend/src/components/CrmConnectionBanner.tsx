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
};

function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  try {
    const tok = localStorage.getItem("access_token");
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {}

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

    async function run() {
      setLoading(true);
      setMessage(null);

      try {
        const base = getApiBase();

        // Active CRM
        const activeRes = await authFetch(`${base}/integrations/crm/active`);
        if (!activeRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const active = (await activeRes.json()) as ActiveCrmResponse;
        const provider = active.provider;

        // Credentials list
        const credsRes = await authFetch(`${base}/integrations/credentials`);
        if (!credsRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const creds = (await credsRes.json()) as CredentialSummary[];
        const hasActive = creds.some(
          (c) => c.provider === provider && c.is_active,
        );

        let msg: string | null = null;

        if (!hasActive) {
          const map: Record<CRM, string> = {
            hubspot:
              "HubSpot is selected but no active token is configured for this organization.",
            pipedrive:
              "Pipedrive is selected but no active API token is configured.",
            salesforce:
              "Salesforce is selected but not connected yet. Complete Salesforce authentication.",
            nutshell:
              "Nutshell CRM is selected but no API key is saved for this organization.",
          };
          msg = map[provider];
        }

        // Surface Salesforce misconfig in a softer way
        if (!msg && provider === "salesforce") {
          try {
            const check = await authFetch(
              `${base}/integrations/salespeople/stats?days=7`,
            );
            const text = await check.text().catch(() => "");
            if (
              text.includes("instance_url not found") ||
              text.includes("SALESFORCE_INSTANCE_URL")
            ) {
              msg =
                "Salesforce is selected but the connection is incomplete. Please reconnect Salesforce.";
            }
          } catch {}
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

    run();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (loading || !message) return null;

  // Contained, non-overflowing card
  return (
    <div className="mb-6">
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="font-medium text-amber-900 dark:text-amber-100">
          CRM connection needed
        </div>

        <p className="mt-1">{message}</p>

        <button
          type="button"
          onClick={() => navigate("/app/integrations")}
          className="mt-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          Open Integrations
        </button>
      </div>
    </div>
  );
}
