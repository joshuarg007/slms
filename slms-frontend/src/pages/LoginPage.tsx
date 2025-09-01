import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // already authed? go to app
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login(email, password); // sets token + immediately sets user in context

      // Prefer 'from' if it's a protected app route; otherwise go to "/"
      const rawFrom = (loc.state as any)?.from as string | undefined;
      const next =
        !rawFrom || rawFrom === "/login" || rawFrom.startsWith("/welcome")
          ? "/"
          : rawFrom;

      nav(next, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow">
        <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Sign in</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use your email and password to access SLMS.
        </p>

        {err && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">No account?</span>{" "}
          <Link to="/signup" className="text-indigo-600 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
