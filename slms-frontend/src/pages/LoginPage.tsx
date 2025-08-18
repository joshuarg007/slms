// src/pages/Login.tsx
import { FormEvent, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "@/utils/api";

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api.login(email, password); // stores Bearer token
      const to = (loc.state as any)?.from?.pathname || "/";
      nav(to, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-2xl shadow"
      >
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <label className="block mb-2 text-sm">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-md p-2 mb-4"
          placeholder="you@company.com"
        />

        <label className="block mb-2 text-sm">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-md p-2 mb-6"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 text-white py-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          Don’t have an account?{" "}
          <Link to="/signup" className="font-medium text-blue-600 hover:underline">
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}
