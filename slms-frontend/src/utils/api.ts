// src/utils/api.ts
// Minimal API helper with org aware endpoints, Bearer auth persistence,
// and automatic refresh on 401 retry.

export type SortDir = "asc" | "desc";
export type Provider = "hubspot" | "pipedrive" | "salesforce" | "nutshell";
export type AuthType = "pat" | "api_key" | "oauth";

export interface Lead {
  id: number;
  name: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  notes?: string | null;
  organization_id?: number | null;
  created_at?: string | null;
}

export interface LeadsResponse {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
  sort: string;
  dir: SortDir;
  q: string;
  organization_id?: number | null;
}

export interface DashboardMetrics {
  total: number;
  by_source: Record<string, number>;
}

export interface IntegrationCredOut {
  id: number;
  provider: Provider;
  auth_type: AuthType;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  token_suffix?: string | null; // last 4, never full token
}

export function getApiBase() {
  const stored = (() => {
    try {
      return typeof localStorage !== "undefined"
        ? localStorage.getItem("slms.apiBase")
        : null;
    } catch {
      return null;
    }
  })();

  let raw = stored || import.meta.env.VITE_API_URL || "/api";
  raw = raw.replace(/\/$/, "");

  // Force HTTPS in production to prevent mixed content errors
  if (raw.startsWith("http://") && typeof window !== "undefined" && window.location.protocol === "https:") {
    raw = raw.replace("http://", "https://");
  }

  return raw;
}

const baseUrl = getApiBase();

// Token persistence
let ACCESS_TOKEN: string | null = null;
try {
  ACCESS_TOKEN =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
} catch {
  // ignore
}

function setToken(token: string | null) {
  ACCESS_TOKEN = token;
  try {
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem("access_token", token);
      else localStorage.removeItem("access_token");
    }
  } catch {
    // ignore
  }
}

// Query helper
function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// Refresh flow
export async function refresh(): Promise<string | null> {
  const res = await fetch(`${baseUrl}/token/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string };
  if (data?.access_token) {
    setToken(data.access_token);
    return data.access_token;
  }
  return null;
}

// Generic JSON fetch with 401 refresh retry
async function fetchJSON<T>(
  url: string,
  init: RequestInit = {},
  _retried = false,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  if (!headers["Content-Type"] && init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (ACCESS_TOKEN) headers.Authorization = `Bearer ${ACCESS_TOKEN}`;

  let res = await fetch(url, { credentials: "include", ...init, headers });

  if (res.status === 401 && !_retried) {
    const newTok = await refresh();
    if (newTok) {
      headers.Authorization = `Bearer ${newTok}`;
      res = await fetch(url, { credentials: "include", ...init, headers });
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return {} as T;
  return (await res.json()) as T;
}

// Auth
export async function login(username: string, password: string) {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${baseUrl}/token`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Login failed: ${res.status} ${res.statusText} – ${text}`);
  }
  const data = (await res.json()) as { access_token: string; token_type: string };
  setToken(data.access_token);
  return data;
}

export async function logout() {
  setToken(null);
  return fetchJSON<{ ok: boolean }>(`${baseUrl}/logout`, { method: "POST" });
}

export function clearToken() {
  setToken(null);
}

export async function me() {
  return fetchJSON<{ email: string }>(`${baseUrl}/me`);
}

// Public leads
export async function createPublicLead(
  payload: Partial<Lead> & { email: string; name: string },
  orgKey?: string,
) {
  const headers: Record<string, string> = {};
  if (orgKey) headers["X-Org-Key"] = orgKey;
  return fetchJSON<{ message: string; lead_id: number }>(
    `${baseUrl}/public/leads`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );
}

// Authed leads and dashboard
export async function getLeads(params: {
  q?: string;
  sort?: string;
  dir?: SortDir;
  page?: number;
  page_size?: number;
} = {}): Promise<LeadsResponse> {
  const url = `${baseUrl}/leads${toQuery(params)}`;
  return fetchJSON<LeadsResponse>(url);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return fetchJSON<DashboardMetrics>(`${baseUrl}/dashboard/metrics`);
}

// Integrations
export async function listIntegrationCredentials(): Promise<IntegrationCredOut[]> {
  return fetchJSON<IntegrationCredOut[]>(`${baseUrl}/integrations/credentials`);
}

export async function saveIntegrationCredential(payload: {
  provider: Provider;
  access_token: string;
  auth_type?: AuthType;
  activate?: boolean;
}): Promise<IntegrationCredOut> {
  return fetchJSON<IntegrationCredOut>(`${baseUrl}/integrations/credentials`, {
    method: "POST",
    body: JSON.stringify({
      provider: payload.provider,
      access_token: payload.access_token,
      auth_type: payload.auth_type ?? "pat",
      activate: payload.activate ?? true,
    }),
  });
}

// Form config types
export interface FieldConfig {
  key: string;
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder?: string;
  field_type: "text" | "email" | "tel" | "textarea" | "select" | "multi";
  options?: string[];
}

export interface FormConfig {
  id?: number;
  organization_id?: number;
  form_style: "inline" | "wizard" | "modal" | "drawer";
  fields: FieldConfig[];
  styling: {
    primaryColor: string;
    borderRadius: string;
    fontFamily: string;
  };
  wizard: Record<string, unknown>;
  modal: Record<string, unknown>;
  drawer: Record<string, unknown>;
  branding: {
    showPoweredBy: boolean;
    headerText: string;
    subheaderText: string;
    submitButtonText: string;
    successMessage: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EmbedCode {
  script_tag: string;
  iframe_tag: string;
  org_key: string;
}

// Form config endpoints
export async function getFormConfig(): Promise<FormConfig> {
  return fetchJSON<FormConfig>(`${baseUrl}/forms/config`);
}

export async function updateFormConfig(config: Partial<FormConfig>): Promise<FormConfig> {
  return fetchJSON<FormConfig>(`${baseUrl}/forms/config`, {
    method: "PUT",
    body: JSON.stringify(config),
  });
}

export async function getEmbedCode(): Promise<EmbedCode> {
  return fetchJSON<EmbedCode>(`${baseUrl}/forms/embed-code`);
}

// Named plus default export
export const api = {
  login,
  refresh,
  logout,
  clearToken,
  me,
  createPublicLead,
  getLeads,
  getDashboardMetrics,
  listIntegrationCredentials,
  saveIntegrationCredential,
  getFormConfig,
  updateFormConfig,
  getEmbedCode,
};

export default api;
