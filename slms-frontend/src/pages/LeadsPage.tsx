// src/pages/LeadsPage.tsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../utils/api";

type Lead = {
  id: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type ApiResult = {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
  sort: string;
  dir: "asc" | "desc";
  q: string;
};

const DEFAULT_SORT = "created_at" as const;
const DEFAULT_DIR = "desc" as const;
const PAGE_SIZES = [10, 25, 50, 100] as const;

const LeadsPage: React.FC = () => {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<string>(DEFAULT_SORT);
  const [dir, setDir] = useState<"asc" | "desc">(DEFAULT_DIR);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Use ReturnType<typeof setTimeout> to satisfy both DOM and Node typings
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullName = (l: Lead) =>
    (l.name ||
      [l.first_name, l.last_name].filter(Boolean).join(" ").trim() ||
      "").trim();

  const fetchData = () => {
    setLoading(true);
    setErr(null);
    const params = new URLSearchParams({
      q: q.trim(),
      sort,
      dir,
      page: String(page),
      page_size: String(pageSize),
    });
    api<ApiResult>(`/leads?${params.toString()}`)
      .then((json) => setData(json))
      .catch((e) => setErr(e?.message || "Failed to load leads"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchData, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, dir, page, pageSize]);

  useEffect(() => setPage(1), [q, sort, dir]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const setSortKey = (key: string) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  };

  const headerBtn = (label: string, key: string) => (
    <button
      onClick={() => setSortKey(key)}
      className="w-full text-left font-semibold"
      title={`Sort by ${label}`}
      type="button"
    >
      {label}
      {sort === key ? (dir === "asc" ? " ▲" : " ▼") : ""}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Lead Submissions</h1>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, company, source, notes…"
          className="w-full md:max-w-md rounded-lg border px-3 py-2 outline-none"
        />

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Rows:</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border px-2 py-1"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-600">
            {loading ? "Loading…" : `${total.toLocaleString()} total`}
          </div>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="min-w-full">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="px-4 py-3">{headerBtn("Name", "name")}</th>
              <th className="px-4 py-3">{headerBtn("Email", "email")}</th>
              <th className="px-4 py-3">{headerBtn("Phone", "phone")}</th>
              <th className="px-4 py-3">{headerBtn("Company", "company")}</th>
              <th className="px-4 py-3">{headerBtn("Source", "source")}</th>
              <th className="px-4 py-3">{headerBtn("Created", "created_at")}</th>
              <th className="px-4 py-3">{headerBtn("Notes", "notes")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  Loading leads…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  No leads found.
                </td>
              </tr>
            ) : (
              items.map((l) => (
                <tr key={l.id} className="odd:bg-gray-50">
                  <td className="px-4 py-3">{fullName(l) || "—"}</td>
                  <td className="px-4 py-3">{l.email || "—"}</td>
                  <td className="px-4 py-3">{formatPhone(l.phone)}</td>
                  <td className="px-4 py-3">{l.company || "—"}</td>
                  <td className="px-4 py-3">{l.source || "—"}</td>
                  <td className="px-4 py-3">
                    {l.created_at ? formatDate(l.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3">{l.notes || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {data?.page ?? 1} of{" "}
          {data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!data?.has_prev || loading}
            className="rounded-lg border px-3 py-1 disabled:opacity-50"
            type="button"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data?.has_next || loading}
            className="rounded-lg border px-3 py-1 disabled:opacity-50"
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatPhone(p?: string | null) {
  if (!p) return "—";
  const digits = String(p).replace(/\D/g, "");
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

export default LeadsPage;
