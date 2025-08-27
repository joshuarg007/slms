// src/components/OwnersSelect.tsx
import { useEffect, useState } from "react";

type Owner = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  archived?: boolean;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export default function OwnersSelect({
  value,
  onChange,
  includeAllOption = true,
  disabled = false,
}: {
  value: string | null;
  onChange: (ownerId: string | null) => void;
  includeAllOption?: boolean;
  disabled?: boolean;
}) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`${API_BASE}/integrations/hubspot/salespeople/owners`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: Owner[] = await res.json();
        if (!alive) return;
        // active owners first
        const ordered = [...json].sort((a, b) => Number(a.archived) - Number(b.archived));
        setOwners(ordered);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load owners");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <span className="text-sm text-gray-600">Owner</span>
      <select
        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
      >
        {includeAllOption && <option value="">All owners</option>}
        {owners.map((o) => {
          const name = [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || o.id;
          const label = o.archived ? `${name} (archived)` : name;
          return (
            <option key={o.id} value={o.id}>
              {label}
            </option>
          );
        })}
      </select>
      {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
    </div>
  );
}
