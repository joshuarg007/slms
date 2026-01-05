import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthProvider";

const API = import.meta.env.VITE_API_URL || "/api";

const CRM_OPTIONS = [
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "nutshell", label: "Nutshell" },
  { value: "none", label: "None / Other" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "just_me", label: "Just me" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-20", label: "6-20 people" },
  { value: "20+", label: "20+ people" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [crm, setCrm] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!companyName.trim()) {
      setError("Company name is required");
      return;
    }
    if (!crm) {
      setError("Please select your CRM");
      return;
    }
    if (!teamSize) {
      setError("Please select your team size");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          company_name: companyName.trim(),
          crm,
          team_size: teamSize,
        }),
      });

      if (res.ok) {
        // Refresh user data so ProtectedRoute knows onboarding is complete
        await refreshUser();
        navigate("/app", { replace: true });
      } else {
        const data = await res.json();
        setError(data.detail || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <Logo linkTo="/" size="lg" inverted />
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Let's get you set up
            </h1>
            <p className="mt-4 text-lg text-indigo-100">
              Just a few quick details and you'll be ready to start capturing leads.
            </p>
          </div>

          <div className="text-sm text-indigo-200">
            &copy; {new Date().getFullYear()} Site2CRM. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        <div className="p-6 lg:hidden">
          <Logo linkTo="/" forceDark />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Complete Your Setup
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Tell us a bit about your business
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Company Name */}
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* CRM Selection */}
              <div>
                <label
                  htmlFor="crm"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Which CRM do you use?
                </label>
                <select
                  id="crm"
                  value={crm}
                  onChange={(e) => setCrm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select your CRM...</option>
                  {CRM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Size */}
              <div>
                <label
                  htmlFor="teamSize"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Team Size
                </label>
                <select
                  id="teamSize"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select team size...</option>
                  {TEAM_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Your 14-day free trial has started. No credit card required.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
