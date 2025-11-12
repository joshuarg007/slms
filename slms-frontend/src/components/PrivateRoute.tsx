import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "@/utils/api"; // api is an object with methods (get/post/etc.)

type Props = { children: React.ReactNode };
type MeResponse = { email: string };

const PrivateRoute: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "authed" | "unauthed">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // adjust to your api wrapper shape; common patterns shown below:
        // 1) axios-like: const { data } = await api.get<MeResponse>("/me");
        // 2) fetch-like wrapper: const data = await api.get<MeResponse>("/me");
        const res = await (api as any).get("/me");
        const data: MeResponse = (res && "data" in res) ? (res as any).data : (res as any);

        if (!cancelled && data?.email) setStatus("authed");
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
