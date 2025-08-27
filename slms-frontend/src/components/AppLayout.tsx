// src/components/AppLayout.tsx
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/utils/theme";
import QuickCreateMenu from "@/components/QuickCreateMenu";
import ThemeToggle from "@/components/ThemeToggle";
import HelpMenu from "@/components/HelpMenu";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ApiBaseBadge() {
  const envBase = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
  const stored = typeof window !== "undefined" ? localStorage.getItem("slms.apiBase") : null;
  const effective = (stored || envBase).replace(/\/$/, "");
  const overridden = Boolean(stored);

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
        overridden
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      )}
      title={overridden ? `Overridden to ${effective}` : `Using ${effective}`}
    >
      <span className={cx("h-2 w-2 rounded-full", overridden ? "bg-yellow-500" : "bg-gray-400")} />
      API: {overridden ? "Custom" : "Default"}
    </span>
  );
}

export default function AppLayout() {
  // apply saved theme + keep in sync
  useTheme();

  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Sidebar navigation — all live routes (no dead links)
  const nav = useMemo(
    () => [
      { to: "/", label: "Dashboard" },
      { to: "/leads", label: "Leads" },
      { to: "/salespeople", label: "Salespeople" },
      { to: "/reports", label: "Reports" },
      { to: "/analytics", label: "Lead Analytics" },
      { to: "/settings", label: "Settings" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 slms-shell">
      {/* Light-mode card softening (scoped) */}
      <style>{`
        /* --- LIGHT THEME: slightly darker cards + dark text for readability --- */
        :root:not(.dark) .slms-shell .bg-white {
          background-color: rgb(243 244 246) !important; /* gray-100 */
          color: rgb(17 24 39) !important;               /* gray-900 text on cards */
        }
        :root:not(.dark) .slms-shell .bg-white .text-gray-500,
        :root:not(.dark) .slms-shell .bg-white .text-gray-600 {
          color: rgb(55 65 81) !important;               /* promote muted text to ~gray-700 */
        }
        :root:not(.dark) .slms-shell .bg-white thead {
          background-color: rgb(229 231 235) !important; /* gray-200 header strip */
        }
        :root:not(.dark) .slms-shell .bg-white thead th {
          color: rgb(17 24 39) !important;               /* dark header text */
        }
        :root:not(.dark) .slms-shell .border-gray-100 {
          border-color: rgb(229 231 235) !important;     /* gray-200 borders */
        }
        :root:not(.dark) .slms-shell .shadow {
          box-shadow: 0 1px 2px rgb(0 0 0 / 0.06), 0 8px 18px rgb(0 0 0 / 0.06);
        }

        /* --- DARK THEME: make "white cards" dark so light text is readable --- */
        :root.dark .slms-shell .bg-white {
          background-color: rgb(24 24 27) !important;    /* zinc-900 */
          color: rgb(243 244 246) !important;            /* gray-100 text on cards */
        }
        :root.dark .slms-shell .bg-white .text-gray-500,
        :root.dark .slms-shell .bg-white .text-gray-600 {
          color: rgb(209 213 219) !important;            /* gray-300 for secondary text */
        }
        :root.dark .slms-shell .bg-white thead {
          background-color: rgb(39 39 42) !important;    /* zinc-800 header strip */
        }
        :root.dark .slms-shell .bg-white thead th {
          color: rgb(243 244 246) !important;            /* light header text */
        }
        :root.dark .slms-shell .border-gray-100 {
          border-color: rgb(63 63 70) !important;        /* zinc-700 borders */
        }
        :root.dark .slms-shell .shadow {
          box-shadow: 0 1px 2px rgb(0 0 0 / 0.5), 0 8px 18px rgb(0 0 0 / 0.4);
        }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur shadow-sm border-b border-gray-100 dark:bg-gray-900/80 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Mobile menu */}
          <button
            className="lg:hidden rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            Menu
          </button>

          {/* Brand */}
          <Link to="/" className="font-semibold tracking-tight">
            SLMS
          </Link>

          {/* Top links */}
          <nav className="ml-4 hidden md:flex items-center gap-3 text-sm">
            <NavLink
              to="/about"
              className={({ isActive }) =>
                cx(
                  "rounded-md px-2 py-1",
                  isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                )
              }
            >
              About
            </NavLink>
            <span className="text-gray-400">•</span>
            <NavLink
              to="/docs"
              className={({ isActive }) =>
                cx(
                  "rounded-md px-2 py-1",
                  isActive
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                )
              }
              title="Documentation"
            >
              Docs
            </NavLink>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <ApiBaseBadge />
            <QuickCreateMenu />
            <ThemeToggle />
            <HelpMenu />
            {/* New Lead opens the widget */}
            <Link
              to="/widget-test"
              className="hidden sm:inline-flex rounded-md bg-blue-600 text-white px-3 py-2 text-sm dark:bg-blue-500"
              title="Open lead capture widget"
            >
              New Lead
            </Link>
            <button
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
              onClick={() => window.location.reload()}
              title="Reload data"
            >
              Refresh
            </button>
            {/* account stub */}
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              <span>Account</span>
            </div>
          </div>
        </div>
      </header>

      {/* Shell: sidebar + main */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar (persistent) */}
        <aside
          className={cx(
            "rounded-2xl shadow p-4 h-max bg-white dark:bg-gray-900",
            "lg:block",
            mobileOpen ? "block" : "hidden"
          )}
        >
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    "block rounded-md px-3 py-2",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/40 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 border-t pt-4 text-xs text-gray-500 dark:text-gray-400 dark:border-gray-800">
            © {new Date().getFullYear()} SLMS
          </div>
        </aside>

        {/* Routed content */}
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
