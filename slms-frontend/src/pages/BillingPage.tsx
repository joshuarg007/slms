// src/pages/BillingPage.tsx
import { useState } from "react";
import { getApiBase } from "@/utils/api"; // ← use the named export (not api.getApiBase)

export default function BillingPage() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || "Unable to start checkout");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message || "Checkout error");
      setBusy(false);
    }
  }

  async function portal() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`${getApiBase()}/billing/portal`, {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.detail || "Unable to open portal");
      window.location.href = j.url;
    } catch (e: any) {
      setErr(e.message || "Portal error");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Subscribe or manage your plan.</p>
      </header>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={start}
            disabled={busy}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-50"
          >
            Start subscription
          </button>
          <button
            onClick={portal}
            disabled={busy}
            className="rounded-md border px-4 py-2 disabled:opacity-50"
          >
            Manage billing
          </button>
        </div>
      </div>
    </div>
  );
}
