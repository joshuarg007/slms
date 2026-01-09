// src/pages/AppSumoRedeemPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase } from "@/utils/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface AddendumSummary {
  version: string;
  effective_date: string;
  url: string;
  summary: {
    license_type: string;
    leads_per_month: number;
    crm_integrations: number;
    forms: number;
    ai_features: boolean;
    branding_removal: boolean;
    priority_support: boolean;
    quota_enforcement: string;
    upgrade_path: string;
  };
}

interface RedeemResponse {
  success: boolean;
  message: string;
  plan: string;
  plan_limits: {
    leads_per_month: number;
    forms: number;
    crm_integrations: number;
    ai_features: boolean;
    remove_branding: boolean;
    priority_support: boolean;
  };
  addendum_version: string;
  accepted_at: string;
}

interface AppSumoStatus {
  is_appsumo: boolean;
  code_redeemed: string | null;
  addendum_accepted: boolean;
  addendum_version: string | null;
  accepted_at: string | null;
  accepted_by_email: string | null;
}

export default function AppSumoRedeemPage() {
  useDocumentTitle("Redeem AppSumo Code");
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [acceptAddendum, setAcceptAddendum] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<RedeemResponse | null>(null);
  const [addendum, setAddendum] = useState<AddendumSummary | null>(null);
  const [status, setStatus] = useState<AppSumoStatus | null>(null);

  const API = getApiBase();

  // Check current AppSumo status and fetch addendum
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");

      try {
        // Fetch addendum (public endpoint)
        const addendumRes = await fetch(`${API}/api/appsumo/addendum`);
        if (addendumRes.ok) {
          setAddendum(await addendumRes.json());
        }

        // Fetch current status (requires auth)
        if (token) {
          const statusRes = await fetch(`${API}/api/appsumo/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statusRes.ok) {
            setStatus(await statusRes.json());
          }
        }
      } catch (err) {
        console.error("Error fetching AppSumo data:", err);
      } finally {
        setChecking(false);
      }
    };

    fetchData();
  }, [API]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to redeem a code");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/appsumo/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          accept_addendum: acceptAddendum,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to redeem code");
      }

      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Already has AppSumo plan
  if (!checking && status?.is_appsumo) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AppSumo Lifetime License Active</h1>
            <p className="text-gray-600 mb-6">
              Your organization already has an active AppSumo lifetime license.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Code</dt>
                  <dd className="font-mono text-gray-900">{status.code_redeemed}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Addendum Version</dt>
                  <dd className="text-gray-900">{status.addendum_version}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Accepted By</dt>
                  <dd className="text-gray-900">{status.accepted_by_email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Accepted At</dt>
                  <dd className="text-gray-900">
                    {status.accepted_at ? new Date(status.accepted_at).toLocaleDateString() : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <button
              onClick={() => navigate("/app/billing")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              View Billing Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Lifetime License Activated!</h1>
            <p className="text-gray-600 mb-6">{success.message}</p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
              <h3 className="font-semibold text-green-900 mb-3">Your Plan Includes:</h3>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {success.plan_limits.leads_per_month.toLocaleString()} leads per month
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {success.plan_limits.forms} active forms
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {success.plan_limits.crm_integrations} CRM integrations
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Lifetime access — no recurring fees
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate("/app/leads")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (checking) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // Redemption form
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Redeem AppSumo Code</h1>
          <p className="text-gray-600">
            Enter your AppSumo code to activate your lifetime license
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Code Input */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              AppSumo Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX-XXXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-lg tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              required
              disabled={loading}
            />
          </div>

          {/* Addendum Summary */}
          {addendum && (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-semibold text-gray-900 mb-3">
                AppSumo Lifetime License Addendum (v{addendum.version})
              </h3>

              <div className="text-sm text-gray-600 space-y-2 mb-4">
                <p><strong>License Type:</strong> {addendum.summary.license_type}</p>
                <p><strong>Leads per Month:</strong> {addendum.summary.leads_per_month.toLocaleString()} (hard cap)</p>
                <p><strong>Forms:</strong> {addendum.summary.forms}</p>
                <p><strong>CRM Integrations:</strong> {addendum.summary.crm_integrations}</p>
                <p><strong>AI Features:</strong> {addendum.summary.ai_features ? "Included" : "Not included"}</p>
                <p><strong>Branding Removal:</strong> {addendum.summary.branding_removal ? "Included" : "Not included"}</p>
                <p><strong>Priority Support:</strong> {addendum.summary.priority_support ? "Included" : "Not included"}</p>
                <p><strong>Quota Enforcement:</strong> {addendum.summary.quota_enforcement}</p>
                <p><strong>Upgrade Path:</strong> {addendum.summary.upgrade_path}</p>
              </div>

              <a
                href={addendum.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Read Full Addendum &rarr;
              </a>
            </div>
          )}

          {/* Acceptance Checkbox */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="accept"
              checked={acceptAddendum}
              onChange={(e) => setAcceptAddendum(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              required
              disabled={loading}
            />
            <label htmlFor="accept" className="text-sm text-gray-700">
              I have read and accept the{" "}
              <a
                href={addendum?.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                AppSumo Lifetime License Addendum
              </a>
              . I understand this license has fixed limits, no upgrade path, and is non-transferable.
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !code.trim() || !acceptAddendum}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Activating...
              </span>
            ) : (
              "Activate Lifetime License"
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-500 text-center">
          By redeeming this code, you agree to the AppSumo Lifetime License Addendum
          and our standard Terms of Service.
        </p>
      </div>
    </div>
  );
}
