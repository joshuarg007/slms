// src/utils/api.ts
// ---------------------------------------------------------------------
// Global API helper using structured results (Option B).
// Never throws. Always returns { ok: boolean, data?: T, error?: string }.
// Supports:
// - Cookie-based JWT with refresh
// - Bearer header auto-injected
// - Auto-refresh on 401
// - Full typing for all endpoints
// ---------------------------------------------------------------------

export type SortDir = "asc" | "desc";
export type Provider = "hubspot" | "pipedrive" | "salesforce" | "nutshell";
export type AuthType = "pat" | "api_key" | "oauth";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

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
  token_suffix?: string | null;
}

export function getApiBase() {
  const stored = localStorage.getItem("slms.apiBase");
  return (stored || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

const baseUrl = getApiBase();

// ---------------------------------------------------------------------
// ACCESS TOKEN PERSISTENCE
// ---------------------------------------------------------------------
let ACCESS_TOKEN: string | null = null;

try {
  ACCESS_TOKEN =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
} catch { /* ignore */ }

function setToken(token: string | null) {
  ACCESS_TOKEN = token;
  try {
    if (token) localStorage.setItem("access_token", token);
    else localStorage.removeItem("access_token");
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------
// UTILS
// ---------------------------------------------------------------------
function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------
// REFRESH TOKEN (structured result)
// ---------------------------------------------------------------------
export async function refresh(): Promise<ApiResult<{ access_token: string }>> {
  try {
    const res = await fetch(`${baseUrl}/token/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return { ok: false, status: res.status, error: "Refresh failed" };

    const data = await res.json();
    if (data?.access_token) {
      setToken(data.access_token);
      return { ok: true, data };
    }

    return { ok: false, error: "Invalid refresh response" };
  } catch {
    return { ok: false, error: "Network error during refresh" };
  }
}

// ---------------------------------------------------------------------
// CORE FETCH (NEVER THROWS)
// ---------------------------------------------------------------------
async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
  retried = false
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  if (!headers["Content-Type"] && init.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (ACCESS_TOKEN) headers.Authorization = `Bearer ${ACCESS_TOKEN}`;

  let res: Response;

  try {
    res = await fetch(url, { credentials: "include", ...init, headers });
  } catch {
    return { ok: false, error: "Network error", status: 0 };
  }

  // 401 → try refresh once
  if (res.status === 401 && !retried) {
    const ref = await refresh();
    if (ref.ok && ref.data?.access_token) {
      headers.Authorization = `Bearer ${ref.data.access_token}`;
      return apiFetch<T>(url, { ...init, headers }, true);
    }
  }

  const status = res.status;
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    return {
      ok: false,
      status,
      error: text || res.statusText || "Request failed",
    };
  }

  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    return { ok: true, data: {} as T };
  }

  try {
    const data = JSON.parse(text) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Invalid JSON", status };
  }
}

// ---------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------
export async function login(email: string, password: string): Promise<ApiResult<{ access_token: string }>> {
  const body = new URLSearchParams({ username: email, password });

  const res = await apiFetch<{ access_token: string }>(`${baseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (res.ok && res.data?.access_token) {
    setToken(res.data.access_token);
  }

  return res;
}

export async function logout(): Promise<ApiResult<{ ok: boolean }>> {
  setToken(null);
  return apiFetch(`${baseUrl}/logout`, { method: "POST" });
}

export function clearToken() {
  setToken(null);
}

export async function me(): Promise<ApiResult<{ email: string }>> {
  return apiFetch(`${baseUrl}/me`);
}

// ---------------------------------------------------------------------
// PUBLIC LEADS
// ---------------------------------------------------------------------
export async function createPublicLead(
  payload: Partial<Lead> & { email: string; name: string },
  orgKey?: string
): Promise<ApiResult<{ message: string; lead_id: number }>> {
  const headers: Record<string, string> = {};
  if (orgKey) headers["X-Org-Key"] = orgKey;

  return apiFetch(`${baseUrl}/public/leads`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------
// LEADS
// ---------------------------------------------------------------------
export async function getLeads(params: {
  q?: string;
  sort?: string;
  dir?: SortDir;
  page?: number;
  page_size?: number;
} = {}): Promise<ApiResult<LeadsResponse>> {
  return apiFetch(`${baseUrl}/leads${toQuery(params)}`);
}

// ---------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------
export async function getDashboardMetrics(): Promise<ApiResult<DashboardMetrics>> {
  return apiFetch(`${baseUrl}/dashboard/metrics`);
}

// ---------------------------------------------------------------------
// INTEGRATIONS
// ---------------------------------------------------------------------
export async function listIntegrationCredentials(): Promise<ApiResult<IntegrationCredOut[]>> {
  return apiFetch(`${baseUrl}/integrations/credentials`);
}

export async function saveIntegrationCredential(payload: {
  provider: Provider;
  access_token: string;
  auth_type?: AuthType;
  activate?: boolean;
}): Promise<ApiResult<IntegrationCredOut>> {
  return apiFetch(`${baseUrl}/integrations/credentials`, {
    method: "POST",
    body: JSON.stringify({
      provider: payload.provider,
      access_token: payload.access_token,
      auth_type: payload.auth_type ?? "pat",
      activate: payload.activate ?? true,
    }),
  });
}

// ---------------------------------------------------------------------
// DEFAULT EXPORT (optional)
// ---------------------------------------------------------------------
export const api = {
  login,
  logout,
  refresh,
  clearToken,
  me,
  getLeads,
  createPublicLead,
  getDashboardMetrics,
  listIntegrationCredentials,
  saveIntegrationCredential,
};

export default api;
