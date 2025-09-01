type Props = {
  rows: Record<string, any>[];
  filename?: string;
  className?: string;
};

export default function ExportCsvButton({ rows, filename = "export.csv", className }: Props) {
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
  }

  return (
    <button
      onClick={download}
      className={
        className ??
        "rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
      }
    >
      Export CSV
    </button>
  );
}
