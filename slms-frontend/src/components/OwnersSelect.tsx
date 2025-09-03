// src/components/OwnersSelect.tsx
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
  onChange: (val: string | null) => void;
  className?: string;
  allowAll?: boolean;        // show an "All owners" option (value = "")
  allLabel?: string;         // label for the "All owners" option
  disabled?: boolean;
  includeArchived?: boolean; // pass through to API (defaults false)
};

function apiBase() {
  const ls = typeof window !== "undefined" ? localStorage.getItem("slms.apiBase") : null;
  const env = (import.meta as any)?.env?.VITE_API_URL || "http://127.0.0.1:8000";
  return (ls || env).replace(/\/$/, "");
}

export default function OwnersSelect({
  value,
  onChange,
  className = "",
  allowAll = false,
  allLabel = "All owners",
  disabled = false,
  includeArchived = false,
}: Props) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  // Load owners (handles array or {results: [...]})
  useEffect(() => {
    let alive = true;
    setLoading(true);

    const url = new URL(`${apiBase()}/integrations/hubspot/salespeople/owners`);
    url.searchParams.set("include_archived", String(includeArchived));

    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!alive) return;
        const list: Owner[] = (Array.isArray(data) ? data : data?.results) || [];
        setOwners(
          list.map((o) => ({
            id: String(o.id ?? o.email ?? ""),
            email: o.email,
            firstName: o.firstName,
            lastName: o.lastName,
            archived: Boolean(o.archived),
          }))
        );
      })
      .catch(() => {
        if (!alive) return;
        setOwners([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [includeArchived]);

  // Auto-select first owner if none selected and allowAll is false
  useEffect(() => {
    if (!loading && owners.length > 0 && !allowAll) {
      const hasSelection = value && owners.some((o) => o.id === value);
      if (!hasSelection) onChange(owners[0].id);
    }
  }, [loading, owners, allowAll, value, onChange]);

  // Change handler (ignore placeholders)
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "__loading__" || v === "__none__") return;
    onChange(v === "" ? null : v);
  };

  // Compute current value for the <select>
  const selectValue =
    value == null ? (allowAll ? "" : owners[0]?.id ?? "") : value;

  const optionLabel = (o: Owner) =>
    [o.firstName, o.lastName].filter(Boolean).join(" ").trim() ||
    o.email ||
    o.id;

  return (
    <select
      value={selectValue}
      onChange={handleChange}
      disabled={disabled}
      aria-label="Select owner"
      className={[
        "rounded-md border px-3 py-2",
        "bg-white dark:bg-gray-900",
        "border-gray-300 dark:border-gray-700",
        "text-gray-900 dark:text-gray-100",
        disabled ? "opacity-60 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      {/* Placeholders use unique values so they never collide with "" */}
      {loading && owners.length === 0 && (
        <option value="__loading__" disabled>
          Loading…
        </option>
      )}
      {!loading && owners.length === 0 && (
        <option value="__none__" disabled>
          No owners found
        </option>
      )}

      {allowAll && <option value="">{allLabel}</option>}

      {owners.map((o) => (
        <option key={o.id} value={o.id}>
          {optionLabel(o)}
        </option>
      ))}
    </select>
  );
}
