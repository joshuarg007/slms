import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const nav = useNavigate();

  // Listen for ? key to open shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50
                   dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
        title="Help & resources"
      >
        Help
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-md border bg-white shadow-lg z-50
                        border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => { setOpen(false); nav("/docs"); }}
          >
            Documentation
          </button>
          <button
            className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
            onClick={() => { setOpen(false); setShortcutsOpen(true); }}
          >
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">?</kbd>
          </button>
          <a
            className="block px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            href="mailto:support@example.com"
            onClick={() => setOpen(false)}
          >
            Contact Support
          </a>
        </div>
      )}

      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
