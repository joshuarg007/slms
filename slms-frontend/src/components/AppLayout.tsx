// src/components/AppLayout.tsx
import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CrmConnectionBanner from "@/components/CrmConnectionBanner";
// import AIFloatingAssistant from "@/components/AIFloatingAssistant"; // AI features disabled
import { NetworkStatusBanner } from "@/components/NetworkStatus";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { NotificationBell } from "@/components/NotificationBell";
import { SkipLink, useKeyboardShortcuts, KeyboardShortcutsDialog, useAnnounce } from "@/components/Accessibility";
import api from "@/utils/api";
import Logo from "@/components/Logo";

// Icon components for sidebar
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  leads: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  salespeople: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  fields: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  styles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  embed: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  crm: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  notifications: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  billing: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  chat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  analytics: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  team: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  recommendations: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  scoring: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  leaderboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  automation: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  indent?: boolean;
}

function NavItem({ to, icon, label, end, indent }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          indent ? "ml-3" : ""
        } ${
          isActive
            ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
        }`
      }
    >
      <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}

// Keyboard shortcuts configuration
const APP_SHORTCUTS = [
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "/", description: "Focus search" },
  { key: "d", modifier: "g", description: "Go to Dashboard" },
  { key: "l", modifier: "g", description: "Go to Leads" },
  { key: "s", modifier: "g", description: "Go to Salespeople" },
  { key: "Escape", description: "Close dialogs" },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const announce = useAnnounce();

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "?",
      description: "Show keyboard shortcuts",
      action: () => setShortcutsOpen(true),
    },
    {
      key: "/",
      description: "Focus search",
      action: () => {
        searchInputRef.current?.focus();
        announce("Search focused");
      },
    },
    {
      key: "d",
      description: "Go to Dashboard",
      action: () => {
        navigate("/app");
        announce("Navigated to Dashboard");
      },
    },
    {
      key: "l",
      description: "Go to Leads",
      action: () => {
        navigate("/app/leads");
        announce("Navigated to Leads");
      },
    },
    {
      key: "s",
      description: "Go to Salespeople",
      action: () => {
        navigate("/app/salespeople");
        announce("Navigated to Salespeople");
      },
    },
  ]);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((res) => {
        if (mounted) setUserEmail(res.email);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      window.location.href = "/login";
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    navigate(`/app/leads?q=${encodeURIComponent(q)}`);
  }

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Skip Link for keyboard users */}
      <SkipLink targetId="main-content">Skip to main content</SkipLink>

      {/* Network Status Banner */}
      <NetworkStatusBanner />

      {/* Header */}
      <header
        role="banner"
        className="sticky top-0 z-50 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 flex items-center px-6"
      >
        {/* Logo */}
        <div className="flex items-center mr-8">
          <Logo linkTo="/app" size="sm" />
        </div>

        {/* Search - centered */}
        <div className="flex-1 flex justify-center">
          <form
            onSubmit={handleSearchSubmit}
            className={`relative flex items-center transition-all duration-300 ${
              searchFocused ? "w-96" : "w-72"
            }`}
          >
            <span className="absolute left-3 text-gray-400">
              {icons.search}
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search leads, contacts... (press /)"
              aria-label="Search leads and contacts"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </form>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Keyboard shortcuts hint */}
          <button
            onClick={() => setShortcutsOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Show keyboard shortcuts"
            title="Keyboard shortcuts"
          >
            <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-200 dark:bg-gray-700 rounded">?</kbd>
            <span>Shortcuts</span>
          </button>

          <NotificationBell />

          <NavLink
            to="/app/account"
            className="flex items-center gap-3 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Account settings for ${userEmail || "user"}`}
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-semibold shadow-sm">
              {userInitial}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
              {userEmail ? userEmail.split("@")[0] : "Account"}
            </span>
          </NavLink>

          <button
            onClick={handleLogout}
            aria-label="Log out of your account"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            {icons.logout}
            <span className="hidden sm:block">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          role="complementary"
          aria-label="Main navigation sidebar"
          className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 p-4 overflow-y-auto"
        >
          <nav role="navigation" aria-label="Main navigation" className="space-y-6">
            {/* Main */}
            <div>
              <SectionLabel>Main</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/app" icon={icons.dashboard} label="Dashboard" end />
                <NavItem to="/app/leads" icon={icons.leads} label="Leads" />
                <NavItem to="/app/salespeople" icon={icons.salespeople} label="Salespeople" />
                {/* AI Consultant disabled - <NavItem to="/app/chat" icon={icons.chat} label="AI Consultant" /> */}
              </div>
            </div>

            {/* Analytics */}
            <div>
              <SectionLabel>Analytics</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/app/sales-dashboard" icon={icons.analytics} label="Sales Dashboard" />
                <NavItem to="/app/lead-scoring" icon={icons.scoring} label="Lead Scoring" />
                <NavItem to="/app/team-kpi" icon={icons.team} label="Team Performance" />
                <NavItem to="/app/leaderboard" icon={icons.leaderboard} label="Leaderboard" />
                <NavItem to="/app/recommendations" icon={icons.recommendations} label="Recommendations" />
                <NavItem to="/app/automation" icon={icons.automation} label="Automation" />
              </div>
            </div>

            {/* Forms */}
            <div>
              <SectionLabel>Forms</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/app/forms/fields" icon={icons.fields} label="Fields" />
                <NavItem to="/app/forms/styles" icon={icons.styles} label="Styles" />
                <NavItem to="/app/forms/embed" icon={icons.embed} label="Embed Code" />
              </div>
            </div>

            {/* Integrations */}
            <div>
              <SectionLabel>Integrations</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/app/integrations/current" icon={icons.crm} label="Current CRM" />
                <NavItem to="/app/integrations/update" icon={icons.crm} label="Update CRM" indent />
                <NavItem to="/app/integrations/notifications" icon={icons.notifications} label="Notifications" indent />
              </div>
            </div>

            {/* Account */}
            <div>
              <SectionLabel>Account</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/app/account" icon={icons.profile} label="Profile" />
                <NavItem to="/app/users" icon={icons.users} label="Users" />
                <NavItem to="/app/billing" icon={icons.billing} label="Billing" />
                <NavItem to="/app/settings" icon={icons.settings} label="Settings" />
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main
          id="main-content"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
          className="flex-1 p-6 overflow-y-auto focus:outline-none"
        >
          <CrmConnectionBanner />
          <PageErrorBoundary>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>

      {/* AI Floating Assistant - disabled */}
      {/* <AIFloatingAssistant /> */}

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        shortcuts={APP_SHORTCUTS}
      />
    </div>
  );
}
