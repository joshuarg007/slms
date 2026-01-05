// src/components/CommandPalette.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api";

interface SearchResult {
  id: string;
  type: "action" | "page" | "lead";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

// Icons
const icons = {
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  page: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  lead: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  action: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  recent: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  analytics: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

// All navigable pages
const PAGES: { path: string; name: string; keywords: string[]; icon: React.ReactNode }[] = [
  { path: "/app", name: "Dashboard", keywords: ["home", "overview", "main"], icon: icons.dashboard },
  { path: "/app/leads", name: "Leads", keywords: ["contacts", "prospects", "customers"], icon: icons.lead },
  { path: "/app/salespeople", name: "Salespeople", keywords: ["team", "reps", "agents", "staff"], icon: icons.lead },
  { path: "/app/sales-dashboard", name: "Sales Dashboard", keywords: ["analytics", "metrics", "stats", "performance"], icon: icons.analytics },
  { path: "/app/lead-scoring", name: "Lead Scoring", keywords: ["score", "rank", "priority", "quality"], icon: icons.action },
  { path: "/app/team-kpi", name: "Team Performance", keywords: ["kpi", "metrics", "goals", "targets"], icon: icons.analytics },
  { path: "/app/leaderboard", name: "Leaderboard", keywords: ["ranking", "top", "best", "competition"], icon: icons.action },
  { path: "/app/recommendations", name: "Recommendations", keywords: ["suggestions", "tips", "advice"], icon: icons.action },
  { path: "/app/automation", name: "Automation", keywords: ["rules", "workflows", "auto"], icon: icons.action },
  { path: "/app/forms/fields", name: "Form Fields", keywords: ["inputs", "customize", "form"], icon: icons.page },
  { path: "/app/forms/styles", name: "Form Styles", keywords: ["design", "theme", "appearance"], icon: icons.page },
  { path: "/app/forms/embed", name: "Embed Code", keywords: ["widget", "script", "install"], icon: icons.page },
  { path: "/app/integrations/current", name: "Current CRM", keywords: ["hubspot", "salesforce", "pipedrive", "nutshell"], icon: icons.settings },
  { path: "/app/integrations/update", name: "Update CRM", keywords: ["change", "switch", "connect"], icon: icons.settings },
  { path: "/app/integrations/notifications", name: "Notifications", keywords: ["alerts", "email", "digest"], icon: icons.settings },
  { path: "/app/account", name: "Profile", keywords: ["account", "user", "me"], icon: icons.lead },
  { path: "/app/users", name: "Users", keywords: ["team", "members", "invite"], icon: icons.lead },
  { path: "/app/billing", name: "Billing", keywords: ["payment", "subscription", "plan", "invoice"], icon: icons.page },
  { path: "/app/settings", name: "Settings", keywords: ["preferences", "config", "options"], icon: icons.settings },
];

// Storage key for recent searches
const RECENT_SEARCHES_KEY = "site2crm_recent_searches";

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Check if query looks like gibberish/spam
function isGibberish(query: string): boolean {
  const q = query.trim().toLowerCase();

  // Too short or too long
  if (q.length < 2 || q.length > 50) return true;

  // All same character repeated (e.g., "aaaa", "1111")
  if (/^(.)\1+$/.test(q)) return true;

  // Keyboard smash patterns (consecutive keys)
  const keyboardPatterns = [
    /^[asdfghjkl]+$/i,    // home row
    /^[qwertyuiop]+$/i,   // top row
    /^[zxcvbnm]+$/i,      // bottom row
    /^[123456789]+$/,     // number row
  ];
  if (q.length >= 4 && keyboardPatterns.some(p => p.test(q))) return true;

  // Too many consonants in a row (unlikely in real words)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(q)) return true;

  // Random character mix with no vowels (for queries > 4 chars)
  if (q.length > 4 && !/[aeiou]/i.test(q)) return true;

  // Contains only special characters
  if (/^[^a-z0-9]+$/i.test(q)) return true;

  return false;
}

function saveRecentSearch(query: string) {
  try {
    // Don't save gibberish
    if (isGibberish(query)) return;

    const recent = getRecentSearches().filter(r => r.query !== query);
    recent.unshift({ query, timestamp: Date.now() });
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 10)));
  } catch {
    // ignore
  }
}

// Default quick actions when no search history
const DEFAULT_SUGGESTIONS: { id: string; title: string; path: string; icon: React.ReactNode }[] = [
  { id: "quick-dashboard", title: "Go to Dashboard", path: "/app", icon: icons.dashboard },
  { id: "quick-leads", title: "View Leads", path: "/app/leads", icon: icons.lead },
  { id: "quick-settings", title: "Open Settings", path: "/app/settings", icon: icons.settings },
];

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [leads, setLeads] = useState<{ id: number; name: string; email: string; company?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load recent searches on mount and handle global ESC
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Global ESC handler
      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };
      document.addEventListener("keydown", handleGlobalKeyDown);
      return () => document.removeEventListener("keydown", handleGlobalKeyDown);
    }
  }, [isOpen, onClose]);

  // Debounced search for leads
  useEffect(() => {
    if (!query.trim()) {
      setLeads([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const leadsRes = await api.getLeads({ q: query, page_size: 5 }).catch(() => ({ items: [] }));
        setLeads(leadsRes.items || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(debounce);
  }, [query]);

  // Build results list
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    const items: SearchResult[] = [];

    // If no query, show recent searches + default suggestions
    if (!q) {
      // Recent searches first
      recentSearches.forEach(recent => {
        items.push({
          id: `recent-${recent.query}`,
          type: "action",
          title: recent.query,
          subtitle: "Recent search",
          icon: icons.recent,
          action: () => {
            setQuery(recent.query);
          },
        });
      });

      // Clear history option if there are recent searches
      if (recentSearches.length > 0) {
        items.push({
          id: "action-clear-recent",
          type: "action",
          title: "Clear recent searches",
          icon: icons.action,
          action: () => {
            clearRecentSearches();
            setRecentSearches([]);
          },
        });
      }

      // Always show default quick actions
      DEFAULT_SUGGESTIONS.forEach(suggestion => {
        items.push({
          id: suggestion.id,
          type: "page",
          title: suggestion.title,
          subtitle: "Quick action",
          icon: suggestion.icon,
          action: () => {
            navigate(suggestion.path);
            onClose();
          },
        });
      });

      return items;
    }

    // Filter pages by name or keywords
    const matchingPages = PAGES.filter(page => {
      const nameMatch = page.name.toLowerCase().includes(q);
      const keywordMatch = page.keywords.some(kw => kw.includes(q));
      return nameMatch || keywordMatch;
    });

    matchingPages.forEach(page => {
      items.push({
        id: `page-${page.path}`,
        type: "page",
        title: page.name,
        subtitle: "Go to page",
        icon: page.icon,
        action: () => {
          navigate(page.path);
          saveRecentSearch(query);
          onClose();
        },
      });
    });

    // Add leads
    leads.forEach(lead => {
      items.push({
        id: `lead-${lead.id}`,
        type: "lead",
        title: lead.name || lead.email,
        subtitle: lead.company || lead.email,
        icon: icons.lead,
        action: () => {
          navigate(`/app/leads?highlight=${lead.id}`);
          saveRecentSearch(query);
          onClose();
        },
      });
    });

    // If query but no results, add "search leads" action
    if (items.length === 0 && q) {
      items.push({
        id: "action-search-leads",
        type: "action",
        title: `Search leads for "${query}"`,
        icon: icons.search,
        action: () => {
          navigate(`/app/leads?q=${encodeURIComponent(query)}`);
          saveRecentSearch(query);
          onClose();
        },
      });
    }

    return items;
  }, [query, leads, recentSearches, navigate, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedEl?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop - click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-400">{icons.search}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, leads, salespeople..."
            className="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <svg className="w-5 h-5 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <div className="px-5 py-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {/* Group results by type */}
              {["page", "lead", "action"].map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) return null;

                const typeLabel = type === "page" ? "Pages" : type === "lead" ? "Leads" : "Actions";

                return (
                  <div key={type}>
                    {query.trim() && type !== "action" && typeResults.length > 0 && (
                      <div className="px-5 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {typeLabel}
                      </div>
                    )}
                    {typeResults.map((result) => {
                      const globalIndex = results.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={result.id}
                          data-index={globalIndex}
                          onClick={() => result.action()}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <span className={`flex-shrink-0 p-2 rounded-lg ${
                            isSelected
                              ? "bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}>
                            {result.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${
                              isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-gray-900 dark:text-gray-100"
                            }`}>
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <span className="flex-shrink-0 text-xs text-indigo-500 dark:text-indigo-400">
                              Press Enter
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">ESC</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
