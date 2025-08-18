// src/pages/Signup.tsx
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/utils/api";

// Resolve your API base (fallback to localhost:8000 for dev)
const API =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env?.VITE_API_URL?.replace(/\/+$/, "")) ||
  "http://127.0.0.1:8000";

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      // 1) Create the account (server will assign/ensure organization)
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Signup failed: ${res.status} ${res.statusText} – ${txt}`);
      }

      // 2) Auto-login (stores Bearer token in localStorage via api.login)
      await api.login(email, password);

      // 3) Go to dashboard
      nav("/", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
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
        <h1 className="text-xl font-semibold mb-4">Create your account</h1>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <label className="block mb-2 text-sm">Work email</label>
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
          className="w-full border rounded-md p-2 mb-4"
          placeholder="••••••••"
        />

        <label className="block mb-2 text-sm">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full border rounded-md p-2 mb-6"
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 text-white py-2 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="mt-4 text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
