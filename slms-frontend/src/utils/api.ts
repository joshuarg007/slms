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

export type UserOrganization = {
  id: number | null;
  name: string | null;
  onboarding_completed: boolean;
  plan: string;
  trial_ends_at: string | null;
};

export type CurrentUser = {
  email: string;
  role: string;
  is_approved: boolean;
  email_verified: boolean;
  organization: UserOrganization | null;
};

export async function me() {
  return fetchJSON<CurrentUser>(`${baseUrl}/me`);
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

// Create a new lead (authenticated)
export async function createLead(
  payload: Partial<Lead> & { email: string; name: string },
): Promise<{ message: string; lead_id: number }> {
  return fetchJSON<{ message: string; lead_id: number }>(
    `${baseUrl}/leads`,
    {
      method: "POST",
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

// AI Chat types
export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  title: string | null;
  context_type: string;
  context_id: number | null;
  message_count?: number;
  messages?: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface SendMessageRequest {
  message: string;
  conversation_id?: number;
  context_type?: string;
  context_id?: number;
  wmem_context?: string;        // WMEM memory block
  last_messages?: { role: string; content: string }[];  // Last 2 messages only
}

export interface SendMessageResponse {
  conversation_id: number;
  message_id: number;
  response: string;
  tokens_used: number;
  updated_wmem?: string;        // Updated WMEM to save
}

export interface AIUsage {
  messages_used: number;
  messages_limit: number;
  messages_remaining: number;
  reset_date: string | null;
  ai_enabled: boolean;
  ai_features: string[];
}

// AI Chat endpoints
export async function sendChatMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
  return fetchJSON<SendMessageResponse>(`${baseUrl}/chat/messages`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function listChatConversations(limit = 20, offset = 0): Promise<ChatConversation[]> {
  return fetchJSON<ChatConversation[]>(`${baseUrl}/chat/conversations${toQuery({ limit, offset })}`);
}

export async function getChatConversation(id: number): Promise<ChatConversation> {
  return fetchJSON<ChatConversation>(`${baseUrl}/chat/conversations/${id}`);
}

export async function deleteChatConversation(id: number): Promise<{ message: string }> {
  return fetchJSON<{ message: string }>(`${baseUrl}/chat/conversations/${id}`, {
    method: "DELETE",
  });
}

export async function getAIUsage(): Promise<AIUsage> {
  return fetchJSON<AIUsage>(`${baseUrl}/chat/usage`);
}

// Analytics types
export interface SalespersonKPI {
  user_id: number;
  display_name: string;
  email: string;
  total_leads: number;
  won_leads: number;
  lost_leads: number;
  in_pipeline: number;
  close_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  quota: number;
  quota_attainment: number;
  calls_count: number;
  emails_count: number;
  meetings_count: number;
  total_activities: number;
  activities_per_lead: number;
  avg_days_to_close: number;
}

export interface TeamKPISummary {
  period_start: string;
  period_end: string;
  total_leads: number;
  total_won: number;
  total_lost: number;
  total_pipeline: number;
  team_close_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  total_calls: number;
  total_emails: number;
  total_meetings: number;
  salespeople: SalespersonKPI[];
}

export interface LeadSourceMetrics {
  source: string;
  total_leads: number;
  won_leads: number;
  lost_leads: number;
  close_rate: number;
  total_revenue: number;
  avg_deal_size: number;
  avg_days_to_close: number;
}

export interface PipelineMetrics {
  status: string;
  count: number;
  total_value: number;
  avg_value: number;
}

export interface ActivityDay {
  date: string;
  calls: number;
  emails: number;
  meetings: number;
}

export interface SalesDashboardMetrics {
  total_leads: number;
  total_revenue: number;
  avg_deal_size: number;
  overall_close_rate: number;
  leads_this_month: number;
  leads_last_month: number;
  leads_change_pct: number;
  revenue_this_month: number;
  revenue_last_month: number;
  revenue_change_pct: number;
  pipeline: PipelineMetrics[];
  pipeline_value: number;
  by_source: LeadSourceMetrics[];
  activities_by_day: ActivityDay[];
  top_performers: SalespersonKPI[];
}

export interface RecommendationItem {
  category: string;
  priority: string;
  title: string;
  description: string;
  metric?: string;
  action: string;
}

export interface RecommendationsResponse {
  generated_at: string;
  recommendations: RecommendationItem[];
}

// Analytics endpoints
export async function getTeamKPIs(params: {
  days?: number;
  start_date?: string;
  end_date?: string;
} = { days: 30 }): Promise<TeamKPISummary> {
  return fetchJSON<TeamKPISummary>(`${baseUrl}/analytics/kpis${toQuery(params)}`);
}

export async function getSalesDashboard(params: {
  start_date?: string;
  end_date?: string;
} = {}): Promise<SalesDashboardMetrics> {
  return fetchJSON<SalesDashboardMetrics>(`${baseUrl}/analytics/dashboard${toQuery(params)}`);
}

export async function getRecommendations(): Promise<RecommendationsResponse> {
  return fetchJSON<RecommendationsResponse>(`${baseUrl}/analytics/recommendations`);
}

export async function getSalespersonKPI(userId: number, days = 30): Promise<SalespersonKPI> {
  return fetchJSON<SalespersonKPI>(`${baseUrl}/analytics/salesperson/${userId}${toQuery({ days })}`);
}

// Lead Scoring types
export interface LeadScoreResponse {
  lead_id: number;
  lead_name: string;
  lead_email: string;
  lead_company: string | null;
  lead_status: string;
  total_score: number;
  engagement_score: number;
  source_score: number;
  value_score: number;
  velocity_score: number;
  fit_score: number;
  win_probability: number;
  predicted_close_days: number | null;
  best_next_action: string;
  score_reasons: string[];
  risk_factors: string[];
}

export interface ScoredLeadsResponse {
  leads: LeadScoreResponse[];
  total_count: number;
  avg_score: number;
  high_score_count: number;
  at_risk_count: number;
}

export interface ScoreDistribution {
  hot: number;
  warm: number;
  cool: number;
  cold: number;
}

export interface ScoringInsights {
  total_active_leads: number;
  avg_score: number;
  distribution: ScoreDistribution;
  top_sources: { source: string; avg_score: number; count: number }[];
  at_risk_leads: number;
  hot_leads: number;
}

// Lead Scoring endpoints
export async function getLeadScore(leadId: number): Promise<LeadScoreResponse> {
  return fetchJSON<LeadScoreResponse>(`${baseUrl}/scoring/lead/${leadId}`);
}

export async function getScoredLeads(params: {
  status?: string;
  min_score?: number;
  max_score?: number;
  limit?: number;
  sort?: string;
} = {}): Promise<ScoredLeadsResponse> {
  return fetchJSON<ScoredLeadsResponse>(`${baseUrl}/scoring/leads${toQuery(params)}`);
}

export async function getHotLeads(limit = 10): Promise<LeadScoreResponse[]> {
  return fetchJSON<LeadScoreResponse[]>(`${baseUrl}/scoring/hot${toQuery({ limit })}`);
}

export async function getAtRiskLeads(limit = 10): Promise<LeadScoreResponse[]> {
  return fetchJSON<LeadScoreResponse[]>(`${baseUrl}/scoring/at-risk${toQuery({ limit })}`);
}

export async function getScoringInsights(): Promise<ScoringInsights> {
  return fetchJSON<ScoringInsights>(`${baseUrl}/scoring/insights`);
}

export async function refreshAllScores(): Promise<{ message: string }> {
  return fetchJSON<{ message: string }>(`${baseUrl}/scoring/refresh`, { method: "POST" });
}

// Gamification types
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  display_name: string;
  email: string;
  avatar_color: string;
  value: number;
  change: number;
  streak: number;
}

export interface LeaderboardResponse {
  metric: string;
  metric_label: string;
  period: string;
  period_label: string;
  entries: LeaderboardEntry[];
  total_participants: number;
  last_updated: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned_at?: string;
  progress?: number;
}

export interface UserBadges {
  user_id: number;
  display_name: string;
  earned_badges: Badge[];
  in_progress_badges: Badge[];
  total_points: number;
}

export interface GamificationOverview {
  current_rank: number;
  total_participants: number;
  points_this_month: number;
  badges_earned: number;
  active_competitions: number;
  streak_days: number;
}

// Gamification endpoints
export async function getLeaderboard(params: {
  metric?: "revenue" | "deals" | "activities" | "close_rate";
  period?: "week" | "month" | "quarter" | "year";
} = {}): Promise<LeaderboardResponse> {
  return fetchJSON<LeaderboardResponse>(`${baseUrl}/gamification/leaderboard${toQuery(params)}`);
}

export async function getUserBadges(userId: number): Promise<UserBadges> {
  return fetchJSON<UserBadges>(`${baseUrl}/gamification/badges/${userId}`);
}

export async function getMyBadges(): Promise<UserBadges> {
  return fetchJSON<UserBadges>(`${baseUrl}/gamification/my-badges`);
}

export async function getGamificationOverview(): Promise<GamificationOverview> {
  return fetchJSON<GamificationOverview>(`${baseUrl}/gamification/overview`);
}

// Automation types
export interface AssignmentPreview {
  user_id: number;
  display_name: string;
  current_workload: number;
  close_rate: number;
  estimated_assignment_pct: number;
}

export interface AssignmentPreviewResponse {
  strategy: string;
  strategy_description: string;
  salespeople: AssignmentPreview[];
  unassigned_leads: number;
}

export interface AssignmentStrategy {
  id: string;
  name: string;
  description: string;
}

export interface AutomationSettings {
  auto_assign_enabled: boolean;
  assignment_strategy: string;
  notify_on_assignment: boolean;
  daily_digest_enabled: boolean;
  weekly_recommendations_enabled: boolean;
}

export interface AutomationStats {
  total_leads: number;
  assigned_leads: number;
  unassigned_leads: number;
  assignment_rate: number;
  active_salespeople: number;
  avg_workload_per_rep: number;
}

export interface BulkAssignResponse {
  assignments_made: number;
  assignments: { lead_id: number; assigned_to_user_id: number; assigned_to_name: string }[];
}

// Automation endpoints
export async function getAssignmentStrategies(): Promise<AssignmentStrategy[]> {
  return fetchJSON<AssignmentStrategy[]>(`${baseUrl}/automation/strategies`);
}

export async function getAssignmentPreview(strategy = "best_fit"): Promise<AssignmentPreviewResponse> {
  return fetchJSON<AssignmentPreviewResponse>(`${baseUrl}/automation/preview${toQuery({ strategy })}`);
}

export async function bulkAssignLeads(strategy = "best_fit", limit = 100): Promise<BulkAssignResponse> {
  return fetchJSON<BulkAssignResponse>(`${baseUrl}/automation/assign-bulk`, {
    method: "POST",
    body: JSON.stringify({ strategy, limit }),
  });
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  return fetchJSON<AutomationSettings>(`${baseUrl}/automation/settings`);
}

export async function updateAutomationSettings(settings: Partial<AutomationSettings>): Promise<AutomationSettings> {
  return fetchJSON<AutomationSettings>(`${baseUrl}/automation/settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function getAutomationStats(): Promise<AutomationStats> {
  return fetchJSON<AutomationStats>(`${baseUrl}/automation/stats`);
}

// Named plus default export
export const api = {
  login,
  refresh,
  logout,
  clearToken,
  me,
  createPublicLead,
  createLead,
  getLeads,
  getDashboardMetrics,
  listIntegrationCredentials,
  saveIntegrationCredential,
  getFormConfig,
  updateFormConfig,
  getEmbedCode,
  // AI Chat
  sendChatMessage,
  listChatConversations,
  getChatConversation,
  deleteChatConversation,
  getAIUsage,
  // Analytics
  getTeamKPIs,
  getSalesDashboard,
  getRecommendations,
  getSalespersonKPI,
  // Lead Scoring
  getLeadScore,
  getScoredLeads,
  getHotLeads,
  getAtRiskLeads,
  getScoringInsights,
  refreshAllScores,
  // Gamification
  getLeaderboard,
  getUserBadges,
  getMyBadges,
  getGamificationOverview,
  // Automation
  getAssignmentStrategies,
  getAssignmentPreview,
  bulkAssignLeads,
  getAutomationSettings,
  updateAutomationSettings,
  getAutomationStats,
};

export default api;
