import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

/**
 * Protects routes using AuthProvider state.
 * - While loading  -> spinner
 * - If unauth       -> redirect to /login (remember 'from')
 * - If not approved -> show pending approval page
 * - If onboarding incomplete -> redirect to /app/onboarding
 * - If authenticated-> render children
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-gray-700 dark:text-gray-200">Loading…</div>
      </div>
    );
  }

  if (!user) {
    const from = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // Check approval status - show pending page if not approved
  if (!user.is_approved) {
    return <PendingApprovalPage email={user.email} />;
  }

  // Check onboarding status - redirect to onboarding if not completed
  // But don't redirect if already on the onboarding page
  const isOnboardingPage = location.pathname === "/app/onboarding";
  const needsOnboarding = user.organization && !user.organization.onboarding_completed;

  if (needsOnboarding && !isOnboardingPage) {
    return <Navigate to="/app/onboarding" replace />;
  }

  return <Outlet />;
}

function PendingApprovalPage({ email }: { email: string }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Awaiting Approval
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Your account <span className="font-medium">{email}</span> is pending approval from your organization administrator.
        </p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
          You'll receive an email once your account has been approved.
        </p>
        <button
          onClick={() => logout()}
          className="mt-6 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
