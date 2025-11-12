// src/pages/SignupPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiBase } from "@/utils/api";

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!email || !password) {
      setErr("Email and password are required.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords don’t match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Signup failed: ${res.status} ${res.statusText} – ${txt}`);
      }
      setOk("Account created. You can sign in now.");
      setTimeout(() => nav("/login", { replace: true }), 600);
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-md">
        {/* Top nav / escape hatch */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <span className="text-lg">←</span>
            <span>Back to home</span>
          </Link>
          <div className="font-semibold text-gray-700 dark:text-gray-200">
            Site2CRM
          </div>
        </div>

        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold">Create your account</div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Already have one?{" "}
            <Link className="text-indigo-600 hover:underline" to="/login">
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow">
          <form className="p-6" onSubmit={onSubmit}>
            {err && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                {err}
              </div>
            )}
            {ok && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                {ok}
              </div>
            )}

            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border-gray-300
                         dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:border-gray-700"
              placeholder="you@company.com"
              required
            />

            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4 w-full rounded-lg border px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border-gray-300
                         dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:border-gray-700"
              placeholder="••••••••"
              required
            />

            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mb-6 w-full rounded-lg border px-3 py-2 bg-white text-gray-900 placeholder-gray-400 border-gray-300
                         dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:border-gray-700"
              placeholder="••••••••"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-gray-600 dark:text-gray-400">
          By signing up you agree to our terms and privacy policy.
        </div>
      </div>
    </div>
  );
}
