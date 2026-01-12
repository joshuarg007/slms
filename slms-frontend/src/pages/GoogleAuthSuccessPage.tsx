// src/pages/GoogleAuthSuccessPage.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import api from "@/utils/api";

export default function GoogleAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get("token");

      if (token) {
        // Store the token using api.setToken to update both localStorage AND the module variable
        api.setToken(token);

        // Refresh auth context so ProtectedRoute knows we're logged in
        await refreshUser();

        // Redirect to dashboard
        navigate("/app", { replace: true });
      } else {
        // No token, redirect to login with error
        navigate("/login?error=google_no_token", { replace: true });
      }
    };

    handleAuth();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
