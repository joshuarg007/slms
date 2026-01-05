// src/components/Navbar.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/utils/api";
import Logo from "@/components/Logo";

export default function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();

  async function onSignOut() {
    try {
      await api.logout();   // clears server cookies
    } catch {
      /* ignore */
    } finally {
      // also clear local token and bounce to login
      api.clearToken?.();
      nav("/login", { replace: true, state: { from: loc } });
    }
  }

  const isActive = (p: string) =>
    (loc.pathname === p || (p !== "/" && loc.pathname.startsWith(p)))
      ? "text-blue-600"
      : "text-gray-700";

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Logo linkTo="/app" size="sm" />
          <Link to="/app" className={`text-sm hover:underline ${isActive("/app")}`}>Dashboard</Link>
          <Link to="/app/leads" className={`text-sm hover:underline ${isActive("/app/leads")}`}>Leads</Link>
        </nav>
        <button
          onClick={onSignOut}
          className="text-sm px-3 py-1.5 rounded-md border bg-gray-50 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
