// src/components/Accessibility.tsx
// Comprehensive accessibility components for Site2CRM

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// ============================================================================
// Screen Reader Announcements
// ============================================================================

type AnnouncementPriority = "polite" | "assertive";

interface AnnouncementContextType {
  announce: (message: string, priority?: AnnouncementPriority) => void;
}

const AnnouncementContext = createContext<AnnouncementContextType | null>(null);

export function useAnnounce() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error("useAnnounce must be used within AccessibilityProvider");
  }
  return context.announce;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");

  const announce = useCallback((message: string, priority: AnnouncementPriority = "polite") => {
    if (priority === "assertive") {
      setAssertiveMessage("");
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage("");
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announce }}>
      {children}
      {/* Live regions for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncementContext.Provider>
  );
}

// ============================================================================
// Skip Link Component
// ============================================================================

interface SkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export function SkipLink({ targetId, children = "Skip to main content" }: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="skip-link"
    >
      {children}
    </a>
  );
}

// ============================================================================
// Keyboard Navigation Helper
// ============================================================================

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          // Don't trigger if user is typing in an input
          const target = e.target as HTMLElement;
          if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
            continue;
          }

          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// ============================================================================
// Keyboard Shortcuts Dialog
// ============================================================================

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Array<{ key: string; description: string; modifier?: string }>;
}

export function KeyboardShortcutsDialog({ isOpen, onClose, shortcuts }: KeyboardShortcutsDialogProps) {
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <span className="text-sm text-gray-600 dark:text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                {shortcut.modifier && `${shortcut.modifier} + `}{shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">?</kbd> to toggle this dialog
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Focus Trap Hook (for modals)
// ============================================================================

export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive, containerRef]);
}

// ============================================================================
// Accessible Icon Button
// ============================================================================

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
}

export function AccessibleIconButton({ label, icon, className = "", ...props }: AccessibleIconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}

// ============================================================================
// Loading Announcement
// ============================================================================

interface LoadingAnnouncementProps {
  isLoading: boolean;
  loadingMessage?: string;
  loadedMessage?: string;
}

export function LoadingAnnouncement({
  isLoading,
  loadingMessage = "Loading...",
  loadedMessage = "Content loaded",
}: LoadingAnnouncementProps) {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setAnnounced(false);
    } else if (!announced) {
      setAnnounced(true);
    }
  }, [isLoading, announced]);

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {isLoading ? loadingMessage : announced ? loadedMessage : ""}
    </div>
  );
}
