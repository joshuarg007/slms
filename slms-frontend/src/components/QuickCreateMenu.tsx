// src/components/QuickCreateMenu.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import CSVImportModal from "./CSVImportModal";

export default function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        title="Quick create"
      >
        + Create
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white shadow-lg z-50 border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          {/* Primary: opens the test widget */}
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              nav("/widget-test");
            }}
            title="Open the embedded lead capture widget"
          >
            New Lead (widget)
          </button>

          {/* Secondary: classic/manual form */}
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              nav("/leads");
            }}
            title="Open the manual lead entry form"
          >
            New Lead (manual form)
          </button>

          <div className="my-1 border-t border-gray-200 dark:border-gray-800" />

          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              setCsvModalOpen(true);
            }}
            title="Import leads from CSV file"
          >
            Import CSV
          </button>

          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setOpen(false);
              nav("/reports");
            }}
            title="Create a new report"
          >
            New Report
          </button>
        </div>
      )}

      <CSVImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImportComplete={() => {
          setCsvModalOpen(false);
          nav("/leads");
        }}
      />
    </div>
  );
}
