// src/components/PageErrorBoundary.tsx
// Page-level error boundary - shows friendly "working on it" message

import { Component, ErrorInfo, ReactNode } from "react";
import { getApiBase } from "@/utils/api";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: string; // Change this to reset the error boundary
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  showExtended: boolean; // Shows after delay
  notifiedAdmin: boolean;
}

function generateErrorId(): string {
  return `REF-${Date.now().toString(36).toUpperCase().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export class PageErrorBoundary extends Component<Props, State> {
  private extendedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null, showExtended: false, notifiedAdmin: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: generateErrorId(), showExtended: false, notifiedAdmin: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PageErrorBoundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);

    // Start timer for extended message
    this.extendedTimer = setTimeout(() => {
      this.setState({ showExtended: true });
    }, 8000); // 8 seconds

    // Notify admin via API
    this.notifyAdmin(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKey changes (e.g., route change)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.clearTimer();
      this.setState({ hasError: false, error: null, errorId: null, showExtended: false, notifiedAdmin: false });
    }
  }

  componentWillUnmount() {
    this.clearTimer();
  }

  clearTimer() {
    if (this.extendedTimer) {
      clearTimeout(this.extendedTimer);
      this.extendedTimer = null;
    }
  }

  notifyAdmin = async (error: Error, errorInfo: ErrorInfo) => {
    if (this.state.notifiedAdmin) return;

    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${getApiBase()}/notifications/error-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          error_id: this.state.errorId,
          message: error.message,
          stack: error.stack?.slice(0, 1000),
          component_stack: errorInfo.componentStack?.slice(0, 500),
          url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });
      this.setState({ notifiedAdmin: true });
    } catch {
      // Silently fail - don't make error worse
    }
  };

  handleRetry = () => {
    this.clearTimer();
    this.setState({ hasError: false, error: null, errorId: null, showExtended: false, notifiedAdmin: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { showExtended, errorId } = this.state;

      return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg p-8">
          <div className="text-center">
            {/* Animated loading icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {showExtended ? "Taking longer than expected" : "Working on this"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
              {showExtended
                ? "Our team has been notified. You can wait or try refreshing."
                : "Please stand by while we load this section..."}
            </p>

            {showExtended && (
              <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Need help? Contact us:
                </p>
                <a
                  href={`mailto:support@site2crm.io?subject=Help Request ${errorId || ""}&body=Reference: ${errorId || "N/A"}%0A%0ADescribe what happened:%0A`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                >
                  support@site2crm.io
                </a>
                {errorId && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Reference: {errorId}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {showExtended ? "Try Again" : "Refresh"}
              </span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withPageErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <PageErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </PageErrorBoundary>
    );
  };
}

export default PageErrorBoundary;
