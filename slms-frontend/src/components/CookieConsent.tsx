import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";

const COOKIE_CONSENT_KEY = "site2crm_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkConsent() {
      // First check localStorage for visitors
      const localConsent = localStorage.getItem(COOKIE_CONSENT_KEY);

      // Try to check if user is logged in and their consent status
      try {
        const user = await api.me();
        if (cancelled) return;

        setIsLoggedIn(true);

        // User is logged in - check their account consent status
        if (!user.cookie_consent) {
          // User hasn't consented yet - show banner
          setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, 1000);
        }
      } catch {
        // Not logged in - use localStorage for visitors
        if (!localConsent && !cancelled) {
          setTimeout(() => {
            if (!cancelled) setVisible(true);
          }, 1000);
        }
      }
    }

    checkConsent();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = async () => {
    // Always save to localStorage
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");

    // If logged in, also save to account
    if (isLoggedIn) {
      try {
        await api.setCookieConsent();
      } catch {
        // Ignore errors - localStorage is saved anyway
      }
    }

    setVisible(false);
  };

  const handleDecline = () => {
    // Save decline to localStorage only (not to account)
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Cookie Preferences
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.
                By clicking "Accept", you consent to our use of cookies. Read our{" "}
                <Link to="/privacy" className="text-indigo-600 hover:underline">
                  Privacy Policy
                </Link>{" "}
                for more information.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleDecline}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
