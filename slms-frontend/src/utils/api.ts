// src/utils/api.ts
// Minimal API helper with org-aware endpoints, Bearer auth persistence,
// and automatic refresh-on-401 retry.

export type SortDir = "asc" | "desc";

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

const baseUrl =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "")) ||
  "http://127.0.0.1:8000";

// ---- Token persistence (Bearer) ----
let ACCESS_TOKEN: string | null = null;
try {
  ACCESS_TOKEN =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
} catch {
  /* ignore */
}

function setToken(token: string | null) {
  ACCESS_TOKEN = token;
  try {
    if (typeof localStorage !== "undefined") {
      if (token) localStorage.setItem("access_token", token);
      else localStorage.removeItem("access_token");
    }
  } catch {
    /* ignore */
  }
}

// ---- Small utils ----
function toQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// ---- Refresh flow ----
// Returns a fresh access token string or null
export async function refresh(): Promise<string | null> {
  const res = await fetch(`${baseUrl}/token/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;

  // backend returns { access_token, token_type }
  const data = (await res.json()) as { access_token?: string };
  if (data?.access_token) {
    setToken(data.access_token);
    return data.access_token;
  }
  return null;
}

// Generic JSON fetch with 401 → refresh → retry (once)
async function fetchJSON<T>(
  url: string,
  init: RequestInit = {},
  _retried = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };

  // Only auto-set Content-Type when there's a non-FormData body
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

// ---- Auth ----
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

// ---- Public leads (requires org key header) ----
export async function createPublicLead(
  payload: Partial<Lead> & { email: string; name: string },
  orgKey?: string
) {
  const headers: Record<string, string> = {};
  if (orgKey) headers["X-Org-Key"] = orgKey; // backend enforces tenancy
  return fetchJSON<{ message: string; lead_id: number }>(`${baseUrl}/public/leads`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

// ---- Authed leads & dashboard ----
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

// Named + default export
export const api = {
  login,
  refresh,
  logout,
  clearToken,
  me,
  createPublicLead,
  getLeads,
  getDashboardMetrics,
};

export function getApiBase() {
  const stored = localStorage.getItem("slms.apiBase");
  return (stored || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export default api;
