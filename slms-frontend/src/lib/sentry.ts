import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;

  if (!dsn) {
    console.warn("Sentry DSN not configured - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Sample rate for performance monitoring (1.0 = 100%)
    tracesSampleRate: 0.1,
    // Don't send PII
    sendDefaultPii: false,
    // Ignore common non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      /^Loading chunk \d+ failed/,
    ],
    beforeSend(event) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        console.log("[Sentry] Would send:", event);
        return null;
      }
      return event;
    },
  });
}

// Re-export Sentry for use elsewhere
export { Sentry };
