import { NavLink, Outlet, Link } from "react-router-dom";
import AccountMenu from "@/components/AccountMenu";
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/salespeople", label: "Salespeople" },
  { to: "/reports", label: "Reports" },
  { to: "/integrations", label: "Integrations" },
  { to: "/settings", label: "Settings" },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false); // mobile sidebar
  const { logout } = useAuth();
  const nav = useNavigate();

  async function handleLogout() {
    try {
      await logout(); // clears cookies/localStorage + sets user=null
    } finally {
      nav("/welcome", { replace: true }); // public landing to avoid auth race
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          {/* Mobile menu */}
          <button
            className="md:hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Brand */}
          <Link to="/" className="font-semibold">SLMS</Link>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-2">
            {/* Room for extra buttons (Docs, Help, etc.) if needed */}
            <AccountMenu onSignOut={handleLogout} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 py-6">
          {/* Sidebar */}
          <aside>
            {/* Mobile sheet */}
            {open && (
              <div className="md:hidden mb-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
                <NavList onNavigate={() => setOpen(false)} />
              </div>
            )}
            {/* Desktop */}
            <div className="hidden md:block sticky top-20 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2">
              <NavList />
            </div>
          </aside>

          {/* Main content */}
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const base = "block rounded-lg px-3 py-2 text-sm transition-colors";
  const active = "bg-indigo-600 text-white hover:bg-indigo-600";
  const inactive = "text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800";

  return (
    <nav className="space-y-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          onClick={onNavigate}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
