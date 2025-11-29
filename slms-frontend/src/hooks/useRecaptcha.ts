import { useCallback, useEffect, useState } from "react";

// Get site key from environment variable
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";
const RECAPTCHA_ENABLED = Boolean(RECAPTCHA_SITE_KEY);

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve) => {
    if (!RECAPTCHA_ENABLED) {
      resolve();
      return;
    }

    if (scriptLoaded) {
      resolve();
      return;
    }

    loadCallbacks.push(resolve);

    if (scriptLoading) {
      return;
    }

    scriptLoading = true;

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        scriptLoaded = true;
        loadCallbacks.forEach((cb) => cb());
        loadCallbacks.length = 0;
      });
    };

    document.head.appendChild(script);
  });
}

/**
 * Hook to use Google reCAPTCHA v3
 *
 * Usage:
 * ```tsx
 * const { executeRecaptcha, isLoading } = useRecaptcha();
 *
 * const handleSubmit = async () => {
 *   const token = await executeRecaptcha("contact");
 *   // Send token with your form data
 * };
 * ```
 */
export function useRecaptcha() {
  const [isLoading, setIsLoading] = useState(RECAPTCHA_ENABLED);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!RECAPTCHA_ENABLED) {
      setIsLoading(false);
      return;
    }

    loadRecaptchaScript()
      .then(() => setIsLoading(false))
      .catch((err) => {
        setError("Failed to load reCAPTCHA");
        setIsLoading(false);
        console.error("reCAPTCHA load error:", err);
      });
  }, []);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!RECAPTCHA_ENABLED) {
        return null;
      }

      if (!scriptLoaded) {
        await loadRecaptchaScript();
      }

      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action,
        });
        return token;
      } catch (err) {
        console.error("reCAPTCHA execute error:", err);
        setError("reCAPTCHA verification failed");
        return null;
      }
    },
    []
  );

  return {
    executeRecaptcha,
    isLoading,
    error,
    isEnabled: RECAPTCHA_ENABLED,
  };
}

export default useRecaptcha;
