import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

/**
 * Protects routes using AuthProvider state.
 * - While loading  -> spinner
 * - If unauth       -> redirect to /welcome (remember 'from')
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
    return <Navigate to="/welcome" replace state={{ from }} />;
  }

  return <Outlet />;
}
