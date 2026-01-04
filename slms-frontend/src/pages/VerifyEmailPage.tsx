import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Logo from "@/components/Logo";

const API = import.meta.env.VITE_API_URL || "";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      setMessage("No verification token provided.");
      return;
    }

    verifyEmail(token);
  }, [token]);

  async function verifyEmail(token: string) {
    try {
      const res = await fetch(`${API}/api/verify-email?token=${encodeURIComponent(token)}`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setEmail(data.email || "");
      } else {
        setStatus("error");
        setMessage(data.detail || "Verification failed. The token may be invalid or expired.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An error occurred while verifying your email. Please try again.");
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
              Secure your account with email verification
            </h1>
            <p className="mt-4 text-lg text-indigo-100">
              Email verification helps protect your account and ensures you receive important notifications.
            </p>
          </div>

          <div className="text-sm text-indigo-200">
            &copy; {new Date().getFullYear()} Site2CRM. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right side - Verification Status */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Top nav */}
        <div className="flex items-center justify-between p-6">
          <div className="lg:hidden">
            <Logo linkTo="/" forceDark />
          </div>
          <Link
            to="/"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            {status === "loading" && (
              <>
                <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <svg className="animate-spin w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Verifying your email...
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Email Verified!
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {message}
                </p>
                {email && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
                    {email}
                  </p>
                )}
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                >
                  Continue to Sign In
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Verification Failed
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {message}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    Go to Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    Create New Account
                  </Link>
                </div>
              </>
            )}

            {status === "no-token" && (
              <>
                <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Missing Verification Token
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {message}
                </p>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
                  Please click the link in your verification email, or request a new verification email.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    Go to Sign In
                  </Link>
                </div>
              </>
            )}

            <p className="mt-8 text-xs text-gray-500 dark:text-gray-400">
              Need help?{" "}
              <Link to="/contact" className="text-indigo-600 hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
