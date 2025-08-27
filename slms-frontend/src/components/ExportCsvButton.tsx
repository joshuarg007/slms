// src/components/ExportCsvButton.tsx
export default function ExportCsvButton<T>({
    filename = "export.csv",
    rows,
    headers,
    label = "Export CSV",
    className = "",
  }: {
    filename?: string;
    rows: T[];
    headers: { key: keyof T; label: string }[];
    label?: string;
    className?: string;
  }) {
    function toCsv() {
      const escape = (v: any) => {
        const s = v == null ? "" : String(v);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      const head = headers.map((h) => escape(h.label)).join(",");
      const body = rows
        .map((r) => headers.map((h) => escape((r as any)[h.key])).join(","))
        .join("\n");
      return head + "\n" + body;
    }
  
    function download() {
      const csv = toCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  
    return (
      <button
        onClick={download}
        className={
          className ||
          "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        }
      >
        {label}
      </button>
    );
  }
  