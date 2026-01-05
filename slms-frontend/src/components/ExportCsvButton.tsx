import { useState } from "react";

type Props = {
  rows: Record<string, any>[];
  filename?: string;
  className?: string;
  label?: string;
  showIcon?: boolean;
};

export default function ExportCsvButton({
  rows,
  filename = "export.csv",
  className,
  label = "Export CSV",
  showIcon = true,
}: Props) {
  const [exporting, setExporting] = useState(false);

  function toCsv(items: Record<string, any>[]) {
    if (!items?.length) return "";
    const cols = Array.from(
      items.reduce<Set<string>>((s, r) => {
        Object.keys(r).forEach(k => s.add(k));
        return s;
      }, new Set<string>())
    );
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(",");
    const lines = items.map(r => cols.map(c => esc(r[c])).join(","));
    return [header, ...lines].join("\n");
  }

  function download() {
    setExporting(true);
    // Small delay to show feedback
    setTimeout(() => {
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 300);
  }

  const isDisabled = !rows?.length || exporting;

  return (
    <button
      onClick={download}
      disabled={isDisabled}
      aria-label={`${label} - ${rows?.length || 0} rows`}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      }
    >
      {showIcon && (
        exporting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      )}
      {exporting ? "Exporting..." : label}
    </button>
  );
}
