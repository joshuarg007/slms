import { useEffect, useState } from "react";

type Owner = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  archived?: boolean;
};

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
  className?: string;
};

function apiBase() {
  const ls = typeof window !== "undefined" ? localStorage.getItem("slms.apiBase") : null;
  const env = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";
  return (ls || env).replace(/\/$/, "");
}

export default function OwnersSelect({ value, onChange, className }: Props) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = `${apiBase()}/integrations/hubspot/salespeople/owners`;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then((rows: Owner[]) => setOwners(rows || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={className ?? "rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"}
    >
      <option value="">{loading ? "Loading…" : "All owners"}</option>
      {owners.map(o => {
        const name = [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email || o.id;
        return (
          <option key={o.id} value={o.id}>
            {name}
          </option>
        );
      })}
    </select>
  );
}
