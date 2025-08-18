import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/utils/api"; // now works with the alias

type Props = { children: React.ReactNode };
type MeResponse = { email: string };

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await api<MeResponse>("/me");
        if (!cancelled) setStatus("authed");
      } catch {
        if (!cancelled) setStatus("unauthed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Checking your session…
      </div>
    );
  }

  if (status === "unauthed") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
