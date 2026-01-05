import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

type Props = {
  onSignOut?: () => Promise<void> | void;
};

export default function AccountMenu({ onSignOut }: Props) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function handleSignOut() {
    try {
      if (onSignOut) {
        await onSignOut(); // use parent-provided handler (navigates to /welcome)
      } else {
        await logout();
        nav("/welcome", { replace: true });
      }
    } finally {
      setOpen(false);
    }
  }

  const email = user?.email ?? "account";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white text-xs">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:block">{email}</span>
        <svg className="size-4 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M5.8 7.5a1 1 0 0 1 1.4 0L10 10.3l2.8-2.8a1 1 0 1 1 1.4 1.4l-3.5 3.5a1 1 0 0 1-1.4 0L5.8 8.9a1 1 0 0 1 0-1.4z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
        >
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="text-sm font-medium">{email}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Signed in</div>
          </div>

          <nav className="py-1 text-sm" onClick={() => setOpen(false)}>
            <Link to="/app/account"  className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" role="menuitem">Account</Link>
            <Link to="/app/settings" className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" role="menuitem">Settings</Link>
            <Link to="/app/billing"  className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" role="menuitem">Billing</Link>
          </nav>

          <div className="border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
