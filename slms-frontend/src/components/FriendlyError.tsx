// src/components/FriendlyError.tsx
// User-friendly error display component - no technical jargon

import { useEffect, useMemo } from "react";

interface FriendlyErrorProps {
  /** Optional: The actual error message (logged to console, not shown to user) */
  error?: string | null;
  /** Optional: Custom user-friendly message */
  message?: string;
  /** Optional: Retry callback */
  onRetry?: () => void;
  /** Optional: Compact mode for inline errors */
  compact?: boolean;
  /** Optional: Additional CSS classes */
  className?: string;
}

// Generate a short reference ID for support
function generateRefId(): string {
  return `REF-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
}

// Friendly messages for common error types
function getFriendlyMessage(error?: string | null): string {
  if (!error) return "Something unexpected happened.";

  const lowerError = error.toLowerCase();

  // Network errors
  if (lowerError.includes("network") || lowerError.includes("fetch") || lowerError.includes("connection")) {
    return "We're having trouble connecting. Please check your internet connection.";
  }

  // Auth errors
  if (lowerError.includes("unauthorized") || lowerError.includes("401") || lowerError.includes("forbidden")) {
    return "Your session may have expired. Please try signing in again.";
  }

  // Not found
  if (lowerError.includes("not found") || lowerError.includes("404")) {
    return "We couldn't find what you're looking for.";
  }

  // Server errors
  if (lowerError.includes("500") || lowerError.includes("server") || lowerError.includes("internal")) {
    return "Our servers are experiencing issues. We're working on it.";
  }

  // Rate limiting
  if (lowerError.includes("rate") || lowerError.includes("too many") || lowerError.includes("429")) {
    return "You're doing that too quickly. Please wait a moment.";
  }

  // Timeout
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "This is taking longer than expected. Please try again.";
  }

  // Default friendly message
  return "We're experiencing technical difficulties.";
}

export function FriendlyError({
  error,
  message,
  onRetry,
  compact = false,
  className = "",
}: FriendlyErrorProps) {
  const refId = useMemo(() => generateRefId(), []);

  // Log the actual error to console for debugging
  useEffect(() => {
    if (error) {
      console.error(`[${refId}] Error:`, error);
    }
  }, [error, refId]);

  const friendlyMessage = message || getFriendlyMessage(error);
  const supportEmail = "support@site2crm.io";
  const supportSubject = encodeURIComponent(`Help Request (${refId})`);
  const supportBody = encodeURIComponent(`Hi,\n\nI encountered an issue while using Site2CRM.\n\nReference: ${refId}\n\nPlease describe what you were doing:\n\n`);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ${className}`}>
        <svg className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">{friendlyMessage}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 underline"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8 ${className}`}>
      <div className="text-center max-w-md mx-auto">
        {/* Friendly icon */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Oops! Something went wrong
        </h3>

        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {friendlyMessage}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          )}
          <a
            href={`mailto:${supportEmail}?subject=${supportSubject}&body=${supportBody}`}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Get Help
          </a>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Reference: {refId}
        </p>
      </div>
    </div>
  );
}

// Inline error variant for form fields etc.
export function InlineError({ message, className = "" }: { message: string; className?: string }) {
  return (
    <p className={`text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {message}
    </p>
  );
}

export default FriendlyError;
