// src/components/AppLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import CrmConnectionBanner from "@/components/CrmConnectionBanner";
import api from "@/utils/api";
import logo from "@/assets/site2crm_logo.png";

export default function AppLayout() {
  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      window.location.href = "/login"; // full reset
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-bg-secondary flex items-center justify-between pl-[5vw] pr-[5vw]">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Site2CRM Logo"
            className="h-8 w-auto"
          />
          <span className="text-xl font-semibold tracking-tight">
            Site2CRM
          </span>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-6 text-sm font-medium">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/salespeople"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Salespeople
          </NavLink>

          {/* New Reports nav item */}
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Reports
          </NavLink>

          <NavLink
            to="/integrations"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Integrations
          </NavLink>

          <NavLink
            to="/account"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Account
          </NavLink>
        </nav>

        {/* Right: Logout */}
        <div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <CrmConnectionBanner />
        <Outlet />
      </main>
    </div>
  );
}
