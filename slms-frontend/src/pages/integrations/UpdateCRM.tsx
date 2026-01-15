// src/pages/integrations/UpdateCRM.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase, refresh } from "@/utils/api";
import { Skeleton } from "@/components/Skeleton";
import CrmCapabilityChips from "@/components/CRMCapabilityChips";

// All CRMs use gradient text styling with official brand colors

type CRM = "hubspot" | "pipedrive" | "salesforce" | "nutshell" | "zoho";

// Skeleton for CRM card during loading
function CRMCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800/50">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4 mb-3" />
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex gap-1.5 mb-4">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-24 rounded-md" />
      </div>
    </div>
  );
}

const CRM_OPTIONS: {
  id: CRM;
  label: string;
  description: string;
  gradient: string;
}[] = [
  {
    id: "hubspot",
    label: "HubSpot",
    description: "Lead sync with free tier support",
    gradient: "from-[#FF7A59] to-[#FF5C35]", // Official HubSpot Orange
  },
  {
    id: "pipedrive",
    label: "Pipedrive",
    description: "Full API access, ideal for analytics",
    gradient: "from-[#017737] to-[#25D366]", // Official Pipedrive Green
  },
  {
    id: "salesforce",
    label: "Salesforce",
    description: "Enterprise OAuth with advanced reporting",
    gradient: "from-[#00A1E0] to-[#032D60]", // Official Salesforce Blue
  },
  {
    id: "nutshell",
    label: "Nutshell",
    description: "Lightweight CRM with full API",
    gradient: "from-[#F59E0B] to-[#D97706]", // Nutshell Gold/Orange
  },
  {
    id: "zoho",
    label: "Zoho CRM",
    description: "Full-featured CRM with OAuth",
    gradient: "from-[#E42527] to-[#F7B500]", // Official Zoho Red to Gold
  },
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

type TestResult = { status: "success" | "error"; message: string } | null;

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
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [creds, setCreds] = useState<CredentialSummary[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(true);

  const [hubspotToken, setHubspotToken] = useState("");
  const [pipedriveToken, setPipedriveToken] = useState("");
  const [nutshellToken, setNutshellToken] = useState("");
  const [tokenBusy, setTokenBusy] = useState<CRM | null>(null);

  const [sfConnected, setSfConnected] = useState(false);
  const [sfBusy, setSfBusy] = useState(false);
  const [hsOAuthConnected, setHsOAuthConnected] = useState(false);
  const [hsOAuthBusy, setHsOAuthBusy] = useState(false);
  const [pdOAuthConnected, setPdOAuthConnected] = useState(false);
  const [pdOAuthBusy, setPdOAuthBusy] = useState(false);
  const [zohoOAuthConnected, setZohoOAuthConnected] = useState(false);
  const [zohoOAuthBusy, setZohoOAuthBusy] = useState(false);

  // Test connection state
  const [testingCRM, setTestingCRM] = useState<CRM | null>(null);
  const [testResults, setTestResults] = useState<Record<CRM, TestResult>>({
    hubspot: null,
    pipedrive: null,
    salesforce: null,
    nutshell: null,
    zoho: null,
  });

  // Disconnect state
  const [disconnectingCRM, setDisconnectingCRM] = useState<CRM | null>(null);

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
          throw new Error("Failed to load active CRM");
        }

        if (!credsRes.ok) {
          throw new Error("Failed to load credentials");
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

        // Detect HubSpot OAuth credentials
        const hasHsOAuth =
          Array.isArray(credsJson) &&
          credsJson.some((c) => c.provider === "hubspot" && c.auth_type === "oauth" && c.is_active);
        setHsOAuthConnected(Boolean(hasHsOAuth));

        // Detect Pipedrive OAuth credentials
        const hasPdOAuth =
          Array.isArray(credsJson) &&
          credsJson.some((c) => c.provider === "pipedrive" && c.auth_type === "oauth" && c.is_active);
        setPdOAuthConnected(Boolean(hasPdOAuth));

        // Detect Zoho OAuth credentials
        const hasZohoOAuth =
          Array.isArray(credsJson) &&
          credsJson.some((c) => c.provider === "zoho" && c.auth_type === "oauth" && c.is_active);
        setZohoOAuthConnected(Boolean(hasZohoOAuth));
      } catch (e: any) {
        if (!cancelled) {
          setMsg({ type: "error", text: e?.message || "Could not load CRM settings." });
          setActiveCRM("hubspot");
          setEditing("hubspot");
        }
      } finally {
        if (!cancelled) setLoadingCreds(false);
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
      if (!res.ok) return;
      const items = (await res.json()) as CredentialSummary[];
      setCreds(items || []);

      const hasSF =
        Array.isArray(items) &&
        items.some((c) => c.provider === "salesforce" && c.is_active);
      setSfConnected(Boolean(hasSF));

      // Detect HubSpot OAuth credentials
      const hasHsOAuth =
        Array.isArray(items) &&
        items.some((c) => c.provider === "hubspot" && c.auth_type === "oauth" && c.is_active);
      setHsOAuthConnected(Boolean(hasHsOAuth));

      // Detect Pipedrive OAuth credentials
      const hasPdOAuth =
        Array.isArray(items) &&
        items.some((c) => c.provider === "pipedrive" && c.auth_type === "oauth" && c.is_active);
      setPdOAuthConnected(Boolean(hasPdOAuth));

      // Detect Zoho OAuth credentials
      const hasZohoOAuth =
        Array.isArray(items) &&
        items.some((c) => c.provider === "zoho" && c.auth_type === "oauth" && c.is_active);
      setZohoOAuthConnected(Boolean(hasZohoOAuth));
    } catch {
      // non blocking
    } finally {
      setLoadingCreds(false);
    }
  }

  // Detect ?salesforce=connected after OAuth
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
          setMsg({ type: "success", text: "Salesforce connected successfully!" });
        }
      }
    })();
  }, []);

  // Detect ?hubspot=connected after OAuth
  useEffect(() => {
    (async () => {
      const usp = new URLSearchParams(window.location.search);
      if (usp.get("hubspot") === "connected") {
        try {
          await refreshCreds();
        } finally {
          usp.delete("hubspot");
          const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
          window.history.replaceState({}, "", next);
          setMsg({ type: "success", text: "HubSpot connected successfully via OAuth!" });
        }
      }
      // Handle HubSpot OAuth errors
      if (usp.get("hubspot_error")) {
        const errCode = usp.get("hubspot_error");
        const errMsg = usp.get("message") || errCode;
        usp.delete("hubspot_error");
        usp.delete("message");
        const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
        window.history.replaceState({}, "", next);
        setMsg({ type: "error", text: `HubSpot OAuth failed: ${errMsg}` });
      }
    })();
  }, []);

  // Detect ?pipedrive=connected after OAuth
  useEffect(() => {
    (async () => {
      const usp = new URLSearchParams(window.location.search);
      if (usp.get("pipedrive") === "connected") {
        try {
          await refreshCreds();
        } finally {
          usp.delete("pipedrive");
          const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
          window.history.replaceState({}, "", next);
          setMsg({ type: "success", text: "Pipedrive connected successfully via OAuth!" });
        }
      }
      // Handle Pipedrive OAuth errors
      if (usp.get("pipedrive_error")) {
        const errCode = usp.get("pipedrive_error");
        const errMsg = usp.get("message") || errCode;
        usp.delete("pipedrive_error");
        usp.delete("message");
        const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
        window.history.replaceState({}, "", next);
        setMsg({ type: "error", text: `Pipedrive OAuth failed: ${errMsg}` });
      }
    })();
  }, []);

  // Detect ?zoho=connected after OAuth
  useEffect(() => {
    (async () => {
      const usp = new URLSearchParams(window.location.search);
      if (usp.get("zoho") === "connected") {
        try {
          await refreshCreds();
        } finally {
          usp.delete("zoho");
          const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
          window.history.replaceState({}, "", next);
          setMsg({ type: "success", text: "Zoho CRM connected successfully via OAuth!" });
        }
      }
      // Handle Zoho OAuth errors
      if (usp.get("zoho_error")) {
        const errCode = usp.get("zoho_error");
        const errMsg = usp.get("message") || errCode;
        usp.delete("zoho_error");
        usp.delete("message");
        const next = `${window.location.pathname}${usp.toString() ? `?${usp}` : ""}`;
        window.history.replaceState({}, "", next);
        setMsg({ type: "error", text: `Zoho OAuth failed: ${errMsg}` });
      }
    })();
  }, []);

  async function onSave() {
    if (editing === activeCRM) {
      setMsg({ type: "info", text: "No changes to save." });
      return;
    }

    const confirmed = window.confirm(
      `Switch active CRM from ${labelOf(activeCRM)} to ${labelOf(editing)}?\n\n` +
        "This changes where new leads and salesperson stats are pulled from."
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
      if (!r.ok) throw new Error("Save failed");
      const j = (await r.json()) as { provider: CRM };
      setActiveCRM(j.provider);
      setEditing(j.provider);
      setMsg({ type: "success", text: `Active CRM set to ${labelOf(j.provider)}.` });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to save selection." });
      setEditing(activeCRM);
    } finally {
      setSaving(false);
    }
  }

  async function connectSalesforce() {
    setSfBusy(true);
    try {
      window.location.href = `${getApiBase()}/integrations/salesforce/auth`;
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to start Salesforce auth." });
      setSfBusy(false);
    }
  }

  async function connectHubspot() {
    setHsOAuthBusy(true);
    try {
      window.location.href = `${getApiBase()}/integrations/hubspot/auth`;
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to start HubSpot auth." });
      setHsOAuthBusy(false);
    }
  }

  async function connectPipedrive() {
    setPdOAuthBusy(true);
    try {
      window.location.href = `${getApiBase()}/integrations/pipedrive/auth`;
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to start Pipedrive auth." });
      setPdOAuthBusy(false);
    }
  }

  async function connectZoho() {
    setZohoOAuthBusy(true);
    try {
      window.location.href = `${getApiBase()}/integrations/zoho/auth`;
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to start Zoho auth." });
      setZohoOAuthBusy(false);
    }
  }

  // Test CRM connection
  async function testConnection(provider: CRM) {
    setTestingCRM(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));
    try {
      // Test by fetching salespeople/owners - this validates the connection
      const endpoint = `${getApiBase()}/integrations/${provider}/salespeople`;
      const res = await authFetch(endpoint);
      if (res.ok) {
        setTestResults((prev) => ({
          ...prev,
          [provider]: { status: "success", message: "Connection verified!" },
        }));
      } else {
        const errorText = await res.text();
        setTestResults((prev) => ({
          ...prev,
          [provider]: { status: "error", message: errorText.slice(0, 100) || "Connection failed" },
        }));
      }
    } catch (e: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { status: "error", message: e?.message || "Connection test failed" },
      }));
    } finally {
      setTestingCRM(null);
    }
  }

  // Disconnect OAuth integration
  async function disconnectOAuth(provider: CRM) {
    const confirmed = window.confirm(
      `Disconnect ${labelOf(provider)}?\n\nThis will revoke the OAuth connection. You can reconnect anytime.`
    );
    if (!confirmed) return;

    setDisconnectingCRM(provider);
    try {
      const res = await authFetch(`${getApiBase()}/integrations/${provider}/disconnect`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Disconnect failed");
      await refreshCreds();
      setMsg({ type: "success", text: `${labelOf(provider)} disconnected successfully.` });
      setTestResults((prev) => ({ ...prev, [provider]: null }));
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to disconnect." });
    } finally {
      setDisconnectingCRM(null);
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
      setMsg({ type: "error", text: "Enter a token before saving." });
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
      if (!res.ok) throw new Error("Failed to save credentials");
      await refreshCreds();
      if (provider === "hubspot") setHubspotToken("");
      if (provider === "pipedrive") setPipedriveToken("");
      if (provider === "nutshell") setNutshellToken("");
      setMsg({ type: "success", text: `${labelOf(provider)} credentials saved!` });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to save credentials." });
    } finally {
      setTokenBusy(null);
    }
  }

  const hubspotCred = getActiveCredential("hubspot");
  const pipedriveCred = getActiveCredential("pipedrive");
  const salesforceCred = getActiveCredential("salesforce");
  const nutshellCred = getActiveCredential("nutshell");
  const zohoCred = getActiveCredential("zoho");

  function getCredFor(id: CRM) {
    if (id === "hubspot") return hubspotCred;
    if (id === "pipedrive") return pipedriveCred;
    if (id === "salesforce") return salesforceCred;
    if (id === "nutshell") return nutshellCred;
    if (id === "zoho") return zohoCred;
    return undefined;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header with gradient accent */}
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CRM Integrations</h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
              Connect your CRM to sync leads and power analytics. Choose from HubSpot, Pipedrive, Salesforce, Nutshell, or Zoho.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onSave}
              disabled={saving || editing === activeCRM}
              className="px-5 py-2 text-sm font-medium text-center text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:shadow-none"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      {/* Message banner */}
      {msg && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 ${
          msg.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-200"
            : msg.type === "error"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-200"
            : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-200"
        }`}>
          {msg.type === "success" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {msg.type === "error" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {msg.type === "info" && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Current Active CRM Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active CRM</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">{labelOf(activeCRM)}</div>
            </div>
          </div>
          {editing !== activeCRM && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Switching to {labelOf(editing)}
            </div>
          )}
        </div>
      </div>

      {/* CRM Grid - Loading State or Cards */}
      {loadingCreds ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CRMCardSkeleton key={i} />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CRM_OPTIONS.map((opt) => {
          const cred = getCredFor(opt.id);
          const isActive = activeCRM === opt.id;
          const isSelected = editing === opt.id;
          const isOAuthConnected = opt.id === "salesforce" ? sfConnected : opt.id === "hubspot" ? hsOAuthConnected : opt.id === "pipedrive" ? pdOAuthConnected : opt.id === "zoho" ? zohoOAuthConnected : false;
          const isConnected = isOAuthConnected || Boolean(cred);
          const testResult = testResults[opt.id];

          return (
            <div
              key={opt.id}
              onClick={() => setEditing(opt.id)}
              className={`relative rounded-2xl border-2 p-4 sm:p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "border-indigo-500 bg-white dark:bg-gray-800 shadow-lg shadow-indigo-500/10"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Header with branded gradient text */}
              <div className="flex items-center justify-between mb-4">
                <div className="h-8 flex items-center">
                  <span className={`text-xl font-bold bg-gradient-to-r ${opt.gradient} bg-clip-text text-transparent`}>
                    {opt.label}
                  </span>
                </div>
                {isActive && (
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Active
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{opt.description}</p>

              {/* Connection Status */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                <span className={`text-xs font-medium ${isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {isConnected ? "Connected" : "Not connected"}
                </span>
                {cred?.token_suffix && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    ...{cred.token_suffix}
                  </span>
                )}
                {cred?.updated_at && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                    Updated {new Date(cred.updated_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs ${
                  testResult.status === "success"
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.status === "success" ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {testResult.message}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Lead Capture
                </span>
                <span className={`px-2 py-1 text-[10px] font-medium rounded-md ${
                  opt.id === "hubspot"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                }`}>
                  {opt.id === "hubspot" ? "Limited Analytics" : "Full Analytics"}
                </span>
                {(opt.id === "salesforce" || opt.id === "hubspot" || opt.id === "pipedrive" || opt.id === "zoho") && (
                  <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    OAuth
                  </span>
                )}
              </div>

              {/* Action area - only show when selected */}
              {isSelected && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                  {opt.id === "salesforce" ? (
                    <div className="space-y-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); connectSalesforce(); }}
                        disabled={sfBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#00A1E0] to-[#032D60] rounded-xl hover:shadow-lg hover:shadow-[#00A1E0]/25 transition-all disabled:opacity-50"
                      >
                        {sfBusy ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Connecting...
                          </>
                        ) : sfConnected ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reconnect
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Connect with OAuth
                          </>
                        )}
                      </button>
                      {sfConnected && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); testConnection("salesforce"); }}
                            disabled={testingCRM === "salesforce"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {testingCRM === "salesforce" ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            Test
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); disconnectOAuth("salesforce"); }}
                            disabled={disconnectingCRM === "salesforce"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            {disconnectingCRM === "salesforce" ? "..." : "Disconnect"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : opt.id === "hubspot" ? (
                    <div className="space-y-3">
                      {/* HubSpot OAuth (primary) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); connectHubspot(); }}
                        disabled={hsOAuthBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#FF7A59] to-[#FF5C35] rounded-xl hover:shadow-lg hover:shadow-[#FF7A59]/25 transition-all disabled:opacity-50"
                      >
                        {hsOAuthBusy ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Connecting...
                          </>
                        ) : hsOAuthConnected ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reconnect OAuth
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Connect with OAuth (Recommended)
                          </>
                        )}
                      </button>
                      {/* Test & Disconnect for HubSpot OAuth */}
                      {hsOAuthConnected && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); testConnection("hubspot"); }}
                            disabled={testingCRM === "hubspot"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {testingCRM === "hubspot" ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            Test
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); disconnectOAuth("hubspot"); }}
                            disabled={disconnectingCRM === "hubspot"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            {disconnectingCRM === "hubspot" ? "..." : "Disconnect"}
                          </button>
                        </div>
                      )}
                      {/* HubSpot API key fallback */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or use API key</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={hubspotToken}
                          onChange={(e) => { e.stopPropagation(); setHubspotToken(e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Enter HubSpot Private App token"
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); saveToken("hubspot"); }}
                          disabled={tokenBusy === "hubspot"}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                        >
                          {tokenBusy === "hubspot" ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : opt.id === "pipedrive" ? (
                    <div className="space-y-3">
                      {/* Pipedrive OAuth (primary) */}
                      <button
                        onClick={(e) => { e.stopPropagation(); connectPipedrive(); }}
                        disabled={pdOAuthBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#017737] to-[#25D366] rounded-xl hover:shadow-lg hover:shadow-[#017737]/25 transition-all disabled:opacity-50"
                      >
                        {pdOAuthBusy ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Connecting...
                          </>
                        ) : pdOAuthConnected ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reconnect OAuth
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Connect with OAuth (Recommended)
                          </>
                        )}
                      </button>
                      {/* Test & Disconnect for Pipedrive OAuth */}
                      {pdOAuthConnected && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); testConnection("pipedrive"); }}
                            disabled={testingCRM === "pipedrive"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {testingCRM === "pipedrive" ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            Test
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); disconnectOAuth("pipedrive"); }}
                            disabled={disconnectingCRM === "pipedrive"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            {disconnectingCRM === "pipedrive" ? "..." : "Disconnect"}
                          </button>
                        </div>
                      )}
                      {/* Pipedrive API token fallback */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">or use API token</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={pipedriveToken}
                          onChange={(e) => { e.stopPropagation(); setPipedriveToken(e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Enter Pipedrive API token"
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); saveToken("pipedrive"); }}
                          disabled={tokenBusy === "pipedrive"}
                          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                        >
                          {tokenBusy === "pipedrive" ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : opt.id === "zoho" ? (
                    <div className="space-y-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); connectZoho(); }}
                        disabled={zohoOAuthBusy}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#E42527] to-[#F7B500] rounded-xl hover:shadow-lg hover:shadow-[#E42527]/25 transition-all disabled:opacity-50"
                      >
                        {zohoOAuthBusy ? (
                          <>
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Connecting...
                          </>
                        ) : zohoOAuthConnected ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reconnect
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Connect with OAuth
                          </>
                        )}
                      </button>
                      {zohoOAuthConnected && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); testConnection("zoho"); }}
                            disabled={testingCRM === "zoho"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            {testingCRM === "zoho" ? (
                              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            Test
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); disconnectOAuth("zoho"); }}
                            disabled={disconnectingCRM === "zoho"}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                          >
                            {disconnectingCRM === "zoho" ? "..." : "Disconnect"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={nutshellToken}
                          onChange={(e) => {
                            e.stopPropagation();
                            setNutshellToken(e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`Enter ${opt.label} API token`}
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); saveToken("nutshell"); }}
                          disabled={tokenBusy === "nutshell"}
                          className={`px-4 py-2 text-sm font-medium text-white bg-gradient-to-r ${opt.gradient} rounded-xl hover:shadow-lg transition-all disabled:opacity-50`}
                        >
                          {tokenBusy === "nutshell" ? "..." : "Save"}
                        </button>
                      </div>
                      {/* Test button for Nutshell */}
                      {cred && (
                        <button
                          onClick={(e) => { e.stopPropagation(); testConnection("nutshell"); }}
                          disabled={testingCRM === "nutshell"}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                          {testingCRM === "nutshell" ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          Test Connection
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Capabilities section for selected CRM */}
      {editing && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {labelOf(editing)} Capabilities
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              What this CRM supports
            </span>
          </div>
          <div className="p-5">
            <CrmCapabilityChips items={capabilityItemsFor(editing)} />
          </div>
        </div>
      )}

      {/* Help section */}
      <div className="mt-8 p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How to get your API token</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">H</span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">HubSpot</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click "Connect with OAuth" (recommended), or use Private Apps: Settings › Integrations › Private Apps › Create app</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold flex items-center justify-center flex-shrink-0">P</span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Pipedrive</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click "Connect with OAuth" (recommended), or use API token: Settings › Personal preferences › API</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">S</span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Salesforce</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click "Connect with OAuth" above and authorize Site2CRM in your Salesforce account</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center justify-center flex-shrink-0">N</span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Nutshell</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Settings › API Keys › Generate new API key › Copy the key</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center flex-shrink-0">Z</span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Zoho CRM</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Click "Connect with OAuth" and authorize Site2CRM in your Zoho account</p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Need more help? <Link to="/app/settings" className="text-indigo-600 dark:text-indigo-400 hover:underline">Contact support</Link> and we'll walk you through it.
            </p>
          </div>
        </div>
      </div>
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

  if (crm === "zoho") {
    return [
      { id: "zoho-leads", label: "Lead capture", level: "full" as const, tooltip: "Create leads and contacts in Zoho CRM." },
      { id: "zoho-owners", label: "Owner lookup", level: "full" as const, tooltip: "Zoho CRM exposes owners and user data via API." },
      { id: "zoho-analytics", label: "Sales analytics", level: "full" as const, tooltip: "Full analytics support with Zoho CRM integration." },
    ];
  }

  // nutshell
  return [
    { id: "nutshell-leads", label: "Lead capture", level: "full" as const, tooltip: "Create and sync leads into Nutshell." },
    { id: "nutshell-owners", label: "Owner and activity stats", level: "full" as const, tooltip: "Nutshell APIs expose owners, pipelines, and activities for stats." },
    { id: "nutshell-analytics", label: "Sales analytics", level: "full" as const, tooltip: "Full salesperson analytics available once an API key is connected." },
  ];
}
