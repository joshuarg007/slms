// src/pages/forms/EmbedPage.tsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

interface EmbedCode {
  script_tag: string;
  iframe_tag: string;
  org_key: string;
}

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  try {
    const tok = localStorage.getItem("access_token");
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch { /* ignore */ }
  return fetch(url, { credentials: "include", ...init, headers });
}

export default function EmbedPage() {
  const [embedCode, setEmbedCode] = useState<EmbedCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"script" | "iframe" | null>(null);
  const [activeTab, setActiveTab] = useState<"script" | "iframe">("script");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authFetch("/api/forms/embed-code");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Failed to load embed code");
        }
        const data: EmbedCode = await res.json();
        if (!cancelled) {
          setEmbedCode(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load embed code");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const copyToClipboard = useCallback(async (text: string, type: "script" | "iframe") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Embed Code</h1>
        </header>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Make sure your organization has an API key configured.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Embed Code</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Copy the code below to add your lead capture form to any website
          </p>
        </div>
        <Link
          to="/forms/styles"
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Back to Styles
        </Link>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("script")}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "script"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            JavaScript Snippet
          </button>
          <button
            onClick={() => setActiveTab("iframe")}
            className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "iframe"
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            iFrame Embed
          </button>
        </nav>
      </div>

      {/* Script Tag */}
      {activeTab === "script" && embedCode && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">HTML</span>
              <button
                onClick={() => copyToClipboard(embedCode.script_tag, "script")}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                {copied === "script" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              <code>{embedCode.script_tag}</code>
            </pre>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 px-4 py-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">How to use</h3>
            <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
              <li>Copy the code above</li>
              <li>Paste it into your website's HTML where you want the form to appear</li>
              <li>The form will automatically render based on your configuration</li>
            </ol>
          </div>
        </section>
      )}

      {/* iFrame Embed */}
      {activeTab === "iframe" && embedCode && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">HTML</span>
              <button
                onClick={() => copyToClipboard(embedCode.iframe_tag, "iframe")}
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                {copied === "iframe" ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              <code>{embedCode.iframe_tag}</code>
            </pre>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 px-4 py-3">
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Note</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              The iframe embed is simpler but may have limitations with styling and responsiveness.
              We recommend using the JavaScript snippet for the best experience.
            </p>
          </div>
        </section>
      )}

      {/* API Key Info */}
      {embedCode && (
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
          <h2 className="text-lg font-medium mb-3">Your Organization Key</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono truncate">
              {embedCode.org_key}
            </code>
            <button
              onClick={() => copyToClipboard(embedCode.org_key, "script")}
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This key identifies your organization and is embedded in the widget code.
            Keep it confidential but note it will be visible in your website's source code.
          </p>
        </section>
      )}

      {/* Test Instructions */}
      <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <h2 className="text-lg font-medium mb-3">Test Your Form</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          To test your form locally, create an HTML file with the embed code and open it in your browser.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium mb-1">Quick test:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Create a file called <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">test.html</code></li>
            <li>Paste the embed code inside the <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;body&gt;</code></li>
            <li>Open the file in your browser</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
