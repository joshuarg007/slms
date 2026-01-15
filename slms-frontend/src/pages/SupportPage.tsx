// src/pages/SupportPage.tsx
// Comprehensive support page with self-service tools to minimize support tickets

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { getApiBase } from "@/utils/api";

// =============================================================================
// Types
// =============================================================================

type FAQCategory = "getting-started" | "crm" | "forms" | "billing" | "account" | "data";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  keywords: string[];
}

interface KnownIssue {
  id: string;
  title: string;
  description: string;
  status: "investigating" | "identified" | "monitoring" | "resolved";
  affected: string[];
  created_at: string;
  updated_at: string;
}

interface DiagnosticResult {
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  fix?: string;
  action?: { label: string; href: string };
}

interface SystemStatus {
  api: "operational" | "degraded" | "down";
  database: "operational" | "degraded" | "down";
  integrations: {
    hubspot: "operational" | "degraded" | "down";
    salesforce: "operational" | "degraded" | "down";
    pipedrive: "operational" | "degraded" | "down";
    zoho: "operational" | "degraded" | "down";
    nutshell: "operational" | "degraded" | "down";
  };
  lastChecked: string;
}

// =============================================================================
// FAQ Data
// =============================================================================

const FAQ_CATEGORIES: { id: FAQCategory; label: string; icon: string; description: string }[] = [
  { id: "getting-started", label: "Getting Started", icon: "rocket", description: "Setup and first steps" },
  { id: "crm", label: "CRM Connections", icon: "link", description: "OAuth, sync, and troubleshooting" },
  { id: "forms", label: "Forms & Embedding", icon: "code", description: "Widget setup and styling" },
  { id: "billing", label: "Billing & Plans", icon: "credit-card", description: "Payments and upgrades" },
  { id: "account", label: "Account & Security", icon: "shield", description: "Password, 2FA, team" },
  { id: "data", label: "Data & Privacy", icon: "database", description: "Export, deletion, GDPR" },
];

const FAQ_DATA: FAQItem[] = [
  // Getting Started
  {
    id: "gs-1",
    question: "How do I create my first lead capture form?",
    answer: "Go to Forms in the sidebar, click 'Create Form', choose your style (inline, modal, or drawer), configure your fields, and copy the embed code to your website. Your first form takes about 2 minutes to set up.",
    category: "getting-started",
    keywords: ["create", "form", "first", "start", "begin", "new"],
  },
  {
    id: "gs-2",
    question: "How do I connect my CRM?",
    answer: "Navigate to Integrations > Update CRM, select your CRM provider, and click 'Connect with OAuth'. You'll be redirected to authorize Site2CRM. Once connected, leads sync automatically within seconds.",
    category: "getting-started",
    keywords: ["connect", "crm", "integration", "setup", "link"],
  },
  {
    id: "gs-3",
    question: "Where do I find my embed code?",
    answer: "Go to Forms, select your form, and click 'Get Embed Code'. Copy the script tag and paste it into your website's HTML, just before the closing </body> tag. The form will appear automatically.",
    category: "getting-started",
    keywords: ["embed", "code", "script", "install", "website"],
  },
  {
    id: "gs-4",
    question: "How long does it take for leads to sync to my CRM?",
    answer: "Leads sync to your CRM within 3-5 seconds of form submission. You can verify sync status on the Leads page - successfully synced leads show a green checkmark.",
    category: "getting-started",
    keywords: ["sync", "time", "delay", "speed", "fast"],
  },

  // CRM Connections
  {
    id: "crm-1",
    question: "My CRM connection stopped working. How do I fix it?",
    answer: "OAuth tokens expire periodically. Go to Integrations > Update CRM, find your CRM, and click 'Reconnect'. This refreshes your authentication. If issues persist, try disconnecting and reconnecting completely.",
    category: "crm",
    keywords: ["broken", "stopped", "not working", "error", "expired", "reconnect"],
  },
  {
    id: "crm-2",
    question: "Why are my leads not appearing in my CRM?",
    answer: "Check these common causes: 1) CRM connection may have expired (reconnect it), 2) You may have hit your plan's lead limit, 3) There might be a field mapping issue. Use the 'Test Connection' button to diagnose.",
    category: "crm",
    keywords: ["leads", "not appearing", "missing", "sync", "crm"],
  },
  {
    id: "crm-3",
    question: "Can I connect multiple CRMs?",
    answer: "You can connect multiple CRMs, but only one can be 'active' at a time. The active CRM receives all new leads. You can switch the active CRM anytime from the Integrations page.",
    category: "crm",
    keywords: ["multiple", "crm", "switch", "change", "two"],
  },
  {
    id: "crm-4",
    question: "What CRM permissions does Site2CRM need?",
    answer: "Site2CRM needs permission to create contacts/leads and read basic account info. We never delete data or access sensitive information. You can review exact permissions during OAuth authorization.",
    category: "crm",
    keywords: ["permissions", "access", "oauth", "security", "scope"],
  },
  {
    id: "crm-5",
    question: "How do I disconnect my CRM?",
    answer: "Go to Integrations > Update CRM, find your connected CRM, and click 'Disconnect'. This revokes Site2CRM's access. Your existing leads remain in your CRM - we never delete data.",
    category: "crm",
    keywords: ["disconnect", "remove", "unlink", "revoke"],
  },
  {
    id: "crm-6",
    question: "HubSpot OAuth vs API Key - which should I use?",
    answer: "OAuth (recommended) is more secure and doesn't expire. API keys work but require manual rotation. OAuth also provides better error messages and automatic token refresh.",
    category: "crm",
    keywords: ["hubspot", "oauth", "api", "key", "token", "which"],
  },
  {
    id: "crm-7",
    question: "Salesforce says 'insufficient permissions' - how do I fix this?",
    answer: "Your Salesforce user needs 'API Enabled' permission and access to create Leads or Contacts. Ask your Salesforce admin to check your profile permissions, or try connecting with an admin account.",
    category: "crm",
    keywords: ["salesforce", "permission", "access", "denied", "admin"],
  },
  {
    id: "crm-8",
    question: "Can I map form fields to custom CRM fields?",
    answer: "Yes! In Forms > Edit Form > Field Mapping, you can map each form field to standard or custom CRM fields. This ensures data lands exactly where you need it.",
    category: "crm",
    keywords: ["map", "mapping", "custom", "field", "property"],
  },

  // Forms & Embedding
  {
    id: "forms-1",
    question: "My form isn't showing on my website. What's wrong?",
    answer: "Check these: 1) Embed code placed before </body>, 2) No JavaScript errors in browser console, 3) Ad blockers disabled, 4) Correct API key in embed code. Try our embed code validator in Quick Actions above.",
    category: "forms",
    keywords: ["form", "not showing", "invisible", "blank", "missing"],
  },
  {
    id: "forms-2",
    question: "How do I customize my form's appearance?",
    answer: "In Forms > Edit Form > Styling, you can change colors, fonts, border radius, and more. Use 'Custom CSS' for advanced styling. Preview changes in real-time before saving.",
    category: "forms",
    keywords: ["customize", "style", "color", "design", "appearance", "css"],
  },
  {
    id: "forms-3",
    question: "Can I have multiple forms on the same page?",
    answer: "Yes! Each form has a unique ID. Include multiple embed codes on your page - they'll work independently. You can also trigger different forms programmatically.",
    category: "forms",
    keywords: ["multiple", "forms", "same page", "two", "several"],
  },
  {
    id: "forms-4",
    question: "What's the difference between inline, modal, and drawer forms?",
    answer: "Inline forms embed directly in your page. Modal forms appear as popups triggered by a button. Drawer forms slide in from the side. Choose based on your UX preference and page layout.",
    category: "forms",
    keywords: ["inline", "modal", "drawer", "popup", "type", "difference"],
  },
  {
    id: "forms-5",
    question: "How do I add or remove form fields?",
    answer: "In Forms > Edit Form > Fields, toggle fields on/off and drag to reorder. You can also set fields as required or optional, and customize labels and placeholders.",
    category: "forms",
    keywords: ["add", "remove", "field", "fields", "customize"],
  },
  {
    id: "forms-6",
    question: "My form works locally but not in production. Why?",
    answer: "Check that your production domain is whitelisted in Settings > Domains. Also verify HTTPS is enabled - forms require secure connections in production.",
    category: "forms",
    keywords: ["production", "local", "domain", "https", "ssl"],
  },

  // Billing & Plans
  {
    id: "billing-1",
    question: "How do I upgrade my plan?",
    answer: "Go to Settings > Billing and click 'Upgrade'. Choose your new plan and billing cycle. The upgrade takes effect immediately, with prorated billing for the remainder of your cycle.",
    category: "billing",
    keywords: ["upgrade", "plan", "change", "subscription"],
  },
  {
    id: "billing-2",
    question: "What happens when I hit my lead limit?",
    answer: "When you reach your monthly lead limit, new form submissions are held until the next billing cycle or until you upgrade. Existing leads are unaffected. We'll email you at 80% usage.",
    category: "billing",
    keywords: ["limit", "leads", "quota", "reached", "full"],
  },
  {
    id: "billing-3",
    question: "How do I update my payment method?",
    answer: "Go to Settings > Billing > Payment Method and click 'Update'. You can add a new card or switch payment methods. We use Stripe for secure payment processing.",
    category: "billing",
    keywords: ["payment", "card", "update", "change", "credit"],
  },
  {
    id: "billing-4",
    question: "Can I get a refund?",
    answer: "We offer a 14-day money-back guarantee for new subscriptions. For other refund requests, contact support with your order details and we'll review your case.",
    category: "billing",
    keywords: ["refund", "money back", "cancel", "return"],
  },
  {
    id: "billing-5",
    question: "How do I cancel my subscription?",
    answer: "Go to Settings > Billing and click 'Cancel Subscription'. You'll retain access until the end of your billing period. Your data is kept for 30 days in case you return.",
    category: "billing",
    keywords: ["cancel", "subscription", "stop", "end"],
  },

  // Account & Security
  {
    id: "account-1",
    question: "How do I reset my password?",
    answer: "Click 'Forgot Password' on the login page, enter your email, and we'll send a reset link. Links expire in 24 hours. If you're logged in, go to Settings > Security to change your password.",
    category: "account",
    keywords: ["password", "reset", "forgot", "change"],
  },
  {
    id: "account-2",
    question: "How do I invite team members?",
    answer: "Go to Settings > Team > Invite Member. Enter their email and select a role (Admin, User, or Read-Only). They'll receive an invitation email to create their account.",
    category: "account",
    keywords: ["invite", "team", "member", "add", "user"],
  },
  {
    id: "account-3",
    question: "What are the different user roles?",
    answer: "Owner: Full access including billing. Admin: Manage settings and users. User: Work with leads and forms. Read-Only: View-only access to dashboards and reports.",
    category: "account",
    keywords: ["role", "roles", "permission", "admin", "user", "owner"],
  },
  {
    id: "account-4",
    question: "How do I enable two-factor authentication (2FA)?",
    answer: "Go to Settings > Security > Two-Factor Authentication and click 'Enable'. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) and enter the verification code.",
    category: "account",
    keywords: ["2fa", "two factor", "authentication", "security", "mfa"],
  },

  // Data & Privacy
  {
    id: "data-1",
    question: "How do I export my leads?",
    answer: "Go to Leads, use filters if needed, then click 'Export'. Choose CSV or JSON format. For large exports, we'll email you a download link when ready.",
    category: "data",
    keywords: ["export", "download", "csv", "leads", "data"],
  },
  {
    id: "data-2",
    question: "How do I delete my account and all data?",
    answer: "Go to Settings > Account > Delete Account. This permanently removes your account, all leads, forms, and settings. This action cannot be undone. We'll send confirmation when complete.",
    category: "data",
    keywords: ["delete", "account", "remove", "gdpr", "data"],
  },
  {
    id: "data-3",
    question: "Is my data secure?",
    answer: "Yes. We use AES-256 encryption at rest, TLS 1.3 in transit, and SOC 2 compliant infrastructure. CRM credentials are encrypted and never stored in plain text. We never sell your data.",
    category: "data",
    keywords: ["secure", "security", "encryption", "safe", "privacy"],
  },
  {
    id: "data-4",
    question: "Are you GDPR compliant?",
    answer: "Yes. We provide data export, deletion on request, and a Data Processing Agreement (DPA). Contact support for a copy of our DPA. We process EU data on EU-based servers.",
    category: "data",
    keywords: ["gdpr", "compliance", "privacy", "eu", "dpa"],
  },
];

// =============================================================================
// Video Tutorials Data
// =============================================================================

const VIDEO_TUTORIALS = [
  { id: "connect-crm", title: "Connect Your CRM", duration: "0:53", thumbnail: "crm", url: "https://site2crm.io/media/connect-crm.mp4" },
  { id: "create-form", title: "Create Your First Form", duration: "0:59", thumbnail: "form", url: "https://site2crm.io/media/create-form.mp4" },
];

// =============================================================================
// Helper Components
// =============================================================================

function StatusBadge({ status }: { status: "operational" | "degraded" | "down" | "investigating" | "identified" | "monitoring" | "resolved" }) {
  const styles = {
    operational: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    degraded: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    down: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    investigating: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    identified: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    monitoring: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  const labels = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    investigating: "Investigating",
    identified: "Identified",
    monitoring: "Monitoring",
    resolved: "Resolved",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function Icon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    rocket: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />,
    link: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
    code: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
    "credit-card": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    database: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    refresh: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />,
    chevronDown: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />,
    chevronUp: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />,
    externalLink: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />,
    play: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />,
    chat: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    upload: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
    clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    key: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
    book: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    activity: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  };

  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name] || icons.check}
    </svg>
  );
}

// =============================================================================
// Connection Doctor Component
// =============================================================================

function ConnectionDoctor({ onClose }: { onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [currentCheck, setCurrentCheck] = useState("");

  async function runDiagnostics() {
    setRunning(true);
    setResults([]);

    const checks = [
      { name: "API Connection", endpoint: "/health" },
      { name: "Authentication", endpoint: "/auth/me" },
      { name: "CRM Status", endpoint: "/integrations/credentials" },
      { name: "Organization", endpoint: "/orgs/current" },
    ];

    const newResults: DiagnosticResult[] = [];

    for (const check of checks) {
      setCurrentCheck(check.name);
      await new Promise((r) => setTimeout(r, 500)); // Simulate check time

      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${getApiBase()}${check.endpoint}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        });

        if (res.ok) {
          if (check.name === "CRM Status") {
            const creds = await res.json();
            const activeCreds = Array.isArray(creds) ? creds.filter((c: any) => c.is_active) : [];
            if (activeCreds.length === 0) {
              newResults.push({
                check: check.name,
                status: "warning",
                message: "No active CRM connection found",
                fix: "Connect a CRM to start syncing leads",
                action: { label: "Connect CRM", href: "/app/integrations/update" },
              });
            } else {
              newResults.push({
                check: check.name,
                status: "pass",
                message: `${activeCreds.length} active connection(s)`,
              });
            }
          } else {
            newResults.push({
              check: check.name,
              status: "pass",
              message: "Working correctly",
            });
          }
        } else if (res.status === 401) {
          newResults.push({
            check: check.name,
            status: "fail",
            message: "Authentication expired",
            fix: "Please log out and log back in",
            action: { label: "Log Out", href: "/logout" },
          });
        } else {
          newResults.push({
            check: check.name,
            status: "fail",
            message: `Error: ${res.status}`,
            fix: "Please try again or contact support",
          });
        }
      } catch (e) {
        newResults.push({
          check: check.name,
          status: "fail",
          message: "Connection failed",
          fix: "Check your internet connection",
        });
      }

      setResults([...newResults]);
    }

    setCurrentCheck("");
    setRunning(false);
  }

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Icon name="activity" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Doctor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Diagnosing your setup...</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Icon name="x" className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {results.map((result, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                result.status === "pass" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                result.status === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
                "bg-red-100 dark:bg-red-900/30"
              }`}>
                <Icon
                  name={result.status === "pass" ? "check" : result.status === "warning" ? "warning" : "x"}
                  className={`w-4 h-4 ${
                    result.status === "pass" ? "text-emerald-600 dark:text-emerald-400" :
                    result.status === "warning" ? "text-amber-600 dark:text-amber-400" :
                    "text-red-600 dark:text-red-400"
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 dark:text-white">{result.check}</p>
                  <StatusBadge status={result.status === "pass" ? "operational" : result.status === "warning" ? "degraded" : "down"} />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{result.message}</p>
                {result.fix && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{result.fix}</p>
                )}
                {result.action && (
                  <Link to={result.action.href} className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                    {result.action.label}
                    <Icon name="externalLink" className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}

          {running && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
              <svg className="animate-spin w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-indigo-700 dark:text-indigo-300">Checking {currentCheck}...</span>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={runDiagnostics}
            disabled={running}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="refresh" className="w-4 h-4" />
            Run Again
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Contact Form Component
// =============================================================================

function ContactForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [issueType, setIssueType] = useState("");
  const [details, setDetails] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRelevantFAQ, setShowRelevantFAQ] = useState<FAQItem | null>(null);

  // Auto-collect diagnostics
  const diagnostics = useMemo(() => ({
    browser: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    screen: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }), []);

  const issueTypes = [
    { value: "crm-connection", label: "CRM Connection Issue", category: "crm" },
    { value: "form-not-showing", label: "Form Not Appearing", category: "forms" },
    { value: "leads-not-syncing", label: "Leads Not Syncing", category: "crm" },
    { value: "billing", label: "Billing Question", category: "billing" },
    { value: "account", label: "Account Issue", category: "account" },
    { value: "feature-request", label: "Feature Request", category: null },
    { value: "bug-report", label: "Bug Report", category: null },
    { value: "other", label: "Other", category: null },
  ];

  // Show relevant FAQ when issue type changes
  useEffect(() => {
    if (!issueType) {
      setShowRelevantFAQ(null);
      return;
    }
    const selected = issueTypes.find((t) => t.value === issueType);
    if (selected?.category) {
      const relevantFAQ = FAQ_DATA.find((f) => f.category === selected.category);
      setShowRelevantFAQ(relevantFAQ || null);
    } else {
      setShowRelevantFAQ(null);
    }
  }, [issueType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!issueType || !details.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const issueLabel = issueTypes.find((t) => t.value === issueType)?.label || issueType;

      const res = await fetch(`${getApiBase()}/support/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          issue_type: issueType,
          issue_label: issueLabel,
          details: `${details}\n\n---\nDiagnostics:\nBrowser: ${diagnostics.browser}\nURL: ${diagnostics.url}\nScreen: ${diagnostics.screen}\nTimezone: ${diagnostics.timezone}\nTime: ${diagnostics.timestamp}`,
          contact_email: user?.email,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      onSuccess();
    } catch (e) {
      alert("Failed to submit. Please try again or email support@site2crm.io directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Icon name="chat" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contact Support</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">We typically respond within 4 hours</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Icon name="x" className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Pre-populated info */}
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Logged in as:</span>
              <span className="font-medium text-gray-900 dark:text-white">{user?.email || "Not logged in"}</span>
            </div>
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What do you need help with?
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              required
            >
              <option value="">Select an issue type...</option>
              {issueTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Show relevant FAQ before allowing form submission */}
          {showRelevantFAQ && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Icon name="warning" className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">This might help:</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1 font-medium">{showRelevantFAQ.question}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{showRelevantFAQ.answer.slice(0, 150)}...</p>
                  <button
                    type="button"
                    onClick={() => setShowRelevantFAQ(null)}
                    className="text-sm text-amber-700 dark:text-amber-300 hover:underline mt-2"
                  >
                    This didn't help, continue to form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe the issue
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder="Please describe what happened, what you expected, and any steps to reproduce..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
              required
            />
          </div>

          {/* Screenshot upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Screenshot (optional)
            </label>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center hover:border-indigo-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="hidden"
                id="screenshot-upload"
              />
              <label htmlFor="screenshot-upload" className="cursor-pointer">
                {screenshot ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Icon name="check" className="w-5 h-5" />
                    <span className="text-sm font-medium">{screenshot.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Icon name="upload" className="w-8 h-8" />
                    <span className="text-sm">Click to upload or drag and drop</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Auto-collected diagnostics note */}
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Auto-collected:</strong> Browser info, screen size, and timezone will be included to help us diagnose the issue faster.
            </p>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !issueType || !details.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <Icon name="mail" className="w-4 h-4" />
                Send Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Support Page
// =============================================================================

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | "all">("all");
  const [showDoctor, setShowDoctor] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [knownIssues, setKnownIssues] = useState<KnownIssue[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Fetch system status and known issues
  useEffect(() => {
    async function fetchStatus() {
      try {
        // Simulate status check - in production, this would hit real endpoints
        const res = await fetch(`${getApiBase()}/health`);
        if (res.ok) {
          setSystemStatus({
            api: "operational",
            database: "operational",
            integrations: {
              hubspot: "operational",
              salesforce: "operational",
              pipedrive: "operational",
              zoho: "operational",
              nutshell: "operational",
            },
            lastChecked: new Date().toISOString(),
          });
        }
      } catch {
        setSystemStatus({
          api: "degraded",
          database: "operational",
          integrations: {
            hubspot: "operational",
            salesforce: "operational",
            pipedrive: "operational",
            zoho: "operational",
            nutshell: "operational",
          },
          lastChecked: new Date().toISOString(),
        });
      }
      setLoadingStatus(false);
    }
    fetchStatus();
  }, []);

  // Filter FAQs based on search and category
  const filteredFAQs = useMemo(() => {
    let items = FAQ_DATA;

    if (selectedCategory !== "all") {
      items = items.filter((f) => f.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q) ||
          f.keywords.some((k) => k.includes(q))
      );
    }

    return items;
  }, [searchQuery, selectedCategory]);

  return (
    <div className="mx-auto max-w-5xl pb-12">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Icon name="chat" className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
          Find answers, troubleshoot issues, or contact our support team.
        </p>
      </header>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for answers... (e.g., 'CRM not syncing', 'embed form')"
          className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <Icon name="x" className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setShowDoctor(true)}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="activity" className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Test Connection</span>
        </button>

        <button
          onClick={() => window.open(`${getApiBase()}/health`, "_blank")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="check" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">System Status</span>
        </button>

        <Link
          to="/forgot-password"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="key" className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Reset Password</span>
        </Link>

        <a
          href="https://docs.site2crm.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon name="book" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Documentation</span>
        </a>
      </div>

      {/* Known Issues Banner */}
      {knownIssues.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-200">Known Issues</h3>
              {knownIssues.map((issue) => (
                <div key={issue.id} className="mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{issue.title}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{issue.description}</p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Status Summary */}
      {systemStatus && (
        <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Icon name="activity" className="w-4 h-4" />
              System Status
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last checked: {new Date(systemStatus.lastChecked).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.api === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.database === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.integrations.hubspot === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">HubSpot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${systemStatus.integrations.salesforce === "operational" ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Salesforce</span>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Categories */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selectedCategory === "all"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          All Topics
        </button>
        {FAQ_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === cat.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-3 mb-8">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="search" className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Try a different search term or browse by category
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white pr-4">{faq.question}</span>
                <Icon
                  name={expandedFAQ === faq.id ? "chevronUp" : "chevronDown"}
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                />
              </button>
              {expandedFAQ === faq.id && (
                <div className="px-4 pb-4 pt-0">
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{faq.answer}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-400">Was this helpful?</span>
                      <button className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded text-gray-400 hover:text-emerald-600">
                        <Icon name="check" className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-gray-400 hover:text-red-600">
                        <Icon name="x" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Video Tutorials */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Icon name="play" className="w-5 h-5" />
          Video Tutorials
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {VIDEO_TUTORIALS.map((video) => (
            <a
              key={video.id}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 aspect-video hover:shadow-lg transition-all"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Icon name="play" className="w-5 h-5 text-indigo-600 dark:text-indigo-400 ml-0.5" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-xs font-medium text-white">{video.title}</p>
                <p className="text-xs text-white/70">{video.duration}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Still Need Help */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">Still need help?</h2>
            <p className="text-indigo-100">Our support team typically responds within 4 hours.</p>
          </div>
          <button
            onClick={() => setShowContactForm(true)}
            className="px-6 py-3 bg-white text-indigo-600 font-medium rounded-xl hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <Icon name="mail" className="w-5 h-5" />
            Contact Support
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom">
          <Icon name="check" className="w-5 h-5" />
          <span>Support request submitted! We'll respond within 4 hours.</span>
          <button onClick={() => setShowSuccessMessage(false)} className="p-1 hover:bg-white/20 rounded">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showDoctor && <ConnectionDoctor onClose={() => setShowDoctor(false)} />}
      {showContactForm && (
        <ContactForm
          onClose={() => setShowContactForm(false)}
          onSuccess={() => {
            setShowContactForm(false);
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 5000);
          }}
        />
      )}
    </div>
  );
}
