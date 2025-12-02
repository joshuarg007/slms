// src/components/KeyboardShortcutsModal.tsx
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string; action?: () => void }[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const navigate = useNavigate();

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["g", "h"], description: "Go to Dashboard", action: () => navigate("/") },
        { keys: ["g", "l"], description: "Go to Leads", action: () => navigate("/leads") },
        { keys: ["g", "a"], description: "Go to Analytics", action: () => navigate("/analytics") },
        { keys: ["g", "r"], description: "Go to Reports", action: () => navigate("/reports") },
        { keys: ["g", "i"], description: "Go to Integrations", action: () => navigate("/integrations") },
        { keys: ["g", "s"], description: "Go to Settings", action: () => navigate("/settings") },
      ],
    },
    {
      title: "Actions",
      shortcuts: [
        { keys: ["c"], description: "Create new lead", action: () => navigate("/leads?new=true") },
        { keys: ["s"], description: "Focus search" },
        { keys: ["/"], description: "Open command palette" },
        { keys: ["n"], description: "New activity" },
      ],
    },
    {
      title: "General",
      shortcuts: [
        { keys: ["?"], description: "Show keyboard shortcuts" },
        { keys: ["Esc"], description: "Close modal / Cancel" },
        { keys: ["⌘", "k"], description: "Open quick search" },
        { keys: ["⌘", "Enter"], description: "Submit form" },
      ],
    },
    {
      title: "Table Navigation",
      shortcuts: [
        { keys: ["j"], description: "Next row" },
        { keys: ["k"], description: "Previous row" },
        { keys: ["Enter"], description: "Open selected" },
        { keys: ["e"], description: "Edit selected" },
        { keys: ["d"], description: "Delete selected" },
        { keys: ["x"], description: "Select row" },
      ],
    },
  ];

  // Global keyboard shortcut listener
  const handleGlobalShortcut = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // ? to open shortcuts
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        // This would toggle the modal - but we'll let the parent handle it
      }

      // Escape to close
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }

      // Navigation shortcuts with "g" prefix
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !isOpen) {
        // Wait for next key
        const handleNextKey = (nextE: KeyboardEvent) => {
          document.removeEventListener("keydown", handleNextKey);
          switch (nextE.key) {
            case "h":
              navigate("/");
              break;
            case "l":
              navigate("/leads");
              break;
            case "a":
              navigate("/analytics");
              break;
            case "r":
              navigate("/reports");
              break;
            case "i":
              navigate("/integrations");
              break;
            case "s":
              navigate("/settings");
              break;
          }
        };
        document.addEventListener("keydown", handleNextKey, { once: true });
        setTimeout(() => {
          document.removeEventListener("keydown", handleNextKey);
        }, 1000);
      }

      // Quick create with "c"
      if (e.key === "c" && !e.ctrlKey && !e.metaKey && !isOpen) {
        navigate("/leads?new=true");
      }
    },
    [isOpen, navigate, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalShortcut);
    return () => document.removeEventListener("keydown", handleGlobalShortcut);
  }, [handleGlobalShortcut]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Keyboard Shortcuts
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Navigate faster with these shortcuts
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                <div className="grid md:grid-cols-2 gap-6">
                  {shortcutGroups.map((group) => (
                    <div key={group.title}>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        {group.title}
                      </h3>
                      <div className="space-y-2">
                        {group.shortcuts.map((shortcut, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                          >
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {shortcut.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIdx) => (
                                <span key={keyIdx} className="flex items-center">
                                  <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm min-w-[24px] text-center">
                                    {key}
                                  </kbd>
                                  {keyIdx < shortcut.keys.length - 1 && (
                                    <span className="mx-0.5 text-gray-400 text-xs">
                                      +
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      ?
                    </kbd>{" "}
                    anywhere to open this menu
                  </span>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to use keyboard shortcuts throughout the app
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Handle "g" prefix shortcuts
      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimeout);

        switch (e.key) {
          case "h":
            e.preventDefault();
            navigate("/");
            break;
          case "l":
            e.preventDefault();
            navigate("/leads");
            break;
          case "a":
            e.preventDefault();
            navigate("/analytics");
            break;
          case "r":
            e.preventDefault();
            navigate("/reports");
            break;
          case "i":
            e.preventDefault();
            navigate("/integrations");
            break;
          case "s":
            e.preventDefault();
            navigate("/settings");
            break;
        }
        return;
      }

      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        gPressed = true;
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      // Direct shortcuts
      if (e.key === "c" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate("/leads?new=true");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [navigate]);
}
