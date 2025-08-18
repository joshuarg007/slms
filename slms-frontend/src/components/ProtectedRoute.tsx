import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api } from "@/utils/api";

/**
 * Protects routes by verifying the session via /me.
 * Works with our Bearer token (stored in localStorage by api.login).
 */
export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "authed" | "unauth">("checking");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // If there is no token at all, skip the network call quickly.
        const hasToken = typeof localStorage !== "undefined" && !!localStorage.getItem("access_token");
        if (!hasToken) {
          if (alive) setStatus("unauth");
          return;
        }
        await api.me(); // sends Authorization: Bearer ...
        if (alive) setStatus("authed");
      } catch {
        if (alive) setStatus("unauth");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
        <div>Loading…</div>
      </div>
    );
  }

  if (status === "unauth") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
