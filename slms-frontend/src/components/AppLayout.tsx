// src/components/AppLayout.tsx
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import CrmConnectionBanner from "@/components/CrmConnectionBanner";
import api from "@/utils/api";
import logo from "@/assets/site2crm_logo.png";

export default function AppLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    navigate(`/leads?q=${encodeURIComponent(q)}`);
  }

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary">
      <header className="h-20 bg-gradient-to-r from-bg-secondary via-bg-primary to-bg-secondary flex items-center gap-8 pl-[5vw] pr-[5vw] mb-[9vh] pt-3">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img src={logo} alt="Site2CRM Logo" className="h-16 w-auto" />
        </div>

        {/* Center: Navigation, pulled left */}
        <nav className="flex-1 flex items-center gap-6 text-sm font-medium ml-8">
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
            to="/account"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Profile
          </NavLink>

          <NavLink
            to="/leads"
            className={({ isActive }) =>
              isActive
                ? "text-brand-gray-dark border-b-2 border-brand-gray-dark pb-1"
                : "text-text-secondary hover:text-text-primary"
            }
          >
            Leads
          </NavLink>

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
        </nav>

        {/* Right: search, profile circle, logout */}
        <div className="flex items-center gap-4">

        <NavLink
            to="/account"
            aria-label="Account"
            className="flex items-center justify-center h-9 w-9 rounded-full bg-brand-gray-dark text-white text-sm font-semibold ring-2 ring-border hover:ring-brand-gray-dark/70 transition"
          >
            <span>{userInitial}</span>
          </NavLink>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-full px-3 py-1"
          >
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads or sales..."
              className="bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </form>


          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-gradient-to-b from-bg-secondary/70 via-bg-primary to-bg-primary px-4 py-6">
          <nav className="space-y-6 text-sm">
            <div>
              <div className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Main
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/leads"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Leads
                </NavLink>
                <NavLink
                  to="/salespeople"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Salespeople
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Reports
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Overview
                </NavLink>
                <NavLink
                  to="/reports?view=leads"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Lead Analytics
                </NavLink>
                <NavLink
                  to="/reports?view=salespeople"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Salespeople Analytics
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Integrations
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <NavLink
                  to="/integrations"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  All Integrations
                </NavLink>
                <NavLink
                  to="/integrations?provider=hubspot"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  HubSpot
                </NavLink>
                <NavLink
                  to="/integrations?provider=pipedrive"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Pipedrive
                </NavLink>
                <NavLink
                  to="/integrations?provider=salesforce"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Salesforce
                </NavLink>
                <NavLink
                  to="/integrations?provider=nutshell"
                  className={({ isActive }) =>
                    isActive
                      ? "ml-4 px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "ml-4 px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Nutshell
                </NavLink>
              </div>
            </div>

            <div>
              <div className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                Account
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <NavLink
                  to="/account"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Profile and Account
                </NavLink>
                <NavLink
                  to="/billing"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Billing
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    isActive
                      ? "px-3 py-2 rounded-md bg-bg-primary text-text-primary"
                      : "px-3 py-2 rounded-md text-text-secondary hover:bg-bg-primary/60 hover:text-text-primary"
                  }
                >
                  Settings
                </NavLink>
              </div>
            </div>
          </nav>
        </aside>

        {/* Modern tech style divider */}
        <div className="w-px bg-gradient-to-b from-brand-gray-dark/70 via-border to-transparent shadow-[0_0_14px_rgba(0,0,0,0.35)]" />

        <main className="flex-1 p-8">
          <CrmConnectionBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
